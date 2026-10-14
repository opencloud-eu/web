import { AuthStore, ClientService, SpacesStore } from '@opencloud-eu/web-pkg'
import { DavHttpError, ShareSpaceResource } from '@opencloud-eu/web-client'
import {
  GuestLinkError,
  GuestLinkErrorErrorTypeEnum
} from '@opencloud-eu/web-client/graph/generated'
import { isAxiosError } from 'axios'
import { resetSSE } from '@opencloud-eu/web-client/sse'

const storageKey = 'oc.guestPermissionId'

export interface GuestSession {
  permissionId: string
  space: ShareSpaceResource
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
  '/dav/',
  '/remote.php/dav/',
  '/webdav/',
  '/remote.php/webdav/',
  '/ocs/v2.php/apps/notifications/api/v1/notifications/sse'
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

function getAlreadyRedeemedPermissionId(error: unknown): string | undefined {
  if (!isAxiosError<GuestLinkError>(error)) {
    return undefined
  }
  const data = error.response?.data
  if (data?.errorType !== GuestLinkErrorErrorTypeEnum.TokenAlreadyRedeemed) {
    return undefined
  }
  return data.permissionId || undefined
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
    return this.establish(permissionId)
  }

  private async reuseRedeemedSession(redeemError: unknown): Promise<GuestSession> {
    const permissionId = getAlreadyRedeemedPermissionId(redeemError)
    if (!permissionId) {
      throw redeemError
    }
    try {
      return await this.establish(permissionId)
    } catch (error) {
      // only report the token as used if there is no session to reuse, otherwise keep it retryable
      throw isGuestSessionInvalidError(error) ? redeemError : error
    }
  }

  public restoreContext(permissionId: string = localStorage.getItem(storageKey)): Promise<void> {
    if (!permissionId) {
      return Promise.resolve()
    }
    if (this.authStore.userContextReady) {
      this.clear()
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
      this.clear()
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
    this.authStore.setGuestContextUnavailable(true)
  }

  public clear(): void {
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

  private activate({ permissionId, space }: GuestSession): void {
    localStorage.setItem(storageKey, permissionId)
    this.authStore.setGuestContext(permissionId, space.id)
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

    return { permissionId, space }
  }
}
