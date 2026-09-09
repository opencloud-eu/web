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

export function isGuestSessionInvalidError(error: unknown): boolean {
  if (error instanceof GuestShareNotFoundError || isGuestSessionExpiredError(error)) {
    return true
  }
  if (error instanceof DavHttpError) {
    return error.statusCode === 401
  }
  if (isAxiosError(error)) {
    return error.response?.status === 401
  }
  return false
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

  private restorePromise: Promise<void> | null = null

  constructor(options: GuestSessionManagerOptions) {
    this.clientService = options.clientService
    this.authStore = options.authStore
    this.spacesStore = options.spacesStore
  }

  public async redeem(token: string): Promise<GuestSession> {
    this.clear()
    let permissionId: string
    try {
      // `withCredentials` lets the browser store and send the guest session cookie when web is
      // served from a different origin than the server. It's a no-op same-origin.
      permissionId = await this.clientService.graphAuthenticated.guestLinks.redeemGuestLink(token, {
        withCredentials: true
      })
    } catch (error) {
      return this.reuseRedeemedSession(error)
    }
    return this.establish(permissionId)
  }

  private async reuseRedeemedSession(redeemError: unknown): Promise<GuestSession> {
    const permissionId = getAlreadyRedeemedPermissionId(redeemError)
    if (!permissionId) {
      throw redeemError
    }
    try {
      return await this.establish(permissionId)
    } catch {
      throw redeemError
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
      return Promise.resolve()
    }
    if (!this.restorePromise) {
      this.restorePromise = this.establish(permissionId)
        .then((): void => undefined)
        .catch((error) => {
          console.error('guest session could not be restored', error)
          if (isGuestSessionInvalidError(error)) {
            this.clear()
            return
          }
          this.authStore.setGuestContextUnavailable(true)
        })
        .finally(() => {
          this.restorePromise = null
        })
    }
    return this.restorePromise
  }

  public clear(): void {
    localStorage.removeItem(storageKey)
    this.deactivate()
  }

  public deactivate(): void {
    const wasGuestContextReady = this.authStore.guestContextReady
    this.authStore.clearGuestContext()
    if (wasGuestContextReady) {
      resetSSE()
    }
  }

  private async establish(permissionId: string): Promise<GuestSession> {
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

    localStorage.setItem(storageKey, permissionId)
    this.authStore.setGuestContext(permissionId, space.id)
    return { permissionId, space }
  }
}
