import {
  RouteLocation,
  defaultComponentMocks,
  defaultPlugins,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import oidcCallback from '../../../src/pages/oidcCallback.vue'
import { authService } from '../../../src/services/auth'
import { mock } from 'vitest-mock-extended'
import { computed } from 'vue'

const mockUseEmbedMode = vi.fn()

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useRoute: vi.fn().mockReturnValue({ query: {} }),
  useEmbedMode: vi.fn().mockImplementation(() => mockUseEmbedMode())
}))

const postMessageMock = vi.fn()
console.debug = vi.fn()

describe('oidcCallback page', () => {
  const parentWindow = {} as Window
  let wrapper: ReturnType<typeof getWrapper>['wrapper']

  beforeEach(() => {
    vi.spyOn(window, 'parent', 'get').mockReturnValue(parentWindow)
  })
  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    vi.restoreAllMocks()
  })

  function mountDelegated({ verifyOrigin = true }: { verifyOrigin?: boolean } = {}) {
    const verifyDelegatedAuthenticationOrigin = vi.fn().mockReturnValue(verifyOrigin)
    mockUseEmbedMode.mockReturnValue({
      isDelegatingAuthentication: computed(() => true),
      postMessage: postMessageMock,
      verifyDelegatedAuthenticationOrigin
    })

    const signInCallbackSpy = vi
      .spyOn(authService, 'signInCallback')
      .mockImplementation(() => Promise.resolve())

    wrapper = getWrapper().wrapper

    return { signInCallbackSpy, verifyDelegatedAuthenticationOrigin }
  }

  describe('delegated authentication', () => {
    it('when authentication is delegated does not call signInCallback immediately', () => {
      const { signInCallbackSpy } = mountDelegated()

      expect(signInCallbackSpy).not.toHaveBeenCalled()
    })

    it('when authentication is not delegated calls signInCallback immediately', () => {
      mockUseEmbedMode.mockReturnValue({
        isDelegatingAuthentication: computed(() => false),
        verifyDelegatedAuthenticationOrigin: vi.fn().mockReturnValue(true)
      })

      const signInCallbackSpy = vi
        .spyOn(authService, 'signInCallback')
        .mockImplementation(() => Promise.resolve())

      wrapper = getWrapper().wrapper

      expect(signInCallbackSpy).toHaveBeenCalled()
    })

    it('when authentication is delegated calls postMessage with token request event', () => {
      mountDelegated()

      expect(postMessageMock).toHaveBeenCalledWith('opencloud-embed:request-token')
    })

    it('when token update event is received calls signInCallback', () => {
      const { signInCallbackSpy } = mountDelegated()

      dispatchTokenMessage({
        source: parentWindow,
        data: { access_token: 'access-token', session_id: 'session-id' }
      })

      expect(signInCallbackSpy).toHaveBeenCalledWith('access-token', 'session-id')
    })

    it.each([
      ['a different window', {}],
      ['no window', null]
    ])('when token update event is sent by %s does not call signInCallback', (_, source) => {
      const { signInCallbackSpy } = mountDelegated()

      dispatchTokenMessage({ source, data: { access_token: 'forged-token' } })

      expect(signInCallbackSpy).not.toHaveBeenCalled()
    })

    it('when the app is not embedded does not accept a token update event', () => {
      vi.spyOn(window, 'parent', 'get').mockReturnValue(window)
      const { signInCallbackSpy } = mountDelegated()

      dispatchTokenMessage({ source: window, data: { access_token: 'forged-token' } })

      expect(signInCallbackSpy).not.toHaveBeenCalled()
    })

    it('when token update event comes from an unexpected origin does not call signInCallback', () => {
      const { signInCallbackSpy, verifyDelegatedAuthenticationOrigin } = mountDelegated({
        verifyOrigin: false
      })

      dispatchTokenMessage({
        source: parentWindow,
        origin: 'https://attacker.example',
        data: { access_token: 'forged-token' }
      })

      expect(verifyDelegatedAuthenticationOrigin).toHaveBeenCalledWith('https://attacker.example')
      expect(signInCallbackSpy).not.toHaveBeenCalled()
    })

    it('when token update event is received but name is incorrect does not call signInCallback', () => {
      const { signInCallbackSpy } = mountDelegated()

      dispatchTokenMessage({
        source: parentWindow,
        name: 'update-token',
        data: { access_token: 'access-token' }
      })

      expect(signInCallbackSpy).not.toHaveBeenCalled()
    })
  })
})

function dispatchTokenMessage({
  source,
  origin = 'https://host.example',
  name = 'opencloud-embed:update-token',
  data
}: {
  source: unknown
  origin?: string
  name?: string
  data: Record<string, string>
}) {
  const event = new MessageEvent('message', { origin, data: { name, data } })
  Object.defineProperty(event, 'source', { value: source })
  window.dispatchEvent(event)
}

function getWrapper() {
  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ query: {} })
    })
  }

  return {
    wrapper: shallowMount(oidcCallback, {
      global: {
        plugins: [
          ...defaultPlugins({
            piniaOptions: { configState: { server: 'http://server/address/' } }
          })
        ],
        mocks,
        provide: {}
      }
    })
  }
}
