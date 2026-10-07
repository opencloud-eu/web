import Extensions from '../../../src/views/Extensions.vue'
import ExtensionsList from '../../../src/components/Extensions/ExtensionsList.vue'
import { nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { defaultPlugins, mount, useAppDefaultsMock } from '@opencloud-eu/web-test-helpers'
import { useAppDefaults, useAppsStore, useConfigStore } from '@opencloud-eu/web-pkg'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useAppDefaults: vi.fn(),
  useRouteQueryPersisted: vi.fn()
}))
vi.mocked(useAppDefaults).mockImplementation(() => useAppDefaultsMock())

describe('Extensions view', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows no-content message when no extensions are available', async () => {
    const { wrapper } = getWrapper({ externalApps: [] })
    await nextTick()
    expect(wrapper.find('no-content-message-stub').exists()).toBeTruthy()
    expect(wrapper.find('extensions-list-stub').exists()).toBeFalsy()
  })

  it('shows extensions list when extensions are available', async () => {
    const { wrapper } = getWrapper({
      externalApps: [{ id: 'files', path: 'web-app-files', version: '1.0.0' }],
      apps: {
        files: {
          id: 'files',
          name: 'Files'
        }
      }
    })

    await nextTick()
    expect(wrapper.find('extensions-list-stub').exists()).toBeTruthy()
    expect(wrapper.find('no-content-message-stub').exists()).toBeFalsy()
  })

  it('passes the extensions including their version and status to the list', async () => {
    const { wrapper } = getWrapper({
      externalApps: [
        { id: 'files', path: 'web-app-files', version: '1.0.0' },
        { id: 'broken', path: 'web-app-broken' }
      ],
      apps: { files: { id: 'files', name: 'Files' } },
      appLoadingFailure: { broken: true }
    })

    await flushPromises()
    expect(wrapper.findComponent(ExtensionsList).props('extensions')).toEqual([
      expect.objectContaining({ name: 'Files', version: '1.0.0', status: 'active' }),
      expect.objectContaining({ name: 'broken', version: undefined, status: 'failed' })
    ])
  })

  it('adds the version constraints from the app store and marks incompatible apps', async () => {
    const { wrapper } = getWrapper({
      externalApps: [
        { id: 'draw-io', path: 'draw-io', version: '2.1.0' },
        { id: 'maps', path: 'maps', version: '3.1.1' }
      ],
      appStoreApps: [
        {
          id: 'com.github.opencloud-eu.web-extensions.draw-io',
          versions: [{ version: '2.1.0', minOpenCloud: '6.0.0', maxOpenCloud: '7.5.0' }]
        },
        {
          id: 'com.github.opencloud-eu.web-extensions.maps',
          versions: [{ version: '3.1.1', minOpenCloud: '6.0.0' }]
        }
      ]
    })

    await flushPromises()
    expect(wrapper.findComponent(ExtensionsList).props('extensions')).toEqual([
      expect.objectContaining({
        name: 'draw-io',
        minOpenCloud: '6.0.0',
        maxOpenCloud: '7.5.0',
        status: 'incompatible',
        loaded: true
      }),
      expect.objectContaining({ name: 'maps', minOpenCloud: '6.0.0', status: 'active' })
    ])
    expect(wrapper.findComponent(ExtensionsList).props('serverVersion')).toBe('8.0.0')
  })

  it('marks failed apps as incompatible if the version constraints are not fulfilled', async () => {
    const { wrapper } = getWrapper({
      externalApps: [{ id: 'draw-io', path: 'draw-io', version: '2.1.0' }],
      appLoadingFailure: { 'draw-io': true },
      appStoreApps: [
        {
          id: 'com.github.opencloud-eu.web-extensions.draw-io',
          versions: [{ version: '2.1.0', minOpenCloud: '6.0.0', maxOpenCloud: '7.5.0' }]
        }
      ]
    })

    await flushPromises()
    expect(wrapper.findComponent(ExtensionsList).props('extensions')).toEqual([
      expect.objectContaining({ name: 'draw-io', status: 'incompatible', loaded: false })
    ])
  })

  it('uses the app store name for apps that failed to load', async () => {
    const { wrapper } = getWrapper({
      externalApps: [{ id: 'draw-io', path: 'draw-io', version: '2.2.0' }],
      appLoadingFailure: { 'draw-io': true },
      appStoreApps: [
        {
          id: 'com.github.opencloud-eu.web-extensions.draw-io',
          name: 'Draw.io',
          versions: [{ version: '2.2.0', minOpenCloud: '6.0.0' }]
        }
      ]
    })

    await flushPromises()
    expect(wrapper.findComponent(ExtensionsList).props('extensions')).toEqual([
      expect.objectContaining({ name: 'Draw.io', status: 'failed' })
    ])
  })

  it('shows an error when the app store apps could not be loaded', async () => {
    const { wrapper } = getWrapper({
      externalApps: [{ id: 'draw-io', path: 'draw-io', version: '2.1.0' }],
      fetchError: true
    })

    await flushPromises()
    expect(wrapper.find('.extensions-compatibility-error').exists()).toBeTruthy()
    expect(wrapper.findComponent(ExtensionsList).props('extensions')).toEqual([
      expect.objectContaining({ name: 'draw-io', status: 'active' })
    ])
  })

  it('passes the compatibility loading state to the list', async () => {
    const { wrapper } = getWrapper({
      externalApps: [{ id: 'draw-io', path: 'draw-io', version: '2.1.0' }]
    })

    await nextTick()
    expect(wrapper.findComponent(ExtensionsList).props('loadingCompatibility')).toBe(true)
    await flushPromises()
    expect(wrapper.findComponent(ExtensionsList).props('loadingCompatibility')).toBe(false)
  })

  it('does not show an error when the app store apps were loaded', async () => {
    const { wrapper } = getWrapper({
      externalApps: [{ id: 'draw-io', path: 'draw-io', version: '2.1.0' }]
    })

    await flushPromises()
    expect(wrapper.find('.extensions-compatibility-error').exists()).toBeFalsy()
  })
})

function getWrapper({
  externalApps = [],
  apps = {},
  appLoadingFailure = {},
  appStoreApps = [],
  fetchError = false
}: {
  externalApps?: Array<{ id: string; path: string; version?: string }>
  apps?: Record<string, { id?: string; name?: string }>
  appLoadingFailure?: Record<string, unknown>
  appStoreApps?: unknown[]
  fetchError?: boolean
} = {}) {
  const fetchMock = fetchError
    ? vi.fn().mockRejectedValue(new Error('CSP violation'))
    : vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ apps: appStoreApps })
      })
  vi.stubGlobal('fetch', fetchMock)

  const wrapper = mount(Extensions, {
    global: {
      plugins: [
        ...defaultPlugins({
          piniaOptions: {
            capabilityState: { capabilities: { core: { status: { productversion: '8.0.0' } } } }
          }
        })
      ],
      stubs: {
        AppLoadingSpinner: true,
        OcSearchBar: true,
        NoContentMessage: true,
        ExtensionsList: true,
        OcIcon: true
      }
    }
  })

  const configStore = useConfigStore()
  configStore.externalApps = externalApps as any

  const appsStore = useAppsStore()
  appsStore.apps = apps as any
  appsStore.appLoadingFailure = appLoadingFailure as any

  return {
    wrapper
  }
}
