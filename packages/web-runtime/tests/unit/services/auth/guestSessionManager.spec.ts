import { mock } from 'vitest-mock-extended'
import { AxiosError, AxiosResponse } from 'axios'
import { ClientService, useAuthStore, useSpacesStore } from '@opencloud-eu/web-pkg'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import { resetSSE } from '@opencloud-eu/web-client/sse'
import { DavHttpError } from '@opencloud-eu/web-client'
import {
  GuestSessionManager,
  GuestShareNotFoundError,
  isGuestSessionExpiredError,
  isGuestSessionInvalidError
} from '../../../../src/services/auth/guestSessionManager'

vi.mock('@opencloud-eu/web-client/sse', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  resetSSE: vi.fn()
}))

const storageKey = 'oc.guestPermissionId'

const sharedDriveItem = {
  name: 'Invited folder',
  remoteItem: {
    id: 'share-id',
    permissions: [{ id: 'permission-id', grantedToV2: { user: { id: 'guest@example.org' } } }]
  }
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

describe('isGuestSessionInvalidError', () => {
  it.each([
    ['a session_expired response', sessionExpiredError(), true],
    ['a graph 401 from sharedWithMe', graphUnauthorizedError(sharedWithMeUrl), true],
    ['a dav 401', davUnauthorizedError('https://cloud.test/dav/spaces/share-id'), true],
    ['a graph 401 from a non-guest endpoint', graphUnauthorizedError('/graph/v1.0/me'), false],
    ['a dav 401 without url', new DavHttpError('', undefined, undefined, 401), false],
    ['a missing share', new GuestShareNotFoundError(), false],
    ['nothing', undefined, false]
  ])('detects %s: %s', (_, error, expected) => {
    expect(isGuestSessionInvalidError(error)).toBe(expected)
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
      const { manager, verifyGuestLinkToken, listSharedWithMe } = getManager()

      const { permissionId, space } = await manager.redeem('magic-token')

      expect(permissionId).toEqual('permission-id')
      expect(verifyGuestLinkToken).toHaveBeenCalledWith('magic-token', { withCredentials: true })
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
      expect(authStore.guestEmail).toEqual('guest@example.org')
      expect(localStorage.getItem(storageKey)).toEqual('permission-id')
    })

    it('uses the recipient of the matching permission for the guest email', async () => {
      const { manager } = getManager({
        driveItems: [
          {
            ...sharedDriveItem,
            remoteItem: {
              ...sharedDriveItem.remoteItem,
              permissions: [
                { id: 'other-permission-id', grantedToV2: { user: { id: 'other@example.org' } } },
                ...sharedDriveItem.remoteItem.permissions
              ]
            }
          }
        ]
      })

      await manager.redeem('magic-token')

      expect(useAuthStore().guestEmail).toEqual('guest@example.org')
    })

    it('rejects and grants no session when the redemption fails', async () => {
      const { manager, listSharedWithMe } = getManager({ redeemError: new Error('410') })

      await expect(manager.redeem('magic-token')).rejects.toThrow('410')

      expect(listSharedWithMe).not.toHaveBeenCalled()
      expect(useAuthStore().guestContextReady).toBeFalsy()
      expect(localStorage.getItem(storageKey)).toBeNull()
    })

    it.each([
      [409, 'tokenAlreadyRedeemed'],
      [401, 'tokenExpired']
    ])('reuses the existing session cookie on %s %s', async (status, errorType) => {
      const { manager } = getManager({
        redeemError: guestLinkError(status, errorType, 'permission-id')
      })

      const { space } = await manager.redeem('magic-token')

      expect(space.id).toEqual('share-id')
      expect(useAuthStore().guestPermissionId).toEqual('permission-id')
    })

    it.each([
      [409, 'tokenAlreadyRedeemed'],
      [401, 'tokenExpired']
    ])(
      'rejects with the %s %s error when there is no valid session cookie to reuse',
      async (status, errorType) => {
        const redeemError = guestLinkError(status, errorType, 'permission-id')
        const { manager } = getManager({
          redeemError,
          listError: graphUnauthorizedError(sharedWithMeUrl)
        })

        await expect(manager.redeem('magic-token')).rejects.toBe(redeemError)

        expect(useAuthStore().guestContextReady).toBeFalsy()
        expect(localStorage.getItem(storageKey)).toBeNull()
      }
    )

    it('drops the persisted session of the share when its session cookie is invalid', async () => {
      localStorage.setItem(storageKey, 'permission-id')
      const redeemError = guestLinkError(401, 'tokenExpired', 'permission-id')
      const { manager } = getManager({
        redeemError,
        listError: graphUnauthorizedError(sharedWithMeUrl)
      })

      await expect(manager.redeem('magic-token')).rejects.toBe(redeemError)

      expect(localStorage.getItem(storageKey)).toBeNull()
    })

    it('rejects with the redeem error when the session cookie belongs to another guest', async () => {
      const redeemError = guestLinkError(401, 'tokenExpired', 'permission-id')
      const { manager } = getManager({ redeemError, driveItems: [] })

      await expect(manager.redeem('magic-token')).rejects.toBe(redeemError)
    })

    it('rejects with the reuse error when reusing the session cookie fails transiently', async () => {
      const listError = new Error('network')
      const { manager } = getManager({
        redeemError: guestLinkError(409, 'tokenAlreadyRedeemed', 'permission-id'),
        listError
      })

      await expect(manager.redeem('magic-token')).rejects.toBe(listError)
    })

    it.each(['tokenInvalid', 'shareExpired'])(
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

    it('keeps the persisted guest session when the redemption fails', async () => {
      localStorage.setItem(storageKey, 'old-permission-id')
      useAuthStore().setGuestContext('old-permission-id', 'share-id')
      const { manager } = getManager({ redeemError: new Error('401') })

      await expect(manager.redeem('magic-token')).rejects.toThrow()

      expect(useAuthStore().guestContextReady).toBeFalsy()
      expect(localStorage.getItem(storageKey)).toEqual('old-permission-id')
    })

    it('drops the persisted guest session once the token is verified', async () => {
      localStorage.setItem(storageKey, 'old-permission-id')
      const { manager } = getManager({ driveItems: [] })

      await expect(manager.redeem('magic-token')).rejects.toThrow()

      expect(localStorage.getItem(storageKey)).toBeNull()
    })
  })

  describe('renew', () => {
    it('requests a new link with credentials', async () => {
      const { manager, renewGuestLink } = getManager()

      await manager.renew('permission-id')

      expect(renewGuestLink).toHaveBeenCalledWith('permission-id', { withCredentials: true })
    })

    it('does not record a renewal when it fails', async () => {
      const { manager, renewGuestLink } = getManager()
      renewGuestLink.mockRejectedValueOnce(new Error('500'))

      await expect(manager.renew('permission-id')).rejects.toThrow('500')

      expect(manager.getPendingRenewal('permission-id')).toBeUndefined()
    })
  })

  describe('getPendingRenewal', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns a renewal with pin when the session of the share is active', async () => {
      const { manager } = getManager()
      await manager.redeem('magic-token')

      expect(await manager.renew('permission-id')).toEqual({ withPin: true })
      expect(manager.getPendingRenewal('permission-id')).toEqual({ withPin: true })
      expect(manager.getPendingRenewal('other-permission-id')).toBeUndefined()
    })

    it('returns a renewal without pin when the session expired', async () => {
      const { manager } = getManager()
      await manager.redeem('magic-token')
      manager.expire()

      await manager.renew('permission-id')

      expect(manager.getPendingRenewal('permission-id')).toEqual({ withPin: false })
    })

    it('returns a renewal without pin when the session belongs to another share', async () => {
      const { manager } = getManager()
      await manager.redeem('magic-token')

      await manager.renew('other-permission-id')

      expect(manager.getPendingRenewal('other-permission-id')).toEqual({ withPin: false })
    })

    it('returns nothing without a renewal', () => {
      const { manager } = getManager()
      expect(manager.getPendingRenewal('permission-id')).toBeUndefined()
    })

    it('returns nothing once the renewal expired', async () => {
      vi.useFakeTimers()
      const { manager } = getManager()
      await manager.renew('permission-id')

      vi.advanceTimersByTime(30 * 60 * 1000)

      expect(manager.getPendingRenewal('permission-id')).toBeUndefined()
    })

    it.each([
      [
        'the pin is verified',
        (manager: GuestSessionManager) => manager.verifyPin('permission-id', '123456')
      ],
      ['a link is redeemed', (manager: GuestSessionManager) => manager.redeem('magic-token')],
      ['the session is cleared', (manager: GuestSessionManager) => manager.clear()]
    ])('returns nothing once %s', async (_, action) => {
      const { manager } = getManager()
      await manager.renew('permission-id')

      await action(manager)

      expect(manager.getPendingRenewal('permission-id')).toBeUndefined()
    })

    it('keeps the renewal when the session expires', async () => {
      const { manager } = getManager()
      await manager.renew('permission-id')

      manager.expire()

      expect(manager.getPendingRenewal('permission-id')).toBeDefined()
    })
  })

  describe('verifyPin', () => {
    it('verifies the pin with credentials and persists the session without loading it', async () => {
      const { manager, verifyGuestLinkPin, listSharedWithMe } = getManager()

      await manager.verifyPin('permission-id', '123456')

      expect(verifyGuestLinkPin).toHaveBeenCalledWith(
        { pin: '123456', permissionId: 'permission-id' },
        { withCredentials: true }
      )
      expect(manager.hasSession('permission-id')).toBeTruthy()
      expect(listSharedWithMe).not.toHaveBeenCalled()
      expect(useAuthStore().guestContextReady).toBeFalsy()
    })

    it('keeps the persisted session when the pin is invalid', async () => {
      localStorage.setItem(storageKey, 'other-permission-id')
      const pinError = guestLinkError(401, 'pinInvalid', 'permission-id')
      const { manager } = getManager({ pinError })

      await expect(manager.verifyPin('permission-id', '000000')).rejects.toBe(pinError)

      expect(localStorage.getItem(storageKey)).toEqual('other-permission-id')
    })
  })

  describe('resume', () => {
    it('establishes the guest context of a verified session', async () => {
      const { manager } = getManager()
      await manager.verifyPin('permission-id', '123456')

      const { permissionId, space } = await manager.resume('permission-id')

      expect(permissionId).toEqual('permission-id')
      expect(space.id).toEqual('share-id')
      expect(useAuthStore().guestContextReady).toBeTruthy()
    })

    it('keeps the session when loading its context fails transiently', async () => {
      localStorage.setItem(storageKey, 'permission-id')
      const { manager } = getManager({ listError: new Error('503') })

      await expect(manager.resume('permission-id')).rejects.toThrow('503')

      expect(manager.hasSession('permission-id')).toBeTruthy()
    })

    it.each([
      ['the session is invalid', { listError: graphUnauthorizedError(sharedWithMeUrl) }],
      ['the share is missing', { driveItems: [] }]
    ])('drops the session when %s', async (_, options) => {
      localStorage.setItem(storageKey, 'permission-id')
      const { manager } = getManager(options)

      await expect(manager.resume('permission-id')).rejects.toBeDefined()

      expect(manager.hasSession('permission-id')).toBeFalsy()
    })

    it('keeps the persisted session of another share', async () => {
      localStorage.setItem(storageKey, 'other-permission-id')
      const { manager } = getManager({ driveItems: [] })

      await expect(manager.resume('permission-id')).rejects.toBeDefined()

      expect(localStorage.getItem(storageKey)).toEqual('other-permission-id')
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
      expect(useAuthStore().guestEmail).toEqual('guest@example.org')
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

    it('remembers the permission id of an expired session once', async () => {
      localStorage.setItem(storageKey, 'permission-id')
      const { manager } = getManager({ listError: sessionExpiredError() })

      await manager.restoreContext()

      expect(manager.consumeExpiredPermissionId()).toEqual('permission-id')
      expect(manager.consumeExpiredPermissionId()).toBeUndefined()
    })

    it('does not remember a permission id when the share is missing', async () => {
      localStorage.setItem(storageKey, 'permission-id')
      const { manager } = getManager({ driveItems: [] })

      await manager.restoreContext()

      expect(manager.consumeExpiredPermissionId()).toBeUndefined()
    })

    it.each([
      ['a graph 401', graphUnauthorizedError(sharedWithMeUrl)],
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
      expect(manager.consumeUnavailablePermissionId()).toEqual('permission-id')
      expect(manager.consumeUnavailablePermissionId()).toBeUndefined()
    })

    it('keeps the persisted session when the share of another permission id is unknown', async () => {
      localStorage.setItem(storageKey, 'permission-id')
      useAuthStore().setGuestContext('permission-id', 'share-id')
      const { manager } = getManager()

      await manager.restoreContext('foreign-permission-id')

      expect(useAuthStore().guestContextReady).toBeFalsy()
      expect(localStorage.getItem(storageKey)).toEqual('permission-id')
    })

    it('applies only the most recently requested permission id', async () => {
      const otherDriveItem = {
        name: 'Other folder',
        remoteItem: { id: 'other-share-id', permissions: [{ id: 'other-permission-id' }] }
      }
      const { manager, listSharedWithMe } = getManager({
        driveItems: [sharedDriveItem, otherDriveItem]
      })

      await Promise.all([
        manager.restoreContext('permission-id'),
        manager.restoreContext('other-permission-id')
      ])

      expect(listSharedWithMe).toHaveBeenCalledTimes(2)
      expect(useAuthStore().guestPermissionId).toEqual('other-permission-id')
      expect(localStorage.getItem(storageKey)).toEqual('other-permission-id')
    })

    it('discards a restore that is still running when the guest context gets cleared', async () => {
      localStorage.setItem(storageKey, 'permission-id')
      const { manager } = getManager()

      const restorePromise = manager.restoreContext()
      manager.clear()
      await restorePromise

      expect(useAuthStore().guestContextReady).toBeFalsy()
      expect(localStorage.getItem(storageKey)).toBeNull()
    })

    it('resets the unavailable permission id once the guest context is restored', async () => {
      localStorage.setItem(storageKey, 'permission-id')
      const { manager, listSharedWithMe } = getManager()
      listSharedWithMe.mockRejectedValueOnce(new Error('network error'))

      await manager.restoreContext()
      await manager.restoreContext()

      expect(manager.consumeUnavailablePermissionId()).toBeUndefined()
      expect(useAuthStore().guestSpaceId).toEqual('share-id')
    })

    it('keeps the guest record without restoring it when a user context is loaded', async () => {
      localStorage.setItem(storageKey, 'permission-id')
      useAuthStore().setUserContextReady(true)
      const { manager, listSharedWithMe } = getManager()

      await manager.restoreContext()

      expect(listSharedWithMe).not.toHaveBeenCalled()
      expect(useAuthStore().guestContextReady).toBe(false)
      expect(localStorage.getItem(storageKey)).toEqual('permission-id')
    })
  })
})

function sessionExpiredError() {
  return new AxiosError('401', '401', undefined, undefined, {
    status: 401,
    data: { error_type: 'session_expired', message: 'Your session has expired.' }
  } as AxiosResponse)
}

const sharedWithMeUrl = 'https://cloud.test/graph/v1beta1/me/drive/sharedWithMe'

function graphUnauthorizedError(url: string) {
  return new AxiosError('401', '401', { url } as any, undefined, {
    status: 401,
    data: {}
  } as AxiosResponse)
}

function davUnauthorizedError(url: string) {
  return new DavHttpError('', undefined, { url } as Response, 401)
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
  pinError = null,
  listError = null
}: {
  driveItems?: unknown[]
  redeemError?: Error
  pinError?: Error
  listError?: Error
} = {}) {
  const verifyGuestLinkToken = redeemError
    ? vi.fn().mockRejectedValue(redeemError)
    : vi.fn().mockResolvedValue('permission-id')
  const verifyGuestLinkPin = pinError
    ? vi.fn().mockRejectedValue(pinError)
    : vi.fn().mockResolvedValue('permission-id')
  const renewGuestLink = vi.fn().mockResolvedValue(undefined)
  const listSharedWithMe = listError
    ? vi.fn().mockRejectedValue(listError)
    : vi.fn().mockResolvedValue(driveItems)

  const clientService = mock<ClientService>({
    graphAuthenticated: {
      guestLinks: { verifyGuestLinkToken, verifyGuestLinkPin, renewGuestLink },
      driveItems: { listSharedWithMe }
    }
  } as any)

  const manager = new GuestSessionManager({
    clientService,
    authStore: useAuthStore(),
    spacesStore: useSpacesStore()
  })

  return { manager, verifyGuestLinkToken, verifyGuestLinkPin, renewGuestLink, listSharedWithMe }
}
