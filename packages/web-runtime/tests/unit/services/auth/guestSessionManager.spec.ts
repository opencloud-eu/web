import { mockDeep } from 'vitest-mock-extended'
import { AxiosResponse } from 'axios'
import { GraphSharePermission } from '@opencloud-eu/web-client'
import {
  ClientService,
  GuestSession,
  useAuthStore,
  useConfigStore,
  useMessages,
  useSpacesStore
} from '@opencloud-eu/web-pkg'
import { createRouter, createTestingPinia } from '@opencloud-eu/web-test-helpers'
import { GuestSessionManager } from '../../../../src/services/auth/guestSessionManager'
import { GuestAuthError } from '../../../../src/services/auth/guestAuth'

const storageKey = 'oc.guestSession'
const dayInMs = 24 * 60 * 60 * 1000

const sessionResponse = (overrides = {}) => ({
  share_id: 'share-id',
  share_name: 'Invited folder',
  permissions: ['libre.graph/driveItem/basic/read'],
  expires_at: new Date(Date.now() + dayInMs).toISOString(),
  ...overrides
})

const persisted = (overrides = {}): GuestSession => ({
  shareId: 'share-id',
  shareName: 'Invited folder',
  permissions: [] as GraphSharePermission[],
  expiresAt: Date.now() + dayInMs,
  ...overrides
})

describe('GuestSessionManager', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('method "verifyToken"', () => {
    it('establishes the session, the share space and the spaces store', async () => {
      const { manager, authStore, spacesStore, clientService } = getManager()
      clientService.httpUnAuthenticated.post.mockResolvedValue({
        data: sessionResponse()
      } as AxiosResponse)

      await manager.verifyToken('magic-token')

      expect(clientService.httpUnAuthenticated.post).toHaveBeenCalledWith(
        expect.stringContaining('magic_guest_link_auth/verify/token'),
        { token: 'magic-token' },
        { withCredentials: true }
      )
      expect(authStore.guestContextReady).toBeTruthy()
      expect(authStore.guestShareId).toEqual('share-id')
      expect(JSON.parse(localStorage.getItem(storageKey)).shareId).toEqual('share-id')

      // pre-populating the space is what keeps the guest's first folder listing off the
      // user-scoped mount point graph call, and unblocks the vault guard
      expect(spacesStore.spaces[0].graphPermissions).toEqual(['libre.graph/driveItem/basic/read'])
      expect(spacesStore.spacesInitialized).toBeTruthy()
    })

    it('renews and marks the session expired when the token is spent', async () => {
      const { manager, authStore, clientService } = getManager()
      clientService.httpUnAuthenticated.post
        .mockRejectedValueOnce({
          response: { status: 401, data: { error_type: 'token_expired', share_id: 'share-id' } }
        })
        .mockResolvedValue({ data: {} } as AxiosResponse)

      await expect(manager.verifyToken('magic-token')).rejects.toThrow(GuestAuthError)

      expect(clientService.httpUnAuthenticated.post).toHaveBeenCalledWith(
        expect.stringContaining('magic_guest_link_auth/renew'),
        { share_id: 'share-id' },
        { withCredentials: true }
      )
      expect(manager.sessionExpired).toBeTruthy()
      expect(authStore.guestContextReady).toBeFalsy()
      // remembered so the expired page can offer the PIN form
      expect(authStore.guestShareId).toEqual('share-id')
    })

    it('rejects a response with an unusable expiry instead of granting a session', async () => {
      const { manager, authStore, clientService } = getManager()
      clientService.httpUnAuthenticated.post.mockResolvedValue({
        data: sessionResponse({ expires_at: 'not a date' })
      } as AxiosResponse)

      await expect(manager.verifyToken('magic-token')).rejects.toThrow(GuestAuthError)
      expect(authStore.guestContextReady).toBeFalsy()
    })

    it('does not renew when the link is simply invalid', async () => {
      const { manager, clientService } = getManager()
      clientService.httpUnAuthenticated.post.mockRejectedValue({
        response: { status: 404, data: {} }
      })

      await expect(manager.verifyToken('magic-token')).rejects.toThrow(GuestAuthError)

      expect(clientService.httpUnAuthenticated.post).toHaveBeenCalledTimes(1)
      expect(manager.sessionExpired).toBeFalsy()
    })
  })

  describe('method "verifyPin"', () => {
    it('sends the pin together with the remembered share id', async () => {
      const { manager, authStore, clientService } = getManager()
      authStore.setGuestShareId('share-id')
      clientService.httpUnAuthenticated.post.mockResolvedValue({
        data: sessionResponse()
      } as AxiosResponse)

      await manager.verifyPin('123456')

      expect(clientService.httpUnAuthenticated.post).toHaveBeenCalledWith(
        expect.stringContaining('magic_guest_link_auth/verify/pin'),
        { pin: '123456', share_id: 'share-id' },
        { withCredentials: true }
      )
      expect(manager.sessionExpired).toBeFalsy()
      expect(authStore.guestContextReady).toBeTruthy()
    })
  })

  describe('method "restoreContext"', () => {
    it('does nothing without a persisted session', () => {
      const { manager, authStore } = getManager()
      manager.restoreContext()
      expect(authStore.guestContextReady).toBeFalsy()
    })

    it('restores a live session', () => {
      localStorage.setItem(storageKey, JSON.stringify(persisted()))
      const { manager, authStore, spacesStore } = getManager()

      manager.restoreContext()

      expect(authStore.guestContextReady).toBeTruthy()
      expect(authStore.guestShareName).toEqual('Invited folder')
      expect(spacesStore.spacesInitialized).toBeTruthy()
    })

    it('is idempotent across navigations', () => {
      localStorage.setItem(storageKey, JSON.stringify(persisted()))
      const { manager, authStore } = getManager()
      const setGuestContext = vi.spyOn(authStore, 'setGuestContext')

      manager.restoreContext()
      manager.restoreContext()
      manager.restoreContext()

      expect(setGuestContext).toHaveBeenCalledTimes(1)
    })

    it('expires a session that outlived its lifetime instead of restoring it', async () => {
      localStorage.setItem(storageKey, JSON.stringify(persisted({ expiresAt: Date.now() - 1 })))
      const { manager, authStore, clientService } = getManager()
      clientService.httpUnAuthenticated.post.mockResolvedValue({ data: {} } as AxiosResponse)

      manager.restoreContext()
      await manager.handleSessionExpired()

      expect(authStore.guestContextReady).toBeFalsy()
      expect(manager.sessionExpired).toBeTruthy()
      expect(localStorage.getItem(storageKey)).toBeNull()
    })

    it('drops a leftover record when a real user session owns the browser', () => {
      localStorage.setItem(storageKey, JSON.stringify(persisted()))
      const { manager, authStore } = getManager()
      authStore.setUserContextReady(true)

      manager.restoreContext()

      expect(authStore.guestContextReady).toBeFalsy()
      expect(localStorage.getItem(storageKey)).toBeNull()
    })

    it('drops an unreadable persisted session', () => {
      localStorage.setItem(storageKey, 'not json')
      const { manager, authStore } = getManager()

      manager.restoreContext()

      expect(authStore.guestContextReady).toBeFalsy()
      expect(localStorage.getItem(storageKey)).toBeNull()
    })
  })

  describe('method "handleSessionExpired"', () => {
    it('sends exactly one renewal for concurrent expiries', async () => {
      const { manager, authStore, clientService } = getManager()
      authStore.setGuestShareId('share-id')
      clientService.httpUnAuthenticated.post.mockResolvedValue({ data: {} } as AxiosResponse)

      await Promise.all(Array.from({ length: 5 }, () => manager.handleSessionExpired()))

      expect(clientService.httpUnAuthenticated.post).toHaveBeenCalledTimes(1)
    })

    it('survives a failing renewal', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { manager, authStore, clientService } = getManager()
      authStore.setGuestShareId('share-id')
      clientService.httpUnAuthenticated.post.mockRejectedValue(new Error('network down'))

      await manager.handleSessionExpired()

      expect(manager.sessionExpired).toBeTruthy()
    })
  })

  describe('session timers', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('warns 15 minutes before the session expires', async () => {
      const { manager, messagesStore, clientService } = getManager()
      clientService.httpUnAuthenticated.post.mockResolvedValue({
        data: sessionResponse()
      } as AxiosResponse)

      await manager.verifyToken('magic-token')
      expect(messagesStore.messages.length).toBe(0)

      vi.advanceTimersByTime(dayInMs - 15 * 60 * 1000)

      expect(messagesStore.messages.length).toBe(1)
      expect(messagesStore.messages[0].status).toEqual('warning')
      // must not auto-close, the guest needs time to save unsaved work
      expect(messagesStore.messages[0].timeout).toBe(0)
    })

    it('expires an idle session when its lifetime runs out', async () => {
      const { manager, authStore, clientService, router } = getManager()
      const pushSpy = vi.spyOn(router, 'push')
      clientService.httpUnAuthenticated.post.mockResolvedValue({
        data: sessionResponse()
      } as AxiosResponse)

      await manager.verifyToken('magic-token')
      await vi.advanceTimersByTimeAsync(dayInMs)

      expect(authStore.guestContextReady).toBeFalsy()
      expect(pushSpy).toHaveBeenCalledWith({ name: 'guestSessionExpired' })
    })

    it('does not warn when the session is already within the warning window', async () => {
      const { manager, messagesStore, clientService } = getManager()
      clientService.httpUnAuthenticated.post.mockResolvedValue({
        data: sessionResponse({ expires_at: new Date(Date.now() + 60000).toISOString() })
      } as AxiosResponse)

      await manager.verifyToken('magic-token')
      vi.advanceTimersByTime(59000)

      expect(messagesStore.messages.length).toBe(0)
    })

    it('cancels both timers on clear', async () => {
      const { manager, messagesStore, clientService, router } = getManager()
      const pushSpy = vi.spyOn(router, 'push')
      clientService.httpUnAuthenticated.post.mockResolvedValue({
        data: sessionResponse()
      } as AxiosResponse)

      await manager.verifyToken('magic-token')
      manager.clear()
      await vi.advanceTimersByTimeAsync(dayInMs)

      expect(messagesStore.messages.length).toBe(0)
      expect(pushSpy).not.toHaveBeenCalled()
    })
  })
})

function getManager() {
  createTestingPinia({ stubActions: false })
  const authStore = useAuthStore()
  const configStore = useConfigStore()
  const spacesStore = useSpacesStore()
  const messagesStore = useMessages()
  const clientService = mockDeep<ClientService>()
  const router = createRouter({
    routes: [
      {
        name: 'guestSessionExpired',
        path: '/guest-session-expired',
        component: { template: '<div />' }
      }
    ]
  })

  return {
    manager: new GuestSessionManager({
      clientService,
      configStore,
      authStore,
      spacesStore,
      messagesStore,
      router
    }),
    authStore,
    configStore,
    spacesStore,
    messagesStore,
    clientService,
    router
  }
}
