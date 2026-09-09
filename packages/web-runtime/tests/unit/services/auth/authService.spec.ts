import {
  ClientService,
  ConfigStore,
  useAuthStore,
  useConfigStore,
  useSpacesStore
} from '@opencloud-eu/web-pkg'
import { mock } from 'vitest-mock-extended'
import { DavHttpError } from '@opencloud-eu/web-client'
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
  clientService = null,
  router = null
}: {
  authService: AuthService
  configStore?: ConfigStore
  clientService?: ClientService
  router?: Router
}) => {
  // stubActions: false so the guest session actions actually mutate the store
  createTestingPinia({ stubActions: false })
  const authStore = useAuthStore()
  configStore = configStore || useConfigStore()

  authService.initialize(
    configStore,
    clientService,
    router,
    null,
    null,
    null,
    authStore,
    null,
    null,
    useSpacesStore()
  )

  return { authStore }
}

describe('AuthService', () => {
  beforeEach(() => {
    localStorage.clear()
  })

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

    it('logs the user out when updating the context fails for the renewed token', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const authService = new AuthService()
      let onUserLoaded: (user: unknown) => Promise<void>
      const removeUser = vi.fn()
      const updateContext = vi.fn().mockRejectedValue(new Error('network error'))
      const signinSilent = vi
        .fn()
        .mockImplementation(() =>
          onUserLoaded({ access_token: 'renewed-token', profile: { sid: 'session-id' } })
        )

      Object.defineProperty(authService, 'userManager', {
        value: mock<UserManager>({
          getUser: vi.fn().mockResolvedValue({ expired: false }),
          areEventHandlersRegistered: false,
          events: mock<UserManager['events']>({
            addAccessTokenExpired: vi.fn(),
            addAccessTokenExpiring: vi.fn(),
            addUserLoaded: vi.fn().mockImplementation((cb) => (onUserLoaded = cb)),
            addUserUnloaded: vi.fn(),
            addSilentRenewError: vi.fn()
          }),
          updateContext,
          signinSilent,
          removeUser
        })
      })

      initAuthService({ authService, router: createRouter() })
      await authService.initializeContext(userContextRoute)

      const promise = authService.handleAuthError(userContextRoute)
      await vi.runAllTimersAsync()
      await promise

      // the failing context update must not trigger another renewal, otherwise the
      // nested call would wait for the renewal it is running in and deadlock
      expect(signinSilent).toHaveBeenCalledTimes(1)
      expect(updateContext).toHaveBeenCalledTimes(1)
      expect(removeUser).toHaveBeenCalledWith('authError')
    })

    it('clears an expired guest context instead of logging out', async () => {
      const authService = new AuthService()
      const removeUser = vi.fn()

      Object.defineProperty(authService, 'userManager', {
        value: mock<UserManager>({ getUser: vi.fn().mockResolvedValue(null), removeUser })
      })

      const { authStore } = initAuthService({ authService, router: createRouter() })
      authStore.setGuestContext('permission-id', 'share-id')
      localStorage.setItem('oc.guestPermissionId', 'permission-id')

      await authService.handleAuthError(
        userContextRoute,
        new DavHttpError('', undefined, undefined, 401, 'session_expired')
      )

      expect(removeUser).not.toHaveBeenCalled()
      expect(authStore.guestContextReady).toBeFalsy()
      expect(localStorage.getItem('oc.guestPermissionId')).toBeNull()
    })

    it('clears the guest context on any 401', async () => {
      const authService = new AuthService()
      const removeUser = vi.fn()

      Object.defineProperty(authService, 'userManager', {
        value: mock<UserManager>({ getUser: vi.fn().mockResolvedValue(null), removeUser })
      })

      const { authStore } = initAuthService({ authService, router: createRouter() })
      authStore.setGuestContext('permission-id', 'share-id')
      localStorage.setItem('oc.guestPermissionId', 'permission-id')

      await authService.handleAuthError(
        userContextRoute,
        new DavHttpError('', undefined, undefined, 401)
      )

      expect(removeUser).not.toHaveBeenCalled()
      expect(authStore.guestContextReady).toBeFalsy()
      expect(localStorage.getItem('oc.guestPermissionId')).toBeNull()
    })

    it('keeps the guest context on errors that are not a 401', async () => {
      const authService = new AuthService()
      Object.defineProperty(authService, 'userManager', {
        value: mock<UserManager>({ getUser: vi.fn().mockResolvedValue(null) })
      })

      const { authStore } = initAuthService({ authService, router: createRouter() })
      authStore.setGuestContext('permission-id', 'share-id')
      localStorage.setItem('oc.guestPermissionId', 'permission-id')

      await authService.handleAuthError(userContextRoute, new Error('network'))

      expect(authStore.guestContextReady).toBeTruthy()
      expect(localStorage.getItem('oc.guestPermissionId')).toEqual('permission-id')
    })

    it("treats a signed-in user's auth error as a user error even with a guest record around", async () => {
      const authService = new AuthService()
      const removeUser = vi.fn()

      Object.defineProperty(authService, 'userManager', {
        value: mock<UserManager>({ getUser: vi.fn().mockResolvedValue(null), removeUser })
      })

      const { authStore } = initAuthService({ authService, router: createRouter() })
      authStore.setGuestContext('permission-id', 'share-id')
      authStore.setUserContextReady(true)

      await authService.handleAuthError(userContextRoute)

      expect(removeUser).toHaveBeenCalledWith('authError')
    })
    it('re-resolves a public link on a 401 even with a guest context around', async () => {
      const authService = new AuthService()
      const clear = vi.fn()
      Object.defineProperty(authService, 'userManager', {
        value: mock<UserManager>({ getUser: vi.fn().mockResolvedValue(null) })
      })

      const router = createRouter()
      const push = vi.spyOn(router, 'push').mockResolvedValue(undefined)
      const { authStore } = initAuthService({ authService, router })
      Object.defineProperty(authService, 'publicLinkManager', { value: { clear } })
      authStore.setGuestContext('permission-id', 'share-id')
      localStorage.setItem('oc.guestPermissionId', 'permission-id')

      await authService.handleAuthError(
        {
          name: 'files-public-link',
          fullPath: '/s/token',
          meta: { authContext: 'publicLink' },
          params: { token: 'token' },
          query: {}
        } as unknown as RouteLocation,
        new DavHttpError('', undefined, undefined, 401)
      )

      expect(clear).toHaveBeenCalledWith('token')
      expect(push).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'resolvePublicLink', params: { token: 'token' } })
      )
      expect(localStorage.getItem('oc.guestPermissionId')).toEqual('permission-id')
    })
  })

  describe('user logout', () => {
    it('drops a guest record together with the user context', () => {
      const authService = new AuthService()
      const { authStore } = initAuthService({ authService, router: createRouter() })
      authStore.setGuestContext('permission-id', 'share-id')
      localStorage.setItem('oc.guestPermissionId', 'permission-id')
      Object.defineProperty(authService, 'userStore', { value: { reset: vi.fn() } })

      ;(authService as any).resetStateAfterUserLogout()

      expect(authStore.guestContextReady).toBeFalsy()
      expect(localStorage.getItem('oc.guestPermissionId')).toBeNull()
    })
  })

  describe('initializeContext with a guest session', () => {
    const getClientService = (driveItems: unknown[]) => {
      const listSharedWithMe = vi.fn().mockResolvedValue(driveItems)
      const clientService = mock<ClientService>({
        graphAuthenticated: { driveItems: { listSharedWithMe } }
      } as any)
      return { clientService, listSharedWithMe }
    }

    const guestRoute = {
      name: 'files-guest-link',
      meta: { authContext: 'anonymous' },
      params: {},
      query: {}
    } as unknown as RouteLocation

    it('restores a persisted guest session', async () => {
      localStorage.setItem('oc.guestPermissionId', 'permission-id')
      const { clientService } = getClientService([
        {
          name: 'Invited folder',
          remoteItem: { id: 'share-id', permissions: [{ id: 'permission-id' }] }
        }
      ])

      const authService = new AuthService()
      Object.defineProperty(authService, 'userManager', {
        value: mock<UserManager>({ getUser: vi.fn().mockResolvedValue(null) })
      })

      const { authStore } = initAuthService({
        authService,
        clientService,
        router: createRouter()
      })
      await authService.initializeContext(guestRoute)

      expect(authStore.guestContextReady).toBeTruthy()
      expect(authStore.guestPermissionId).toEqual('permission-id')
    })

    it('drops a persisted guest session whose share is gone', async () => {
      localStorage.setItem('oc.guestPermissionId', 'permission-id')
      const { clientService } = getClientService([])

      const authService = new AuthService()
      Object.defineProperty(authService, 'userManager', {
        value: mock<UserManager>({ getUser: vi.fn().mockResolvedValue(null) })
      })

      const { authStore } = initAuthService({
        authService,
        clientService,
        router: createRouter()
      })
      await authService.initializeContext(guestRoute)

      expect(authStore.guestContextReady).toBeFalsy()
      expect(localStorage.getItem('oc.guestPermissionId')).toBeNull()
    })

    it('restores the guest session of the permission id in the url', async () => {
      localStorage.setItem('oc.guestPermissionId', 'other-permission-id')
      const { clientService } = getClientService([
        {
          name: 'Invited folder',
          remoteItem: { id: 'share-id', permissions: [{ id: 'permission-id' }] }
        }
      ])

      const authService = new AuthService()
      Object.defineProperty(authService, 'userManager', {
        value: mock<UserManager>({ getUser: vi.fn().mockResolvedValue(null) })
      })

      const { authStore } = initAuthService({
        authService,
        clientService,
        router: createRouter()
      })
      await authService.initializeContext({
        name: 'files-guest-link',
        path: '/guest/Invited folder',
        params: { shareName: 'Invited folder' },
        meta: { authContext: 'anonymous' },
        query: { permissionId: 'permission-id' }
      } as unknown as RouteLocation)

      expect(authStore.guestPermissionId).toEqual('permission-id')
    })

    it.each(['user', 'idp'])(
      'drops a persisted guest session instead of restoring it on a %s route',
      async (authContext) => {
        localStorage.setItem('oc.guestPermissionId', 'permission-id')
        const { clientService, listSharedWithMe } = getClientService([
          {
            name: 'Invited folder',
            remoteItem: { id: 'share-id', permissions: [{ id: 'permission-id' }] }
          }
        ])

        const authService = new AuthService()
        Object.defineProperty(authService, 'userManager', {
          value: mock<UserManager>({ getUser: vi.fn().mockResolvedValue(null) })
        })

        const { authStore } = initAuthService({
          authService,
          clientService,
          router: createRouter()
        })
        await authService.initializeContext({
          meta: { authContext },
          params: {},
          query: {}
        } as unknown as RouteLocation)

        expect(listSharedWithMe).not.toHaveBeenCalled()
        expect(authStore.guestContextReady).toBeFalsy()
        expect(localStorage.getItem('oc.guestPermissionId')).toBeNull()
      }
    )

    it('drops a persisted guest session on a public link route when a user is signed in', async () => {
      localStorage.setItem('oc.guestPermissionId', 'permission-id')
      const { clientService, listSharedWithMe } = getClientService([
        {
          name: 'Invited folder',
          remoteItem: { id: 'share-id', permissions: [{ id: 'permission-id' }] }
        }
      ])

      const authService = new AuthService()
      Object.defineProperty(authService, 'userManager', {
        value: mock<UserManager>({
          getUser: vi
            .fn()
            .mockResolvedValue({ expired: false, access_token: 'token', profile: { sid: 'sid' } })
        })
      })

      const { authStore } = initAuthService({
        authService,
        clientService,
        router: createRouter()
      })
      await authService.initializeContext({
        name: 'files-public-link',
        meta: { authContext: 'publicLink' },
        params: {},
        query: {}
      } as unknown as RouteLocation)

      expect(listSharedWithMe).not.toHaveBeenCalled()
      expect(authStore.guestContextReady).toBeFalsy()
      expect(localStorage.getItem('oc.guestPermissionId')).toBeNull()
    })

    it('deactivates the guest context on a public link route but keeps the persisted session', async () => {
      localStorage.setItem('oc.guestPermissionId', 'permission-id')
      const { clientService, listSharedWithMe } = getClientService([
        {
          name: 'Invited folder',
          remoteItem: { id: 'share-id', permissions: [{ id: 'permission-id' }] }
        }
      ])

      const authService = new AuthService()
      Object.defineProperty(authService, 'userManager', {
        value: mock<UserManager>({ getUser: vi.fn().mockResolvedValue(null) })
      })

      const { authStore } = initAuthService({
        authService,
        clientService,
        router: createRouter()
      })
      authStore.setGuestContext('permission-id', 'share-id')
      await authService.initializeContext({
        name: 'files-public-link',
        meta: { authContext: 'publicLink' },
        params: {},
        query: {}
      } as unknown as RouteLocation)

      expect(listSharedWithMe).not.toHaveBeenCalled()
      expect(authStore.guestContextReady).toBeFalsy()
      expect(localStorage.getItem('oc.guestPermissionId')).toEqual('permission-id')
    })

    it('does not restore while a guest link is being resolved', async () => {
      localStorage.setItem('oc.guestPermissionId', 'permission-id')
      const { clientService, listSharedWithMe } = getClientService([])

      const authService = new AuthService()
      Object.defineProperty(authService, 'userManager', {
        value: mock<UserManager>({ getUser: vi.fn().mockResolvedValue(null) })
      })

      initAuthService({ authService, clientService, router: createRouter() })
      await authService.initializeContext(mock<RouteLocation>({ name: 'resolveGuestLink' }))

      expect(listSharedWithMe).not.toHaveBeenCalled()
    })
  })
})
