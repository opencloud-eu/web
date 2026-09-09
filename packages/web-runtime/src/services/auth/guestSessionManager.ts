import { AuthStore, ClientService, SpacesStore } from '@opencloud-eu/web-pkg'
import { ShareSpaceResource } from '@opencloud-eu/web-client'

const storageKey = 'oc.guestPermissionId'

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

  public async redeem(token: string): Promise<ShareSpaceResource> {
    this.clear()
    // `withCredentials` lets the browser store and send the guest session cookie when web is
    // served from a different origin than the server. It's a no-op same-origin.
    const permissionId = await this.clientService.graphAuthenticated.guestLinks.redeemGuestLink(
      token,
      { withCredentials: true }
    )
    return this.establish(permissionId)
  }

  public restoreContext(): Promise<void> {
    const permissionId = localStorage.getItem(storageKey)
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
          this.clear()
        })
        .finally(() => {
          this.restorePromise = null
        })
    }
    return this.restorePromise
  }

  public clear(): void {
    localStorage.removeItem(storageKey)
    this.authStore.clearGuestContext()
  }

  private async establish(permissionId: string): Promise<ShareSpaceResource> {
    const driveItems = await this.clientService.graphAuthenticated.driveItems.listSharedWithMe(
      {},
      { withCredentials: true }
    )
    const driveItem = driveItems.find(({ remoteItem }) =>
      remoteItem?.permissions?.some(({ id }) => id === permissionId)
    )
    if (!driveItem) {
      throw new Error('guest share not found')
    }

    const space =
      (this.spacesStore.getSpace(driveItem.remoteItem.id) as ShareSpaceResource) ||
      this.spacesStore.createShareSpace({
        driveAliasPrefix: 'share',
        id: driveItem.remoteItem.id,
        shareName: driveItem.name
      })

    localStorage.setItem(storageKey, permissionId)
    this.authStore.setGuestContext(permissionId)
    return space
  }
}
