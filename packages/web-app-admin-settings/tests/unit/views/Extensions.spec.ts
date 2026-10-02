import Extensions from '../../../src/views/Extensions.vue'
import ExtensionsList from '../../../src/components/Extensions/ExtensionsList.vue'
import { nextTick, ref } from 'vue'
import { defaultPlugins, mount, useAppDefaultsMock } from '@opencloud-eu/web-test-helpers'
import { useAppDefaults, useAppsStore, useConfigStore } from '@opencloud-eu/web-pkg'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useAppDefaults: vi.fn(),
  useRouteQueryPersisted: vi.fn(),
  useRouteQueryFilterTerm: vi.fn(() => ref(''))
}))
vi.mocked(useAppDefaults).mockImplementation(() => useAppDefaultsMock())

describe('Extensions view', () => {
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

  it('passes the extensions including their version and loading state to the list', async () => {
    const { wrapper } = getWrapper({
      externalApps: [
        { id: 'files', path: 'web-app-files', version: '1.0.0' },
        { id: 'broken', path: 'web-app-broken' }
      ],
      apps: { files: { id: 'files', name: 'Files' } },
      appLoadingFailure: { broken: true }
    })

    await nextTick()
    expect(wrapper.findComponent(ExtensionsList).props('extensions')).toEqual([
      expect.objectContaining({ name: 'Files', version: '1.0.0', loaded: true }),
      expect.objectContaining({ name: 'broken', version: undefined, loaded: false })
    ])
  })
})

function getWrapper({
  externalApps = [],
  apps = {},
  appLoadingFailure = {}
}: {
  externalApps?: Array<{ id: string; path: string; version?: string }>
  apps?: Record<string, { id?: string; name?: string }>
  appLoadingFailure?: Record<string, unknown>
} = {}) {
  const wrapper = mount(Extensions, {
    global: {
      plugins: [...defaultPlugins()],
      stubs: {
        AppLoadingSpinner: true,
        OcSearchBar: true,
        NoContentMessage: true,
        ExtensionsList: true
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
