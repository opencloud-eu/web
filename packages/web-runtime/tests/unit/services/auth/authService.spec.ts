import { ConfigStore, useAuthStore, useConfigStore } from '@opencloud-eu/web-pkg'
import { mock } from 'vitest-mock-extended'
import { Router } from 'vue-router'
import { ErrorResponse, ErrorTimeout } from 'oidc-client-ts'
import { AuthService } from '../../../../src/services/auth/authService'
import { UserManager } from '../../../../src/services/auth/userManager'
import { RouteLocation, createRouter, createTestingPinia } from '@opencloud-eu/web-test-helpers'

const mockUpdateContext = vi.fn()
console.debug = vi.fn()

vi.mock('../../../../src/services/auth/userManager')

const initAuthService = ({
  authService,
  configStore = null,
  router = null
}: {
  authService: AuthService
  configStore?: ConfigStore
  router?: Router
}) => {
  createTestingPinia()
  const authStore = useAuthStore()
  configStore = configStore || useConfigStore()

  authService.initialize(configStore, null, router, null, null, null, authStore, null, null)
}

describe('AuthService', () => {
  describe('signInCallback', () => {
    it.each([
      ['/', '/', {}],
      ['/?details=sharing', '/', { details: 'sharing' }],
      [
        '/external?contextRouteName=files-spaces-personal&fileId=0f897576',
        '/external',
        {
          contextRouteName: 'files-spaces-personal',
          fileId: '0f897576'
        }
      ]
    ])(
      'parses query params and passes them explicitly to router.replace: %s => %s %s',
      async (url, path, query: Record<string, string>) => {
        const authService = new AuthService()

        Object.defineProperty(authService, 'userManager', {
          value: {
            signinRedirectCallback: vi.fn(),
            getAndClearPostLoginRedirectUrl: () => url
          }
        })

        const router = createRouter()
        const replaceSpy = vi.spyOn(router, 'replace')

        initAuthService({ authService, router })
        await authService.signInCallback()

        expect(replaceSpy).toHaveBeenCalledWith({
          path,
          query
        })
      }
    )
  })

  describe('initializeContext', () => {
    it('when embed mode is disabled and access_token is present, should call updateContext', async () => {
      const authService = new AuthService()

      Object.defineProperty(authService, 'userManager', {
        value: mock<UserManager>({
          getUser: vi
            .fn()
            .mockResolvedValue({ access_token: 'access-token', profile: { sid: 'session-id' } }),
          updateContext: mockUpdateContext
        })
      })

      initAuthService({ authService })

      await authService.initializeContext(mock<RouteLocation>({}))

      expect(mockUpdateContext).toHaveBeenCalledWith('access-token', 'session-id', true)
    })

    it('when embed mode is disabled and access_token is not present, should not call updateContext', async () => {
      const authService = new AuthService()

      Object.defineProperty(authService, 'userManager', {
        value: mock<UserManager>({
          getUser: vi.fn().mockResolvedValue({ access_token: null, profile: { sid: null } }),
          updateContext: mockUpdateContext
        })
      })

      initAuthService({ authService })

      await authService.initializeContext(mock<RouteLocation>({}))

      expect(mockUpdateContext).not.toHaveBeenCalled()
    })

    it('when embed mode is enabled, access_token is present but auth is not delegated, should call updateContext', async () => {
      const authService = new AuthService()

      Object.defineProperty(authService, 'userManager', {
        value: mock<UserManager>({
          getUser: vi
            .fn()
            .mockResolvedValue({ access_token: 'access-token', profile: { sid: 'session-id' } }),
          updateContext: mockUpdateContext
        })
      })

      initAuthService({ authService })

      await authService.initializeContext(mock<RouteLocation>({}))

      expect(mockUpdateContext).toHaveBeenCalledWith('access-token', 'session-id', true)
    })

    it('when embed mode is enabled, access_token is present and auth is delegated, should not call updateContext', async () => {
      const authService = new AuthService()

      Object.defineProperty(authService, 'userManager', {
        value: mock<UserManager>({
          getUser: vi
            .fn()
            .mockResolvedValue({ access_token: 'access-token', profile: { sid: 'session-id' } }),
          updateContext: mockUpdateContext
        })
      })

      const configStore = useConfigStore()
      configStore.options = { embed: { enabled: true, delegateAuthentication: true } }
      initAuthService({ authService, configStore })

      await authService.initializeContext(mock<RouteLocation>({}))

      expect(mockUpdateContext).not.toHaveBeenCalled()
    })

    it('when embed mode is disabled, access_token is present and auth is delegated, should call updateContext', async () => {
      const authService = new AuthService()

      Object.defineProperty(authService, 'userManager', {
        value: mock<UserManager>({
          getUser: vi
            .fn()
            .mockResolvedValue({ access_token: 'access-token', profile: { sid: 'session-id' } }),
          updateContext: mockUpdateContext
        })
      })

      initAuthService({ authService })

      await authService.initializeContext(mock<RouteLocation>({}))

      expect(mockUpdateContext).toHaveBeenCalledWith('access-token', 'session-id', true)
    })
  })

  describe('handleAuthError', () => {
    const userContextRoute = mock<RouteLocation>({ meta: { authContext: 'user' } })

    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('retries a transient silent renewal and does not log the user out on eventual success', async () => {
      const authService = new AuthService()
      const signinSilent = vi
        .fn()
        .mockRejectedValueOnce(new ErrorTimeout('timeout'))
        .mockResolvedValueOnce(undefined)
      const removeUser = vi.fn()

      Object.defineProperty(authService, 'userManager', {
        value: mock<UserManager>({
          getUser: vi.fn().mockResolvedValue({ expired: true }),
          signinSilent,
          removeUser
        })
      })

      initAuthService({ authService, router: createRouter() })

      const promise = authService.handleAuthError(userContextRoute)
      await vi.runAllTimersAsync()
      await promise

      expect(signinSilent).toHaveBeenCalledTimes(2)
      expect(removeUser).not.toHaveBeenCalled()
    })

    it('logs the user out once transient retries are exhausted', async () => {
      const authService = new AuthService()
      const signinSilent = vi.fn().mockRejectedValue(new ErrorTimeout('timeout'))
      const removeUser = vi.fn()

      Object.defineProperty(authService, 'userManager', {
        value: mock<UserManager>({
          getUser: vi.fn().mockResolvedValue({ expired: true }),
          signinSilent,
          removeUser
        })
      })

      initAuthService({ authService, router: createRouter() })

      const promise = authService.handleAuthError(userContextRoute)
      await vi.runAllTimersAsync()
      await promise

      expect(signinSilent).toHaveBeenCalledTimes(5)
      expect(removeUser).toHaveBeenCalledWith('authError')
    })

    it('attempts a silent renewal before logging out on a 401 even when the token is not client-side expired', async () => {
      const authService = new AuthService()
      const signinSilent = vi.fn().mockResolvedValue(undefined)
      const removeUser = vi.fn()

      Object.defineProperty(authService, 'userManager', {
        value: mock<UserManager>({
          getUser: vi.fn().mockResolvedValue({ expired: false }),
          signinSilent,
          removeUser
        })
      })

      initAuthService({ authService, router: createRouter() })

      const promise = authService.handleAuthError(userContextRoute)
      await vi.runAllTimersAsync()
      await promise

      expect(signinSilent).toHaveBeenCalledTimes(1)
      expect(removeUser).not.toHaveBeenCalled()
    })

    it('logs the user out without attempting a renewal when no user is present', async () => {
      const authService = new AuthService()
      const signinSilent = vi.fn()
      const removeUser = vi.fn()

      Object.defineProperty(authService, 'userManager', {
        value: mock<UserManager>({
          getUser: vi.fn().mockResolvedValue(null),
          signinSilent,
          removeUser
        })
      })

      initAuthService({ authService, router: createRouter() })

      await authService.handleAuthError(userContextRoute)

      expect(signinSilent).not.toHaveBeenCalled()
      expect(removeUser).toHaveBeenCalledWith('authError')
    })

    it('does not retry a non-transient silent renewal error and logs the user out immediately', async () => {
      const authService = new AuthService()
      const signinSilent = vi.fn().mockRejectedValue(new ErrorResponse({ error: 'invalid_grant' }))
      const removeUser = vi.fn()

      Object.defineProperty(authService, 'userManager', {
        value: mock<UserManager>({
          getUser: vi.fn().mockResolvedValue({ expired: true }),
          signinSilent,
          removeUser
        })
      })

      initAuthService({ authService, router: createRouter() })

      const promise = authService.handleAuthError(userContextRoute)
      await vi.runAllTimersAsync()
      await promise

      expect(signinSilent).toHaveBeenCalledTimes(1)
      expect(removeUser).toHaveBeenCalledWith('authError')
    })
  })
})
