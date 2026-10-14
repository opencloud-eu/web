import { createMemoryHistory, createRouter } from 'vue-router'
import { useAuthStore } from '@opencloud-eu/web-pkg'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import { setupAuthGuard } from '../../../src/router/setupAuthGuard'

vi.mock('../../../src/services/auth/authService', () => ({
  authService: { initializeContext: vi.fn(), hasAuthErrorOccurred: false }
}))

describe('setupAuthGuard', () => {
  describe('guest permission id', () => {
    beforeEach(() => {
      createTestingPinia({ stubActions: false })
    })

    it('is appended to the query while a guest context is active', async () => {
      const router = getRouter()
      useAuthStore().setGuestContext('permission-id', 'share-id')

      await router.push('/guest/Invited folder')

      expect(router.currentRoute.value.query).toEqual({ permissionId: 'permission-id' })
      expect(router.currentRoute.value.params.shareName).toEqual('Invited folder')
    })

    it('keeps other query params', async () => {
      const router = getRouter()
      useAuthStore().setGuestContext('permission-id', 'share-id')

      await router.push({ path: '/guest/Invited folder', query: { foo: 'bar' } })

      expect(router.currentRoute.value.query).toEqual({ foo: 'bar', permissionId: 'permission-id' })
    })

    it('is re-appended on query-only navigations', async () => {
      const router = getRouter()
      useAuthStore().setGuestContext('permission-id', 'share-id')
      await router.push('/guest/Invited folder')

      await router.replace({ path: '/guest/Invited folder', query: { foo: 'bar' } })

      expect(router.currentRoute.value.query).toEqual({ foo: 'bar', permissionId: 'permission-id' })
    })

    it('does not override a permission id that is already present', async () => {
      const router = getRouter()
      useAuthStore().setGuestContext('permission-id', 'share-id')

      await router.push({
        path: '/guest/Invited folder',
        query: { permissionId: 'other-permission-id' }
      })

      expect(router.currentRoute.value.query).toEqual({ permissionId: 'other-permission-id' })
    })

    it('is not appended without a guest context', async () => {
      const router = getRouter()

      await router.push('/guest/Invited folder')

      expect(router.currentRoute.value.query).toEqual({})
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
      { path: '/guest/:shareName?', name: 'files-guest-link', component, meta },
      { path: '/g/:token', name: 'resolveGuestLink', component, meta },
      { path: '/login', name: 'login', component, meta },
      { path: '/s/:token', name: 'resolvePublicLink', component, meta },
      { path: '/other', name: 'other', component, meta }
    ]
  })
  setupAuthGuard(router)
  return router
}
