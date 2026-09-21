import { RouteRecordNormalized, Router } from 'vue-router'
import { useAuthStore } from '@opencloud-eu/web-pkg'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import { setupAuthGuard } from '../../../src/router/setupAuthGuard'
import { authService } from '../../../src/services/auth/authService'

vi.mock('../../../src/services/auth/authService', () => ({
  authService: {
    initializeContext: vi.fn(),
    hasAuthErrorOccurred: false,
    guestSessionExpired: false
  }
}))

type Guard = (to: any, from?: any) => Promise<unknown>

const userRoute = {
  name: 'files-spaces-generic',
  meta: { authContext: 'user' },
  fullPath: '/files/spaces/share/Invited%20folder',
  params: {},
  query: {}
}

const publicLinkRoute = {
  name: 'files-public-link',
  meta: { authContext: 'publicLink' },
  fullPath: '/files/link/public/token',
  params: { driveAliasAndItem: 'public/token', token: 'token' },
  query: {}
}

function installGuard() {
  let guard: Guard
  const router = {
    beforeEach: (fn: Guard) => (guard = fn),
    afterEach: vi.fn(),
    getRoutes: (): RouteRecordNormalized[] => []
  } as unknown as Router

  setupAuthGuard(router)
  return guard
}

describe('setupAuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authService.hasAuthErrorOccurred = false
    ;(authService as any).guestSessionExpired = false
    createTestingPinia({ stubActions: false })
  })

  it('sends an unauthenticated visitor to the login page', async () => {
    const guard = installGuard()

    expect(await guard(userRoute)).toEqual({
      path: '/login',
      query: { redirectUrl: userRoute.fullPath }
    })
  })

  it('lets a signed-in user through', async () => {
    useAuthStore().setUserContextReady(true)
    const guard = installGuard()

    expect(await guard(userRoute)).toBe(true)
  })

  it('lets an established guest session through a user-context route', async () => {
    useAuthStore().setGuestContext({
      shareId: 'share-id',
      shareName: 'Invited folder',
      permissions: [],
      expiresAt: Date.now() + 1000
    })
    const guard = installGuard()

    expect(await guard(userRoute)).toBe(true)
  })

  it('does not let a guest session stand in for a public link context', async () => {
    useAuthStore().setGuestContext({
      shareId: 'share-id',
      shareName: 'Invited folder',
      permissions: [],
      expiresAt: Date.now() + 1000
    })
    const guard = installGuard()

    expect(await guard(publicLinkRoute)).toEqual({
      name: 'resolvePublicLink',
      params: { token: 'token' },
      query: { redirectUrl: publicLinkRoute.fullPath }
    })
  })

  it('redirects an expired guest session to the expired page', async () => {
    ;(authService as any).guestSessionExpired = true
    const guard = installGuard()

    expect(await guard(userRoute)).toEqual({ name: 'guestSessionExpired' })
  })

  it('stays on the expired page once it is reached', async () => {
    ;(authService as any).guestSessionExpired = true
    const guard = installGuard()

    expect(await guard({ ...userRoute, name: 'guestSessionExpired' })).toBe(true)
  })

  it('gives an auth error precedence over the guest session', async () => {
    authService.hasAuthErrorOccurred = true
    ;(authService as any).guestSessionExpired = true
    const guard = installGuard()

    expect(await guard(userRoute)).toEqual({ name: 'accessDenied' })
  })
})
