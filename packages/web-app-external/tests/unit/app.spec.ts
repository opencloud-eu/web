import { mock } from 'vitest-mock-extended'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import {
  AppProviderService,
  RequestResult,
  useRequest,
  useRoute,
  WebThemeType
} from '@opencloud-eu/web-pkg'
import { computed } from 'vue'

import { Resource } from '@opencloud-eu/web-client'
import App from '../../src/App.vue'
import { RouteLocation } from 'vue-router'
import { flushPromises } from '@vue/test-utils'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useRequest: vi.fn(),
  useRoute: vi.fn()
}))

const appUrl = 'https://example.test/d12ab86/loe009157-MzBw'

const providerSuccessResponsePost = {
  app_url: appUrl,
  method: 'POST',
  form_parameters: {
    access_token: 'asdfsadfsadf',
    access_token_ttl: '123456'
  }
}

const providerSuccessResponseGet = {
  app_url: appUrl,
  method: 'GET'
}

describe('The app provider extension', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('should fail for unauthenticated users', async () => {
    const makeRequest = vi.fn().mockResolvedValue({
      ok: true,
      status: 401,
      message: 'Login Required'
    })
    const { wrapper } = createShallowMountWrapper({ makeRequest })
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect(wrapper.html()).toMatchSnapshot()
  })
  it('should be able to load an iFrame via get', async () => {
    const makeRequest = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      data: providerSuccessResponseGet
    })

    const { wrapper } = createShallowMountWrapper({ makeRequest })
    await flushPromises()
    expect(wrapper.html()).toMatchSnapshot()
  })
  it('should be able to load an iFrame via post', async () => {
    const makeRequest = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      data: providerSuccessResponsePost
    })
    const { wrapper } = createShallowMountWrapper({ makeRequest })
    await flushPromises()
    expect(wrapper.html()).toMatchSnapshot()
  })
  describe('collabora', () => {
    it.each([
      { isDark: false, expected: 'light' },
      { isDark: true, expected: 'dark' }
    ])('should set the current theme as default', async ({ isDark, expected }) => {
      const makeRequest = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        data: providerSuccessResponsePost
      })
      const { wrapper } = createShallowMountWrapper({ makeRequest, appName: 'collabora', isDark })
      await flushPromises()
      const uiDefaultsInput = wrapper.find('input[name="ui_defaults"]')

      expect(uiDefaultsInput.attributes('value')).toBe(`UITheme=${expected}`)
    })
  })
})

function createShallowMountWrapper({
  makeRequest = vi.fn().mockResolvedValue({ status: 200 }),
  appName = 'example-app',
  isDark = false
}: {
  makeRequest?: RequestResult['makeRequest']
  appName?: string
  isDark?: boolean
} = {}) {
  vi.mocked(useRequest).mockImplementation(() => ({
    makeRequest
  }))
  vi.mocked(useRoute).mockImplementation(() =>
    computed(() => mock<RouteLocation>({ name: `external-${appName}` }))
  )
  const mocks = {
    ...defaultComponentMocks(),
    $appProviderService: mock<AppProviderService>({ appNames: [appName] })
  }

  const capabilities = {
    files: {
      app_providers: [{ apps_url: '/app/list', enabled: true, open_url: '/app/open' }]
    }
  }

  const currentTheme = mock<WebThemeType>()
  currentTheme.isDark = isDark

  return {
    wrapper: shallowMount(App, {
      props: {
        space: null,
        resource: mock<Resource>(),
        isReadOnly: false
      },
      global: {
        plugins: [
          ...defaultPlugins({
            piniaOptions: {
              capabilityState: { capabilities },
              configState: { options: { editor: { openAsPreview: true } } },
              themeState: { currentTheme }
            }
          })
        ],
        provide: mocks,
        mocks
      }
    })
  }
}
