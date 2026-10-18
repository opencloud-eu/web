import { createMemoryHistory, createRouter } from 'vue-router'
import { useAuthStore } from '@opencloud-eu/web-pkg'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import { setupAuthGuard } from '../../../src/router/setupAuthGuard'
import { authService } from '../../../src/services/auth/authService'

vi.mock('../../../src/services/auth/authService', () => ({
  authService: {
    initializeContext: vi.fn(),
    hasAuthErrorOccurred: false,
    consumeExpiredGuestPermissionId: vi.fn(),
    consumeUnavailableGuestPermissionId: vi.fn()
  }
}))

const guestPath = '/guest/share/Invited folder'

describe('setupAuthGuard', () => {
  beforeEach(() => {
    createTestingPinia({ stubActions: false })
  })

  describe('expired guest session', () => {
    it('redirects to the renew page if a guest session expired while restoring it', async () => {
      const router = getRouter()
      vi.mocked(authService.consumeExpiredGuestPermissionId).mockReturnValueOnce('permission-id')

      await router.push(guestPath)

      expect(router.currentRoute.value.name).toEqual('renewGuestLink')
      expect(router.currentRoute.value.params.permissionId).toEqual('permission-id')
      expect(router.currentRoute.value.query.resume).toBeUndefined()
      expect(router.currentRoute.value.query.redirectUrl).toEqual(
        router.resolve(guestPath).fullPath
      )
    })

    it('consumes the expired guest session when an auth error occurred', async () => {
      const router = getRouter()
      authService.hasAuthErrorOccurred = true

      await router.push(guestPath)

      expect(router.currentRoute.value.name).toEqual('accessDenied')
      expect(authService.consumeExpiredGuestPermissionId).toHaveBeenCalled()
    })
  })

  describe('unavailable guest session', () => {
    it('resumes the persisted session that could not be restored without a permission id', async () => {
      const router = getRouter()
      vi.mocked(authService.consumeUnavailableGuestPermissionId).mockReturnValueOnce(
        'permission-id'
      )

      await router.push(guestPath)

      expect(router.currentRoute.value.name).toEqual('renewGuestLink')
      expect(router.currentRoute.value.params.permissionId).toEqual('permission-id')
      expect(router.currentRoute.value.query.resume).toEqual('true')
      expect(router.currentRoute.value.query.redirectUrl).toEqual(
        router.resolve(guestPath).fullPath
      )
    })

    it('consumes the unavailable guest session when an auth error occurred', async () => {
      const router = getRouter()
      authService.hasAuthErrorOccurred = true

      await router.push(guestPath)

      expect(router.currentRoute.value.name).toEqual('accessDenied')
      expect(authService.consumeUnavailableGuestPermissionId).toHaveBeenCalled()
    })
  })

  describe('guest context', () => {
    it('redirects to the renew page to resume the session without a guest context', async () => {
      const router = getRouter()

      await router.push({ path: guestPath, query: { permissionId: 'permission-id' } })

      expect(router.currentRoute.value.name).toEqual('renewGuestLink')
      expect(router.currentRoute.value.params.permissionId).toEqual('permission-id')
      expect(router.currentRoute.value.query.resume).toEqual('true')
      expect(router.currentRoute.value.query.redirectUrl).toEqual(
        router.resolve({ path: guestPath, query: { permissionId: 'permission-id' } }).fullPath
      )
    })

    it('denies access without a guest context and permission id', async () => {
      const router = getRouter()

      await router.push(guestPath)

      expect(router.currentRoute.value.name).toEqual('accessDenied')
    })

    it('redirects a hybrid route opened from a guest route without a guest context', async () => {
      const router = getRouter()

      await router.push({
        path: '/app',
        query: { contextRouteName: 'files-guest-link', permissionId: 'permission-id' }
      })

      expect(router.currentRoute.value.name).toEqual('renewGuestLink')
    })

    it('reloads the page for guest routes if a user context is loaded', async () => {
      const originalLocation = window.location
      const assign = vi.fn()
      Object.defineProperty(window, 'location', { value: { assign }, writable: true })
      const router = getRouter()
      useAuthStore().setUserContextReady(true)
      const location = { path: guestPath, query: { permissionId: 'permission-id' } }

      await router.push(location)

      expect(assign).toHaveBeenCalledWith(router.resolve(location).href)
      expect(router.currentRoute.value.name).not.toEqual('files-guest-link')
      Object.defineProperty(window, 'location', { value: originalLocation, writable: true })
    })

    it('allows guest routes with a guest context', async () => {
      const router = getRouter()
      useAuthStore().setGuestContext('permission-id', 'share-id')

      await router.push(guestPath)

      expect(router.currentRoute.value.name).toEqual('files-guest-link')
    })
  })

  describe('guest permission id', () => {
    it('is appended to the query while a guest context is active', async () => {
      const router = getRouter()
      useAuthStore().setGuestContext('permission-id', 'share-id')

      await router.push(guestPath)

      expect(router.currentRoute.value.query).toEqual({ permissionId: 'permission-id' })
      expect(router.currentRoute.value.params.driveAliasAndItem).toEqual('share/Invited folder')
    })

    it('is appended to a hybrid route opened from a guest route', async () => {
      const router = getRouter()
      useAuthStore().setGuestContext('permission-id', 'share-id')

      await router.push({ path: '/app', query: { contextRouteName: 'files-guest-link' } })

      expect(router.currentRoute.value.query).toEqual({
        contextRouteName: 'files-guest-link',
        permissionId: 'permission-id'
      })
    })

    it('keeps other query params', async () => {
      const router = getRouter()
      useAuthStore().setGuestContext('permission-id', 'share-id')

      await router.push({ path: guestPath, query: { foo: 'bar' } })

      expect(router.currentRoute.value.query).toEqual({ foo: 'bar', permissionId: 'permission-id' })
    })

    it('is re-appended on query-only navigations', async () => {
      const router = getRouter()
      useAuthStore().setGuestContext('permission-id', 'share-id')
      await router.push(guestPath)

      await router.replace({ path: guestPath, query: { foo: 'bar' } })

      expect(router.currentRoute.value.query).toEqual({ foo: 'bar', permissionId: 'permission-id' })
    })

    it('does not override a permission id that is already present', async () => {
      const router = getRouter()
      useAuthStore().setGuestContext('permission-id', 'share-id')

      await router.push({ path: guestPath, query: { permissionId: 'other-permission-id' } })

      expect(router.currentRoute.value.query).toEqual({ permissionId: 'other-permission-id' })
    })

    it.each(['/login', '/g/magic-token', '/s/public-token', '/other'])(
      'is not appended to %s',
      async (path) => {
        const router = getRouter()
        useAuthStore().setGuestContext('permission-id', 'share-id')

        await router.push(path)

        expect(router.currentRoute.value.query).toEqual({})
      }
    )
  })
})

function getRouter() {
  const meta = { authContext: 'anonymous' as const }
  const component = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/guest/:driveAliasAndItem(.*)?',
        name: 'files-guest-link',
        component,
        meta: { authContext: 'guest' }
      },
      { path: '/app', name: 'app', component, meta: { authContext: 'hybrid' } },
      { path: '/g/renew/:permissionId', name: 'renewGuestLink', component, meta },
      { path: '/g/:token', name: 'resolveGuestLink', component, meta },
      { path: '/login', name: 'login', component, meta },
      { path: '/s/:token', name: 'resolvePublicLink', component, meta },
      { path: '/other', name: 'other', component, meta },
      { path: '/access-denied', name: 'accessDenied', component, meta }
    ]
  })
  setupAuthGuard(router)
  return router
}
