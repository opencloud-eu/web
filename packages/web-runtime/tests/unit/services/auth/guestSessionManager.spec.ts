import { mock } from 'vitest-mock-extended'
import { ClientService, useAuthStore, useSpacesStore } from '@opencloud-eu/web-pkg'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import { GuestSessionManager } from '../../../../src/services/auth/guestSessionManager'

const storageKey = 'oc.guestPermissionId'

const sharedDriveItem = {
  name: 'Invited folder',
  remoteItem: { id: 'share-id', permissions: [{ id: 'permission-id' }] }
}

describe('GuestSessionManager', () => {
  beforeEach(() => {
    localStorage.clear()
    createTestingPinia({ stubActions: false })
  })

  describe('redeem', () => {
    it('redeems the token with credentials and returns the matching shared drive', async () => {
      const { manager, redeemGuestLink, listSharedWithMe } = getManager()

      const space = await manager.redeem('magic-token')

      expect(redeemGuestLink).toHaveBeenCalledWith('magic-token', { withCredentials: true })
      expect(listSharedWithMe).toHaveBeenCalledWith({}, { withCredentials: true })
      expect(space.id).toEqual('share-id')
      expect(space.driveAlias).toEqual('share/Invited folder')
      expect(useSpacesStore().getSpace('share-id')).toBeDefined()
    })

    it('establishes and persists the guest context', async () => {
      const { manager } = getManager()

      await manager.redeem('magic-token')

      const authStore = useAuthStore()
      expect(authStore.guestContextReady).toBeTruthy()
      expect(authStore.guestPermissionId).toEqual('permission-id')
      expect(localStorage.getItem(storageKey)).toEqual('permission-id')
    })

    it('rejects and grants no session when the redemption fails', async () => {
      const { manager, listSharedWithMe } = getManager({ redeemError: new Error('410') })

      await expect(manager.redeem('magic-token')).rejects.toThrow('410')

      expect(listSharedWithMe).not.toHaveBeenCalled()
      expect(useAuthStore().guestContextReady).toBeFalsy()
      expect(localStorage.getItem(storageKey)).toBeNull()
    })

    it('rejects when no shared drive matches the permission id', async () => {
      const { manager } = getManager({ driveItems: [] })

      await expect(manager.redeem('magic-token')).rejects.toThrow()

      expect(useAuthStore().guestContextReady).toBeFalsy()
      expect(localStorage.getItem(storageKey)).toBeNull()
    })

    it('drops a previous guest session before redeeming', async () => {
      localStorage.setItem(storageKey, 'old-permission-id')
      useAuthStore().setGuestContext('old-permission-id')
      const { manager } = getManager({ redeemError: new Error('401') })

      await expect(manager.redeem('magic-token')).rejects.toThrow()

      expect(useAuthStore().guestContextReady).toBeFalsy()
      expect(localStorage.getItem(storageKey)).toBeNull()
    })
  })

  describe('restoreContext', () => {
    it('does nothing without a persisted permission id', async () => {
      const { manager, listSharedWithMe } = getManager()

      await manager.restoreContext()

      expect(listSharedWithMe).not.toHaveBeenCalled()
      expect(useAuthStore().guestContextReady).toBeFalsy()
    })

    it('restores the guest context from the persisted permission id', async () => {
      localStorage.setItem(storageKey, 'permission-id')
      const { manager } = getManager()

      await manager.restoreContext()

      expect(useAuthStore().guestContextReady).toBeTruthy()
      expect(useSpacesStore().getSpace('share-id')).toBeDefined()
    })

    it('looks up the shared drive only once for parallel calls', async () => {
      localStorage.setItem(storageKey, 'permission-id')
      const { manager, listSharedWithMe } = getManager()

      await Promise.all([manager.restoreContext(), manager.restoreContext()])

      expect(listSharedWithMe).toHaveBeenCalledTimes(1)
    })

    it('skips the lookup when the guest context is already established', async () => {
      localStorage.setItem(storageKey, 'permission-id')
      useAuthStore().setGuestContext('permission-id')
      const { manager, listSharedWithMe } = getManager()

      await manager.restoreContext()

      expect(listSharedWithMe).not.toHaveBeenCalled()
    })

    it('clears the guest context when the shared drive cannot be loaded', async () => {
      localStorage.setItem(storageKey, 'permission-id')
      const { manager } = getManager({ listError: new Error('401') })

      await manager.restoreContext()

      expect(useAuthStore().guestContextReady).toBeFalsy()
      expect(localStorage.getItem(storageKey)).toBeNull()
    })

    it('drops a leftover guest record when a user is signed in', async () => {
      localStorage.setItem(storageKey, 'permission-id')
      useAuthStore().setUserContextReady(true)
      const { manager, listSharedWithMe } = getManager()

      await manager.restoreContext()

      expect(listSharedWithMe).not.toHaveBeenCalled()
      expect(localStorage.getItem(storageKey)).toBeNull()
    })
  })
})

function getManager({
  driveItems = [sharedDriveItem],
  redeemError = null,
  listError = null
}: { driveItems?: unknown[]; redeemError?: Error; listError?: Error } = {}) {
  const redeemGuestLink = redeemError
    ? vi.fn().mockRejectedValue(redeemError)
    : vi.fn().mockResolvedValue('permission-id')
  const listSharedWithMe = listError
    ? vi.fn().mockRejectedValue(listError)
    : vi.fn().mockResolvedValue(driveItems)

  const clientService = mock<ClientService>({
    graphAuthenticated: {
      guestLinks: { redeemGuestLink },
      driveItems: { listSharedWithMe }
    }
  } as any)

  const manager = new GuestSessionManager({
    clientService,
    authStore: useAuthStore(),
    spacesStore: useSpacesStore()
  })

  return { manager, redeemGuestLink, listSharedWithMe }
}
