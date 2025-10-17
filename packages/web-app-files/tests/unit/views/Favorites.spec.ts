import Favorites from '../../../src/views/Favorites.vue'
import { useResourcesViewDefaults } from '../../../src/composables'
import { useResourcesViewDefaultsMock } from '../../../tests/mocks/useResourcesViewDefaultsMock'
import { ref } from 'vue'
import { mockDeep, mock } from 'vitest-mock-extended'
import { Resource } from '@opencloud-eu/web-client'
import {
  defaultPlugins,
  defaultStubs,
  mount,
  defaultComponentMocks
} from '@opencloud-eu/web-test-helpers'
import { RouteLocation } from 'vue-router'

vi.mock('../../../src/composables')
vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useFileActions: vi.fn()
}))

describe('Favorites view', () => {
  it('appBar always present', () => {
    const { wrapper } = getMountedWrapper()
    expect(wrapper.find('app-bar-stub').exists()).toBeTruthy()
  })
  it('sideBar always present', () => {
    const { wrapper } = getMountedWrapper()
    expect(wrapper.find('file-side-bar-stub').exists()).toBeTruthy()
  })
  describe('different files view states', () => {
    it('shows the loading spinner during loading', () => {
      const { wrapper } = getMountedWrapper({ loading: true })
      expect(wrapper.find('oc-spinner-stub').exists()).toBeTruthy()
    })
    it('shows the no-content-message after loading', () => {
      const { wrapper } = getMountedWrapper()
      expect(wrapper.find('oc-spinner-stub').exists()).toBeFalsy()
      expect(wrapper.find('.no-content-message').exists()).toBeTruthy()
    })
    it('shows the files table when files are available', () => {
      const { wrapper } = getMountedWrapper({ files: [mockDeep<Resource>()] })
      expect(wrapper.find('.no-content-message').exists()).toBeFalsy()
      expect(wrapper.find('resource-table-stub').exists()).toBeTruthy()
    })
  })
})

function getMountedWrapper({
  mocks = {},
  files = [],
  loading = false
}: { mocks?: Record<string, unknown>; files?: Resource[]; loading?: boolean } = {}) {
  const plugins = defaultPlugins()

  vi.mocked(useResourcesViewDefaults).mockImplementation(() => {
    return useResourcesViewDefaultsMock({
      paginatedResources: ref(files),
      areResourcesLoading: ref(loading)
    })
  })

  const defaultMocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files-common-favorites' })
    }),
    ...(mocks && mocks)
  }

  return {
    wrapper: mount(Favorites, {
      global: {
        plugins,
        mocks: defaultMocks,
        provide: defaultMocks,
        stubs: defaultStubs
      }
    })
  }
}
