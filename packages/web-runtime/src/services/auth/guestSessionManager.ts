import { AuthStore, ClientService, SpacesStore } from '@opencloud-eu/web-pkg'
import { DavHttpError, ShareSpaceResource } from '@opencloud-eu/web-client'
import {
  GuestLinkError,
  GuestLinkErrorErrorTypeEnum
} from '@opencloud-eu/web-client/graph/generated'
import { isAxiosError } from 'axios'
import { resetSSE } from '@opencloud-eu/web-client/sse'

const storageKey = 'oc.guestPermissionId'

// marks a renewal whose link and PIN are still valid, so the renew page doesn't request another one
const renewalStorageKey = 'oc.guestLinkRenewal'
// keep in sync with `guestLinkTokenTTL` and the default `PinAndNonceTTL` in opencloud services/auth-guest
const renewalLifetime = 30 * 60 * 1000

export interface GuestLinkRenewal {
  // only a renewal with a valid session sends a PIN, which works in this browser only
  withPin: boolean
}

interface StoredGuestLinkRenewal extends GuestLinkRenewal {
  permissionId: string
  renewedAt: number
}

export interface GuestSession {
  permissionId: string
  space: ShareSpaceResource
  email?: string
}

const sessionExpiredErrorType = 'session_expired'

export function isGuestSessionExpiredError(error: unknown): boolean {
  if (error instanceof DavHttpError) {
    return error.errorType === sessionExpiredErrorType
  }
  if (isAxiosError<{ error_type?: string }>(error)) {
    return error.response?.data?.error_type === sessionExpiredErrorType
  }
  return false
}

export class GuestShareNotFoundError extends Error {
  constructor() {
    super('guest share not found')
    this.name = 'GuestShareNotFoundError'
  }
}

// endpoints the proxy authenticates with the guest session cookie, keep in sync with
// `guestLinkPathPrefixes` in opencloud services/proxy/pkg/middleware/guest_link_auth.go
const guestPathSegments = [
  '/graph/v1beta1/me/drive/sharedWithMe',
  '/graph/v1beta1/roleManagement/permissions/roleDefinitions',
  '/dav/',
  '/remote.php/dav/',
  '/webdav/',
  '/remote.php/webdav/',
  '/ocs/v2.php/apps/notifications/api/v1/notifications/sse',
  '/app/open',
  '/app/new',
  '/archiver'
]

function isGuestPath(url: string | undefined): boolean {
  if (!url) {
    return false
  }
  try {
    const { pathname } = new URL(url, window.location.origin)
    return guestPathSegments.some((segment) => pathname.includes(segment))
  } catch {
    return false
  }
}

function getUnauthorizedRequestUrl(error: unknown): string | undefined {
  if (error instanceof DavHttpError && error.statusCode === 401) {
    return error.response?.url
  }
  if (isAxiosError(error) && error.response?.status === 401) {
    const { url, baseURL } = error.config || {}
    return baseURL && url && !/^https?:\/\//.test(url) ? `${baseURL}${url}` : url
  }
  return undefined
}

/**
 * Whether `error` means that the guest session cookie is expired or invalid. A 401 only counts
 * if it comes from an endpoint the guest session authenticates.
 */
export function isGuestSessionInvalidError(error: unknown): boolean {
  return isGuestSessionExpiredError(error) || isGuestPath(getUnauthorizedRequestUrl(error))
}

// the session cookie can't be used for the share anymore
function isUnusableSessionError(error: unknown): boolean {
  return isGuestSessionInvalidError(error) || error instanceof GuestShareNotFoundError
}

export function getGuestLinkError(error: unknown): GuestLinkError | undefined {
  if (!isAxiosError<GuestLinkError>(error)) {
    return undefined
  }
  return error.response?.data || undefined
}

export type GuestLinkErrorType = GuestLinkErrorErrorTypeEnum | 'unknown'

export function getGuestLinkErrorType(error: unknown): GuestLinkErrorType {
  if (error instanceof GuestShareNotFoundError) {
    return GuestLinkErrorErrorTypeEnum.ShareNotFound
  }
  return getGuestLinkError(error)?.errorType || 'unknown'
}

const retryableGuestLinkErrorTypes: GuestLinkErrorType[] = [
  'unknown',
  GuestLinkErrorErrorTypeEnum.InternalError,
  GuestLinkErrorErrorTypeEnum.ServiceUnavailable
]

export function isRetryableGuestLinkErrorType(errorType: GuestLinkErrorType): boolean {
  return retryableGuestLinkErrorTypes.includes(errorType)
}

// a token rejected with one of these still matches the share, so it can be renewed
const renewableTokenErrorTypes: GuestLinkErrorErrorTypeEnum[] = [
  GuestLinkErrorErrorTypeEnum.TokenExpired,
  GuestLinkErrorErrorTypeEnum.TokenAlreadyRedeemed
]

export function getRenewablePermissionId(error: unknown): string | undefined {
  const guestLinkError = getGuestLinkError(error)
  if (!renewableTokenErrorTypes.includes(guestLinkError?.errorType)) {
    return undefined
  }
  return guestLinkError.permissionId || undefined
}

export interface GuestSessionManagerOptions {
  clientService: ClientService
  authStore: AuthStore
  spacesStore: SpacesStore
}

export class GuestSessionManager {
  private clientService: ClientService
  private authStore: AuthStore
  private spacesStore: SpacesStore

  private restorePromises = new Map<string, Promise<void>>()
  // only the most recently requested restore may change the guest context
  private latestRestorePermissionId: string | undefined
  private expiredPermissionId: string | undefined
  private unavailablePermissionId: string | undefined

  constructor(options: GuestSessionManagerOptions) {
    this.clientService = options.clientService
    this.authStore = options.authStore
    this.spacesStore = options.spacesStore
  }

  public async redeem(token: string): Promise<GuestSession> {
    // a failed verify leaves the server cookie untouched, so keep the persisted id until it succeeds
    this.deactivate()
    let permissionId: string
    try {
      // `withCredentials` lets the browser store and send the guest session cookie when web is
      // served from a different origin than the server. It's a no-op same-origin.
      permissionId = await this.clientService.graphAuthenticated.guestLinks.verifyGuestLinkToken(
        token,
        {
          withCredentials: true
        }
      )
    } catch (error) {
      return this.reuseRedeemedSession(error)
    }
    localStorage.removeItem(storageKey)
    localStorage.removeItem(renewalStorageKey)
    return this.establish(permissionId)
  }

  /**
   * Requests a new link via email. The session cookie authorizes the renewal, with a valid session
   * of the share the email also contains a PIN.
   */
  public async renew(permissionId: string): Promise<GuestLinkRenewal> {
    const withPin =
      this.authStore.guestContextReady && this.authStore.guestPermissionId === permissionId
    await this.clientService.graphAuthenticated.guestLinks.renewGuestLink(permissionId, {
      withCredentials: true
    })
    const renewal: StoredGuestLinkRenewal = { permissionId, renewedAt: Date.now(), withPin }
    localStorage.setItem(renewalStorageKey, JSON.stringify(renewal))
    return { withPin }
  }

  /**
   * Returns the renewal of the share if its link and PIN are still valid.
   */
  public getPendingRenewal(permissionId: string): GuestLinkRenewal | undefined {
    try {
      const renewal: StoredGuestLinkRenewal = JSON.parse(localStorage.getItem(renewalStorageKey))
      if (
        renewal?.permissionId !== permissionId ||
        Date.now() - renewal.renewedAt >= renewalLifetime
      ) {
        return undefined
      }
      return { withPin: !!renewal.withPin }
    } catch {
      return undefined
    }
  }

  /**
   * Exchanges the PIN for a session, `resume` loads its context afterwards.
   */
  public async verifyPin(permissionId: string, pin: string): Promise<void> {
    this.deactivate()
    const verifiedPermissionId =
      await this.clientService.graphAuthenticated.guestLinks.verifyGuestLinkPin(
        { pin, permissionId },
        // sends the nonce cookie that binds the PIN to this browser
        { withCredentials: true }
      )
    // the PIN is single-use, persist the session to resume it if loading its context fails
    localStorage.setItem(storageKey, verifiedPermissionId)
    localStorage.removeItem(renewalStorageKey)
  }

  /**
   * Whether a session is persisted for the share, e.g. one whose context couldn't be loaded.
   */
  public hasSession(permissionId: string): boolean {
    return localStorage.getItem(storageKey) === permissionId
  }

  /**
   * Loads the context of the persisted session of the share, drops the session if it's unusable.
   */
  public async resume(permissionId: string): Promise<GuestSession> {
    try {
      return await this.establish(permissionId)
    } catch (error) {
      if (isUnusableSessionError(error)) {
        this.dropSession(permissionId)
      }
      throw error
    }
  }

  /**
   * Returns and resets the permission id of a session that expired while restoring it.
   */
  public consumeExpiredPermissionId(): string | undefined {
    const permissionId = this.expiredPermissionId
    this.expiredPermissionId = undefined
    return permissionId
  }

  /**
   * Returns and resets the permission id of a session that couldn't be restored, e.g. due to a
   * network error. The session might still be valid.
   */
  public consumeUnavailablePermissionId(): string | undefined {
    const permissionId = this.unavailablePermissionId
    this.unavailablePermissionId = undefined
    return permissionId
  }

  // a redeemed link is reported as expired once its lifetime is over, the session might still be valid
  private async reuseRedeemedSession(redeemError: unknown): Promise<GuestSession> {
    const permissionId = getRenewablePermissionId(redeemError)
    if (!permissionId) {
      throw redeemError
    }
    try {
      return await this.establish(permissionId)
    } catch (error) {
      // only report the token error if there is no usable session for the share, otherwise keep it retryable
      if (!isUnusableSessionError(error)) {
        throw error
      }
      this.dropSession(permissionId)
      throw redeemError
    }
  }

  public restoreContext(permissionId: string = localStorage.getItem(storageKey)): Promise<void> {
    if (!permissionId) {
      return Promise.resolve()
    }
    // keep the session, the guard reloads the page to restore it without the user context
    if (this.authStore.userContextReady) {
      return Promise.resolve()
    }
    if (this.authStore.guestContextReady && this.authStore.guestPermissionId === permissionId) {
      this.latestRestorePermissionId = permissionId
      return Promise.resolve()
    }

    this.latestRestorePermissionId = permissionId
    if (!this.restorePromises.has(permissionId)) {
      const restorePromise = this.findSession(permissionId)
        .then((session) => {
          if (this.latestRestorePermissionId === permissionId) {
            this.activate(session)
          }
        })
        .catch((error) => {
          if (this.latestRestorePermissionId === permissionId) {
            this.handleRestoreError(permissionId, error)
          }
        })
        .finally(() => {
          this.restorePromises.delete(permissionId)
        })
      this.restorePromises.set(permissionId, restorePromise)
    }
    return this.restorePromises.get(permissionId)
  }

  private handleRestoreError(permissionId: string, error: unknown): void {
    console.error('guest session could not be restored', error)
    if (isGuestSessionInvalidError(error)) {
      this.expire()
      this.expiredPermissionId = permissionId
      return
    }
    if (error instanceof GuestShareNotFoundError) {
      // keep the persisted session if the share of another (e.g. stale or foreign) id is unknown
      if (localStorage.getItem(storageKey) === permissionId) {
        this.clear()
        return
      }
      this.deactivate()
      return
    }
    this.unavailablePermissionId = permissionId
  }

  public clear(): void {
    localStorage.removeItem(renewalStorageKey)
    this.expire()
  }

  /**
   * Ends an expired session but keeps a pending renewal.
   */
  public expire(): void {
    localStorage.removeItem(storageKey)
    this.deactivate()
  }

  public deactivate(): void {
    this.latestRestorePermissionId = undefined
    const wasGuestContextReady = this.authStore.guestContextReady
    this.authStore.clearGuestContext()
    if (wasGuestContextReady) {
      resetSSE()
    }
  }

  private async establish(permissionId: string): Promise<GuestSession> {
    const session = await this.findSession(permissionId)
    this.activate(session)
    return session
  }

  private activate({ permissionId, space, email }: GuestSession): void {
    this.expiredPermissionId = undefined
    this.unavailablePermissionId = undefined
    localStorage.setItem(storageKey, permissionId)
    this.authStore.setGuestContext(permissionId, space.id, email)
  }

  // another tab might have persisted the session of a different share meanwhile
  private dropSession(permissionId: string): void {
    if (localStorage.getItem(storageKey) === permissionId) {
      localStorage.removeItem(storageKey)
    }
  }

  private async findSession(permissionId: string): Promise<GuestSession> {
    const driveItems = await this.clientService.graphAuthenticated.driveItems.listSharedWithMe(
      {},
      { withCredentials: true }
    )
    const driveItem = driveItems.find(({ remoteItem }) =>
      remoteItem?.permissions?.some(({ id }) => id === permissionId)
    )
    if (!driveItem) {
      throw new GuestShareNotFoundError()
    }

    const space =
      (this.spacesStore.getSpace(driveItem.remoteItem.id) as ShareSpaceResource) ||
      this.spacesStore.createShareSpace({
        driveAliasPrefix: 'share',
        id: driveItem.remoteItem.id,
        shareName: driveItem.name
      })

    const permission = driveItem.remoteItem.permissions.find(({ id }) => id === permissionId)
    return { permissionId, space, email: permission.grantedToV2?.user?.id }
  }
}
