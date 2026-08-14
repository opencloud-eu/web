import Favorites from '../../../src/views/Favorites.vue'
import { useResourcesViewDefaults } from '../../../src/composables'
import { useResourcesViewDefaultsMock } from '../../../tests/mocks/useResourcesViewDefaultsMock'
import { defineComponent, h, ref } from 'vue'
import { mockDeep, mock } from 'vitest-mock-extended'
import { Resource } from '@opencloud-eu/web-client'
import {
  defaultPlugins,
  defaultStubs,
  mount,
  defaultComponentMocks
} from '@opencloud-eu/web-test-helpers'
import { RouteLocation } from 'vue-router'
import { AppBar, ItemFilter, useRouteQuery } from '@opencloud-eu/web-pkg'
import { Capabilities } from '@opencloud-eu/web-client/ocs'

vi.mock('../../../src/composables')
vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useFileActions: () => ({ triggerDefaultAction: vi.fn() }),
  useRouteQuery: vi.fn()
}))

const AppBarStub = defineComponent({
  props: AppBar.props,
  setup(_, { slots }) {
    return () => h('app-bar-stub', {}, [slots.actions?.()])
  }
})

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
    it('shows default empty-state text when no filter is active', () => {
      const { wrapper } = getMountedWrapper()
      expect((wrapper.vm as any).emptyStateDescription).toBe('All your favorites will show up here')
    })
    it('shows refine hint in empty-state when a filter is active', () => {
      const { wrapper } = getMountedWrapper({
        lastModifiedParam: ref('today')
      })
      expect((wrapper.vm as any).emptyStateDescription).toBe(
        'Try refining the search term or filters to get results'
      )
    })
  })
  describe('filter', () => {
    it('does not show filter if no values are available', () => {
      const { wrapper } = getMountedWrapper()
      expect(wrapper.find('.files-favorites-filter').exists()).toBeFalsy()
    })
    it('shows available last modified values from capabilities', () => {
      const { wrapper } = getMountedWrapper({
        capabilities: {
          search: {
            property: {
              mtime: { keywords: ['today', 'last week'] }
            }
          }
        }
      })

      const filterItems = wrapper
        .findComponent<typeof ItemFilter>('.files-favorites-filter-last-modified')
        .props('items')

      expect(wrapper.find('.files-favorites-filter-last-modified').exists()).toBeTruthy()
      expect(filterItems).toEqual([
        { id: 'today', label: 'today' },
        { id: 'last week', label: 'last week' }
      ])
    })
    it('shows available media types from capabilities and ignores unknown values', () => {
      const { wrapper } = getMountedWrapper({
        capabilities: {
          search: {
            property: {
              mediatype: { keywords: ['image', 'folder', 'unknown'] }
            }
          }
        }
      })

      const mediaTypeFilter = wrapper
        .findAllComponents<typeof ItemFilter>('item-filter-stub')
        .find((component) => component.props('filterName') === 'mediaType')

      expect(wrapper.find('.files-favorites-filter').exists()).toBeTruthy()
      expect(mediaTypeFilter).toBeDefined()
      expect(mediaTypeFilter.props('items')).toEqual([
        { id: 'image', label: 'Image', icon: 'jpg' },
        { id: 'folder', label: 'Folder', icon: 'folder' }
      ])
    })
    it('loads resources again when filter query changes', async () => {
      const lastModifiedParam = ref<string | null>(null)
      const { resourcesViewDefaults } = getMountedWrapper({
        lastModifiedParam
      })

      expect(resourcesViewDefaults.loadResourcesTask.perform).toHaveBeenCalledTimes(1)

      lastModifiedParam.value = 'today'
      await Promise.resolve()

      expect(resourcesViewDefaults.loadResourcesTask.perform).toHaveBeenCalledTimes(2)
    })
  })
})

function getMountedWrapper({
  mocks = {},
  files = [],
  loading = false,
  capabilities = {},
  lastModifiedParam = ref<string | null>(null),
  mediaTypeParam = ref<string | null>(null)
}: {
  mocks?: Record<string, unknown>
  files?: Resource[]
  loading?: boolean
  capabilities?: Partial<Capabilities['capabilities']>
  lastModifiedParam?: ReturnType<typeof ref<string | null>>
  mediaTypeParam?: ReturnType<typeof ref<string | null>>
} = {}) {
  const plugins = defaultPlugins({ piniaOptions: { capabilityState: { capabilities } } })

  vi.mocked(useRouteQuery).mockImplementationOnce(() => lastModifiedParam)
  vi.mocked(useRouteQuery).mockImplementationOnce(() => mediaTypeParam)

  const resourcesViewDefaults = useResourcesViewDefaultsMock({
    paginatedResources: ref(files),
    areResourcesLoading: ref(loading)
  })

  vi.mocked(useResourcesViewDefaults).mockImplementation(() => {
    return resourcesViewDefaults
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
        stubs: {
          ...defaultStubs,
          'app-bar': AppBarStub,
          ItemFilter: true
        }
      }
    }),
    resourcesViewDefaults
  }
}
