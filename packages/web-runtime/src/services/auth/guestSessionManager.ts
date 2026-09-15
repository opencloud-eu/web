import { z } from 'zod'
import { Router } from 'vue-router'
import {
  $gettext,
  AuthStore,
  ClientService,
  ConfigStore,
  GuestSession,
  MessageStore,
  SpacesStore
} from '@opencloud-eu/web-pkg'
import { GraphSharePermission } from '@opencloud-eu/web-client'
import {
  GuestAuthError,
  guestAuthEndpoints,
  guestAuthUrl,
  guestSessionResponseSchema,
  toGuestAuthError,
  toGuestSession
} from './guestAuth'

const storageKey = 'oc.guestSession'
const expiryWarningLeadTime = 15 * 60 * 1000

const persistedGuestSessionSchema = z.object({
  shareId: z.string(),
  shareName: z.string(),
  permissions: z.array(z.string()),
  expiresAt: z.number()
})

export interface GuestSessionManagerOptions {
  clientService: ClientService
  configStore: ConfigStore
  authStore: AuthStore
  spacesStore: SpacesStore
  messagesStore: MessageStore
  router: Router
}

export class GuestSessionManager {
  private clientService: ClientService
  private configStore: ConfigStore
  private authStore: AuthStore
  private spacesStore: SpacesStore
  private messagesStore: MessageStore
  private router: Router

  private warningTimer: ReturnType<typeof setTimeout>
  private expiryTimer: ReturnType<typeof setTimeout>
  private expiryPromise: Promise<void> | null = null

  /**
   * Set once the session died. The router guard reads it and redirects, rather than this
   * class pushing a route from inside `beforeEach` - see the same pattern for
   * `hasAuthErrorOccurred` in the auth guard.
   */
  public sessionExpired = false

  constructor(options: GuestSessionManagerOptions) {
    this.clientService = options.clientService
    this.configStore = options.configStore
    this.authStore = options.authStore
    this.spacesStore = options.spacesStore
    this.messagesStore = options.messagesStore
    this.router = options.router
  }

  public async verifyToken(token: string): Promise<GuestSession> {
    try {
      const session = await this.exchange(guestAuthEndpoints.verifyToken, { token })
      this.applySession(session)
      return session
    } catch (error) {
      // The link itself was recognised but is spent or aged out. Send a fresh link plus PIN so
      // the caller can route to the expired page, which offers the PIN form.
      if (error instanceof GuestAuthError && error.errorType === 'token_expired') {
        await this.handleSessionExpired(error.shareId)
      }
      throw error
    }
  }

  public async verifyPin(pin: string): Promise<GuestSession> {
    const session = await this.exchange(guestAuthEndpoints.verifyPin, {
      pin,
      share_id: this.authStore.guestShareId
    })
    this.applySession(session)
    return session
  }

  public async renew(shareId: string): Promise<boolean> {
    if (!shareId) {
      return false
    }
    try {
      await this.post(guestAuthEndpoints.renew, { share_id: shareId })
      return true
    } catch (error) {
      console.error('guest session renewal failed', error)
      return false
    }
  }

  /**
   * Restores a persisted session on page load and on every navigation. Cheap and idempotent:
   * the auth guard calls into this for each route change.
   */
  public restoreContext(): void {
    const session = this.read()
    if (!session) {
      return
    }
    // A real user session owns the browser. A guest record left over from an earlier visit must
    // not shadow it, or that user's next 401 would be mistaken for an expired guest session.
    if (this.authStore.userContextReady) {
      this.clear()
      return
    }
    if (session.expiresAt <= Date.now()) {
      void this.handleSessionExpired(session.shareId)
      return
    }
    if (this.authStore.guestContextReady && this.authStore.guestShareId === session.shareId) {
      return
    }
    this.applySession(session)
  }

  /**
   * Idempotent: parallel 401s from a single expired session must result in exactly one
   * renewal email. Callers outside the router guard navigate to the expired page themselves.
   */
  public handleSessionExpired(shareId = this.authStore.guestShareId): Promise<void> {
    if (this.expiryPromise) {
      return this.expiryPromise
    }

    this.expiryPromise = (async () => {
      this.cancelTimers()
      localStorage.removeItem(storageKey)
      this.authStore.invalidateGuestSession()
      this.authStore.setGuestShareId(shareId)
      this.sessionExpired = true
      await this.renew(shareId)
    })()

    return this.expiryPromise
  }

  public clear(): void {
    this.cancelTimers()
    this.expiryPromise = null
    this.sessionExpired = false
    localStorage.removeItem(storageKey)
    this.authStore.clearGuestContext()
  }

  private applySession(session: GuestSession): void {
    localStorage.setItem(storageKey, JSON.stringify(session))
    this.authStore.setGuestContext(session)

    this.spacesStore.createShareSpace({
      driveAliasPrefix: 'share',
      id: session.shareId,
      shareName: session.shareName,
      graphPermissions: session.permissions
    })
    // The vault guard blocks every navigation carrying a `driveAliasAndItem` until the spaces
    // store reports itself initialized, and only the user and public link contexts ever set
    // that flag. Without this a guest navigation never settles.
    this.spacesStore.setSpacesInitialized(true)

    this.expiryPromise = null
    this.sessionExpired = false
    this.armTimers(session.expiresAt)
  }

  private armTimers(expiresAt: number): void {
    this.cancelTimers()

    const warningDelay = expiresAt - expiryWarningLeadTime - Date.now()
    if (warningDelay > 0) {
      this.warningTimer = setTimeout(() => {
        this.messagesStore.showMessage({
          title: $gettext('Your guest session expires soon'),
          desc: $gettext('Save any unsaved changes now.'),
          status: 'warning',
          timeout: 0
        })
      }, warningDelay)
    }

    // Covers the guest who is idle when the session dies: without a request in flight
    // nothing else would ever notice.
    this.expiryTimer = setTimeout(
      async () => {
        await this.handleSessionExpired()
        await this.router.push({ name: 'guestSessionExpired' })
      },
      Math.max(expiresAt - Date.now(), 0)
    )
  }

  private cancelTimers(): void {
    clearTimeout(this.warningTimer)
    clearTimeout(this.expiryTimer)
    this.warningTimer = undefined
    this.expiryTimer = undefined
  }

  private read(): GuestSession | undefined {
    const raw = localStorage.getItem(storageKey)
    if (!raw) {
      return undefined
    }
    try {
      const parsed = persistedGuestSessionSchema.parse(JSON.parse(raw))
      return { ...parsed, permissions: parsed.permissions as GraphSharePermission[] }
    } catch {
      localStorage.removeItem(storageKey)
      return undefined
    }
  }

  private async exchange(endpoint: string, body: Record<string, string>): Promise<GuestSession> {
    try {
      const { data } = await this.post(endpoint, body)
      return toGuestSession(guestSessionResponseSchema.parse(data))
    } catch (error) {
      throw toGuestAuthError(error)
    }
  }

  private post(endpoint: string, body: Record<string, string>) {
    // `withCredentials` is what lets the browser store and return the session cookie when web
    // is served from a different origin than the server. It's a no-op same-origin.
    return this.clientService.httpUnAuthenticated.post(
      guestAuthUrl(this.configStore.serverUrl, endpoint),
      body,
      { withCredentials: true }
    )
  }
}
