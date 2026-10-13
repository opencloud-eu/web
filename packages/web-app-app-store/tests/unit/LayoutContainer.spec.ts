import LayoutContainer from '../../src/LayoutContainer.vue'
import {
  defaultComponentMocks,
  defaultPlugins,
  mount,
  nextTicks
} from '@opencloud-eu/web-test-helpers'
import { useAppsStore } from '../../src/piniaStores'

const selectors = {
  loadingSpinner: '#app-loading-spinner',
  routerView: '[data-testid="app-store-router-view"]',
  loadingFailed: '#app-store-loading-failed'
}

describe('LayoutContainer', () => {
  it('shows a loading spinner while apps are loading from repositories', () => {
    const { wrapper } = getWrapper({ keepLoadingApps: true })
    expect(wrapper.find(selectors.loadingSpinner).exists()).toBeTruthy()
    expect(wrapper.find(selectors.routerView).exists()).toBeFalsy()
  })
  it('renders the router view when loading apps is done', async () => {
    const { wrapper } = getWrapper({})
    await nextTicks(2)
    expect(wrapper.find(selectors.loadingSpinner).exists()).toBeFalsy()
    expect(wrapper.find(selectors.routerView).exists()).toBeTruthy()
    expect(wrapper.find(selectors.loadingFailed).exists()).toBeFalsy()
  })
  it('shows an error without a retry instead of the router view when loading apps failed', async () => {
    const { wrapper } = getWrapper({ loadingFailed: true })
    await nextTicks(2)
    expect(wrapper.find(selectors.routerView).exists()).toBeFalsy()
    expect(wrapper.find(selectors.loadingFailed).exists()).toBeTruthy()
    expect(wrapper.find(`${selectors.loadingFailed} [role="alert"]`).text()).toBe(
      'The apps could not be loaded'
    )
    expect(wrapper.find(`${selectors.loadingFailed} button`).exists()).toBeFalsy()
  })
})

function getWrapper({
  keepLoadingApps,
  loadingFailed = false
}: {
  keepLoadingApps?: boolean
  loadingFailed?: boolean
}) {
  const plugins = defaultPlugins({})

  const appsStore = useAppsStore()
  appsStore.loadingFailed = loadingFailed
  const { loadApps } = appsStore
  vi.mocked(loadApps).mockReturnValue(
    new Promise((res) => {
      if (!keepLoadingApps) {
        return res()
      }
      return setTimeout(() => res(), 500)
    })
  )

  const mocks = {
    ...defaultComponentMocks(),
    loadApps
  }

  return {
    mocks,
    wrapper: mount(LayoutContainer, {
      global: {
        mocks,
        provide: mocks,
        plugins
      }
    })
  }
}
