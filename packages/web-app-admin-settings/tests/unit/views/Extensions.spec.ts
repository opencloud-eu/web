import Extensions from '../../../src/views/Extensions.vue'
import { defaultPlugins, mount, useAppDefaultsMock } from '@opencloud-eu/web-test-helpers'
import { useAppDefaults, useAppsStore, useConfigStore } from '@opencloud-eu/web-pkg'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useAppDefaults: vi.fn(),
  useRouteQueryPersisted: vi.fn()
}))
vi.mocked(useAppDefaults).mockImplementation(() => useAppDefaultsMock())

describe('Extensions view', () => {
  it('shows no-content message when no extensions are available', async () => {
    const { wrapper } = getWrapper({ externalApps: [] })
    await wrapper.vm.$nextTick()
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

    await wrapper.vm.$nextTick()
    expect(wrapper.find('extensions-list-stub').exists()).toBeTruthy()
    expect(wrapper.find('no-content-message-stub').exists()).toBeFalsy()
  })
})

function getWrapper({
  externalApps = [],
  apps = {}
}: {
  externalApps?: Array<{ id: string; path: string; version?: string }>
  apps?: Record<string, { id?: string; name?: string }>
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

  return {
    wrapper
  }
}
