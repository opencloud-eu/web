import { mock } from 'vitest-mock-extended'
import { AxiosError, AxiosResponse } from 'axios'
import { ClientService, useAuthStore, useSpacesStore } from '@opencloud-eu/web-pkg'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import { resetSSE } from '@opencloud-eu/web-client/sse'
import { DavHttpError } from '@opencloud-eu/web-client'
import {
  GuestSessionManager,
  GuestShareNotFoundError,
  isGuestSessionExpiredError
} from '../../../../src/services/auth/guestSessionManager'

vi.mock('@opencloud-eu/web-client/sse', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  resetSSE: vi.fn()
}))

const storageKey = 'oc.guestPermissionId'

const sharedDriveItem = {
  name: 'Invited folder',
  remoteItem: { id: 'share-id', permissions: [{ id: 'permission-id' }] }
}

describe('isGuestSessionExpiredError', () => {
  it.each([
    ['a graph session_expired response', sessionExpiredError(), true],
    [
      'a dav session_expired response',
      new DavHttpError('', undefined, undefined, 401, 'session_expired'),
      true
    ],
    ['a dav 401 without error type', new DavHttpError('', undefined, undefined, 401), false],
    [
      'a graph 401 without error type',
      new AxiosError('401', '401', undefined, undefined, {
        status: 401,
        data: {}
      } as AxiosResponse),
      false
    ],
    ['a plain error', new Error('session_expired'), false],
    ['nothing', undefined, false]
  ])('detects %s: %s', (_, error, expected) => {
    expect(isGuestSessionExpiredError(error)).toBe(expected)
  })
})

describe('GuestSessionManager', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(resetSSE).mockClear()
    createTestingPinia({ stubActions: false })
  })

  describe('redeem', () => {
    it('redeems the token with credentials and returns the matching shared drive', async () => {
      const { manager, redeemGuestLink, listSharedWithMe } = getManager()

      const { permissionId, space } = await manager.redeem('magic-token')

      expect(permissionId).toEqual('permission-id')
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

    it('reuses the existing session cookie when the token was already redeemed', async () => {
      const { manager } = getManager({
        redeemError: guestLinkError(409, 'tokenAlreadyRedeemed', 'permission-id')
      })

      const { space } = await manager.redeem('magic-token')

      expect(space.id).toEqual('share-id')
      expect(useAuthStore().guestPermissionId).toEqual('permission-id')
    })

    it('rejects with the redeem error when there is no valid session cookie to reuse', async () => {
      const redeemError = guestLinkError(409, 'tokenAlreadyRedeemed', 'permission-id')
      const { manager } = getManager({ redeemError, listError: new Error('401') })

      await expect(manager.redeem('magic-token')).rejects.toBe(redeemError)

      expect(useAuthStore().guestContextReady).toBeFalsy()
      expect(localStorage.getItem(storageKey)).toBeNull()
    })

    it.each(['tokenExpired', 'tokenInvalid', 'shareExpired'])(
      'does not fall back to the session cookie on %s',
      async (errorType) => {
        const { manager, listSharedWithMe } = getManager({
          redeemError: guestLinkError(401, errorType, 'permission-id')
        })

        await expect(manager.redeem('magic-token')).rejects.toThrow()

        expect(listSharedWithMe).not.toHaveBeenCalled()
      }
    )

    it('rejects when no shared drive matches the permission id', async () => {
      const { manager } = getManager({ driveItems: [] })

      await expect(manager.redeem('magic-token')).rejects.toBeInstanceOf(GuestShareNotFoundError)

      expect(useAuthStore().guestContextReady).toBeFalsy()
      expect(localStorage.getItem(storageKey)).toBeNull()
    })

    it('drops a previous guest session before redeeming', async () => {
      localStorage.setItem(storageKey, 'old-permission-id')
      useAuthStore().setGuestContext('old-permission-id', 'share-id')
      const { manager } = getManager({ redeemError: new Error('401') })

      await expect(manager.redeem('magic-token')).rejects.toThrow()

      expect(useAuthStore().guestContextReady).toBeFalsy()
      expect(localStorage.getItem(storageKey)).toBeNull()
    })
  })

  describe('clear', () => {
    it('resets the SSE connection of an active guest context', () => {
      useAuthStore().setGuestContext('permission-id', 'share-id')
      const { manager } = getManager()

      manager.clear()

      expect(resetSSE).toHaveBeenCalled()
    })

    it('leaves the SSE connection alone without an active guest context', () => {
      useAuthStore().setUserContextReady(true)
      const { manager } = getManager()

      manager.clear()

      expect(resetSSE).not.toHaveBeenCalled()
    })

    it('keeps the persisted permission id when only deactivating', () => {
      localStorage.setItem(storageKey, 'permission-id')
      useAuthStore().setGuestContext('permission-id', 'share-id')
      const { manager } = getManager()

      manager.deactivate()

      expect(useAuthStore().guestContextReady).toBeFalsy()
      expect(resetSSE).toHaveBeenCalled()
      expect(localStorage.getItem(storageKey)).toEqual('permission-id')
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

    it('restores the guest context of an explicitly given permission id', async () => {
      localStorage.setItem(storageKey, 'other-permission-id')
      const { manager } = getManager()

      await manager.restoreContext('permission-id')

      expect(useAuthStore().guestPermissionId).toEqual('permission-id')
      expect(localStorage.getItem(storageKey)).toEqual('permission-id')
    })

    it('looks up the shared drive only once for parallel calls', async () => {
      localStorage.setItem(storageKey, 'permission-id')
      const { manager, listSharedWithMe } = getManager()

      await Promise.all([manager.restoreContext(), manager.restoreContext()])

      expect(listSharedWithMe).toHaveBeenCalledTimes(1)
    })

    it('skips the lookup when the guest context is already established', async () => {
      localStorage.setItem(storageKey, 'permission-id')
      useAuthStore().setGuestContext('permission-id', 'share-id')
      const { manager, listSharedWithMe } = getManager()

      await manager.restoreContext()

      expect(listSharedWithMe).not.toHaveBeenCalled()
    })

    it('clears the guest context when the session has expired', async () => {
      localStorage.setItem(storageKey, 'permission-id')
      useAuthStore().setGuestContext('other-permission-id', 'share-id')
      const { manager } = getManager({ listError: sessionExpiredError() })

      await manager.restoreContext()

      expect(useAuthStore().guestContextReady).toBeFalsy()
      expect(localStorage.getItem(storageKey)).toBeNull()
    })

    it.each([
      [
        'a graph 401',
        new AxiosError('401', '401', undefined, undefined, {
          status: 401,
          data: {}
        } as AxiosResponse)
      ],
      ['a dav 401', new DavHttpError('', undefined, undefined, 401)],
      ['a missing share', null]
    ])('clears the guest session on %s', async (_, listError) => {
      localStorage.setItem(storageKey, 'permission-id')
      useAuthStore().setGuestContext('other-permission-id', 'share-id')
      const { manager } = getManager({ listError, driveItems: [] })

      await manager.restoreContext()

      expect(useAuthStore().guestContextReady).toBeFalsy()
      expect(localStorage.getItem(storageKey)).toBeNull()
    })

    it.each([
      ['a network error', new AxiosError('Network Error', 'ERR_NETWORK')],
      [
        'a server error',
        new AxiosError('500', '500', undefined, undefined, {
          status: 500,
          data: {}
        } as AxiosResponse)
      ]
    ])('keeps the guest record on %s', async (_, listError) => {
      localStorage.setItem(storageKey, 'permission-id')
      const { manager } = getManager({ listError })

      await manager.restoreContext()

      expect(localStorage.getItem(storageKey)).toEqual('permission-id')
      expect(useAuthStore().guestContextUnavailable).toBeTruthy()
    })

    it('resets the unavailable flag once the guest context is restored', async () => {
      localStorage.setItem(storageKey, 'permission-id')
      useAuthStore().setGuestContextUnavailable(true)
      const { manager } = getManager()

      await manager.restoreContext()

      expect(useAuthStore().guestContextUnavailable).toBeFalsy()
      expect(useAuthStore().guestSpaceId).toEqual('share-id')
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

function sessionExpiredError() {
  return new AxiosError('401', '401', undefined, undefined, {
    status: 401,
    data: { error_type: 'session_expired', message: 'Your session has expired.' }
  } as AxiosResponse)
}

function guestLinkError(status: number, errorType: string, permissionId: string) {
  return new AxiosError(errorType, String(status), undefined, undefined, {
    status,
    data: { errorType, message: errorType, permissionId }
  } as AxiosResponse)
}

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
