import { ref } from 'vue'
import { Router, RouterHistory } from 'vue-router'
import { RouterLinkStub } from '@vue/test-utils'
import { mock } from 'vitest-mock-extended'
import { useRouteParam, useRouter } from '@opencloud-eu/web-pkg'
import {
  defaultComponentMocks,
  defaultPlugins,
  mount,
  writable
} from '@opencloud-eu/web-test-helpers'
import AppDetails from '../../../src/views/AppDetails.vue'
import AppDetailsHeader from '../../../src/components/AppDetailsHeader.vue'
import { useAppsStore } from '../../../src/piniaStores'
import { App } from '../../../src/types'
import { APPID } from '../../../src/appid'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useRouteParam: vi.fn(),
  useRouter: vi.fn()
}))

const app: App = {
  ...mock<App>(),
  id: 'com.example.app',
  name: 'Example',
  subtitle: 'An example app',
  description: undefined,
  authors: [],
  tags: ['viewer'],
  resources: [],
  screenshots: [],
  coverImage: undefined,
  badge: undefined,
  versions: [{ version: '1.0.0', url: 'https://example.com/app.zip' }],
  mostRecentVersion: { version: '1.0.0', url: 'https://example.com/app.zip' }
}

const selectors = {
  notFound: '#app-store-app-not-found',
  details: '.app-details',
  title: '.app-details-title',
  description: '.app-details-description'
}

describe('AppDetails', () => {
  it('shows a message if the app does not exist', () => {
    const { wrapper } = getWrapper(undefined)
    expect(wrapper.find(selectors.notFound).exists()).toBeTruthy()
    expect(wrapper.find(selectors.details).exists()).toBeFalsy()
  })
  it('renders the details of the app from the route', () => {
    const { wrapper, getById } = getWrapper(app)
    expect(getById).toHaveBeenCalledWith('com.example.app')
    expect(wrapper.find(selectors.title).text()).toBe('Example')
  })
  it('falls back to the subtitle if the app has no description', () => {
    const { wrapper } = getWrapper(app)
    expect(wrapper.find(selectors.description).text()).toContain('An example app')
  })
  describe('back link', () => {
    it('returns to the previous list including its filters', () => {
      const { wrapper, mocks } = getWrapper(app, {
        back: '/app-store/list?q_tag=viewer',
        resolvedRouteName: `${APPID}-list`
      })
      expect(mocks.$router.resolve).toHaveBeenCalledWith('/app-store/list?q_tag=viewer')
      expect(wrapper.findComponent(RouterLinkStub).props('to')).toBe('/app-store/list?q_tag=viewer')
    })
    it('falls back to the unfiltered list if the previous page was no list', () => {
      const { wrapper } = getWrapper(app, {
        back: '/files/spaces/personal',
        resolvedRouteName: 'files-spaces-generic'
      })
      expect(wrapper.findComponent(RouterLinkStub).props('to')).toEqual({
        name: `${APPID}-list`
      })
    })
  })
  it('navigates to the filtered list on tag click', async () => {
    const { wrapper, mocks } = getWrapper(app)
    await wrapper.findComponent(AppDetailsHeader).vm.$emit('tagClick', 'viewer')
    expect(mocks.$router.push).toHaveBeenCalledWith({
      name: `${APPID}-list`,
      query: { q_tag: 'viewer' }
    })
  })
})

function getWrapper(
  resolvedApp: App | undefined,
  { back = null, resolvedRouteName = '' }: { back?: string; resolvedRouteName?: string } = {}
) {
  const mocks = defaultComponentMocks()
  writable(mocks.$router).options = mock<Router['options']>({
    history: mock<RouterHistory>({ state: { back } })
  })
  mocks.$router.resolve.mockReturnValue(
    mock<ReturnType<typeof mocks.$router.resolve>>({ name: resolvedRouteName })
  )
  vi.mocked(useRouter).mockReturnValue(mocks.$router)
  vi.mocked(useRouteParam).mockReturnValue(ref(encodeURIComponent('com.example.app')))

  const plugins = defaultPlugins()
  const { getById } = useAppsStore()
  vi.mocked(getById).mockReturnValue(resolvedApp)

  return {
    mocks,
    getById,
    wrapper: mount(AppDetails, {
      global: { plugins, mocks, provide: mocks, stubs: { RouterLink: RouterLinkStub } }
    })
  }
}
