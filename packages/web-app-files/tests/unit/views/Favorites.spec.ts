import Favorites from '../../../src/views/Favorites.vue'
import { useResourcesViewDefaults } from '../../../src/composables'
import { useResourcesViewDefaultsMock } from '../../../tests/mocks/useResourcesViewDefaultsMock'
import { defineComponent, h, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mockDeep, mock } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import {
  defaultPlugins,
  defaultStubs,
  mount,
  defaultComponentMocks
} from '@opencloud-eu/web-test-helpers'
import { RouteLocation } from 'vue-router'
import {
  AppBar,
  filesSortFields,
  ItemFilter,
  ResourceTable,
  useRouteQuery
} from '@opencloud-eu/web-pkg'
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
  it('sorts with the files sort fields', () => {
    getMountedWrapper()
    expect(useResourcesViewDefaults).toHaveBeenLastCalledWith(
      expect.objectContaining({ sortFields: filesSortFields })
    )
  })
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
    it('shows the favorites empty message when no filter is active', () => {
      const { wrapper } = getMountedWrapper()
      expect(wrapper.find('#files-favorites-empty').text()).toContain(
        'Nothing marked as favorite, yet'
      )
    })
    it.each([
      { name: 'last modified', filter: { lastModifiedParam: ref('today') } },
      { name: 'media type', filter: { mediaTypeParam: ref('image') } },
      { name: 'tags', filter: { tagParam: ref('work') } }
    ])('shows "No favorites found" when the $name filter matches nothing', ({ filter }) => {
      const { wrapper } = getMountedWrapper(filter)
      const message = wrapper.find('#files-favorites-empty').text()
      expect(message).toContain('No favorites found')
      expect(message).not.toContain('Nothing marked as favorite, yet')
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
  describe('resource table', () => {
    function getTableColumns(files: Resource[]) {
      const { wrapper } = getMountedWrapper({ files, stubTable: false })
      return wrapper
        .findAll('th')
        .map((th) => th.classes().find((c) => c.startsWith('oc-table-header-cell-')))
    }

    it('shows the file columns', () => {
      const file = getTableResource({ id: 'file1', name: 'file.txt', type: 'file' })
      expect(getTableColumns([file])).toEqual(
        expect.arrayContaining([
          'oc-table-header-cell-name',
          'oc-table-header-cell-indicators',
          'oc-table-header-cell-size',
          'oc-table-header-cell-mdate'
        ])
      )
    })
    it('makes the rows draggable but folder rows no drop targets', async () => {
      const file = getTableResource({ id: 'file1', name: 'file.txt', type: 'file' })
      const folder = getTableResource({ id: 'folder1', name: 'Folder', type: 'folder' })
      const { wrapper } = getMountedWrapper({ files: [file, folder], stubTable: false })
      const table = wrapper.findComponent(ResourceTable)
      expect(table.props('isDraggable')).toBe(true)
      expect(table.props('dragDrop')).toBe(false)

      const rows = wrapper.findAll('.oc-tbody-tr')
      expect(rows.map((row) => row.attributes('draggable'))).toEqual(['true', 'true'])

      await rows[1].trigger('drop', { dataTransfer: { types: [] } })
      expect(table.emitted('fileDropped')).toBeUndefined()
    })
    it('does not add space columns for a favorite project space', () => {
      const file = getTableResource({ id: 'file1', name: 'file.txt', type: 'file' })
      const space = {
        ...getTableResource({ id: 'space1', name: 'Space', type: 'space' }),
        driveType: 'project',
        spaceQuota: { total: 10, used: 1, remaining: 9 }
      } as unknown as SpaceResource
      expect(getTableColumns([file, space])).toEqual(getTableColumns([file]))
    })
  })
  describe('scrollTo', () => {
    it('finds the resource to scroll to beyond the current page', async () => {
      const files = Array.from({ length: 25 }, (_, i) => mock<Resource>({ id: `${i + 1}` }))
      const { resourcesViewDefaults } = getMountedWrapper({ files })
      await flushPromises()

      const [resources] = vi.mocked(resourcesViewDefaults.scrollToResourceFromRoute).mock.calls[0]
      expect(resources).toContain(files[24])
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
    it('shows a tag filter with the available tags sorted if tags are supported', async () => {
      const { wrapper, mocks } = getMountedWrapper({
        capabilities: { files: { tags: true } } as Partial<Capabilities['capabilities']>,
        tags: ['Zebra', 'work', 'private']
      })
      await flushPromises()

      const tagFilter = wrapper
        .findAllComponents<typeof ItemFilter>('item-filter-stub')
        .find((component) => component.props('filterName') === 'tags')

      expect(mocks.$clientService.graphAuthenticated.tags.listTags).toHaveBeenCalled()
      expect(tagFilter.props('items')).toEqual([
        { id: 'private', label: 'private' },
        { id: 'work', label: 'work' },
        { id: 'Zebra', label: 'Zebra' }
      ])
    })
    it('shows the tag filter with a hint if no tags exist yet', async () => {
      const { wrapper } = getMountedWrapper({
        capabilities: { files: { tags: true } } as Partial<Capabilities['capabilities']>,
        tags: []
      })
      await flushPromises()

      const tagFilter = wrapper
        .findAllComponents<typeof ItemFilter>('item-filter-stub')
        .find((component) => component.props('filterName') === 'tags')

      expect(tagFilter.props('items')).toEqual([])
      expect(tagFilter.props('noItemsMessage')).toBeTruthy()
    })
    it('does not load tags if tags are not supported', async () => {
      const { wrapper, mocks } = getMountedWrapper({
        capabilities: { files: { tags: false } } as Partial<Capabilities['capabilities']>,
        tags: ['work']
      })
      await flushPromises()

      const tagFilter = wrapper
        .findAllComponents<typeof ItemFilter>('item-filter-stub')
        .find((component) => component.props('filterName') === 'tags')

      expect(mocks.$clientService.graphAuthenticated.tags.listTags).not.toHaveBeenCalled()
      expect(tagFilter).toBeUndefined()
    })
    it('loads resources again when the tag filter changes', async () => {
      const tagParam = ref<string | null>(null)
      const { resourcesViewDefaults } = getMountedWrapper({ tagParam })

      tagParam.value = 'work'
      await Promise.resolve()

      expect(resourcesViewDefaults.loadResourcesTask.perform).toHaveBeenCalledTimes(2)
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

function getTableResource(resource: Partial<Resource>): Resource {
  return {
    path: `/${resource.name}`,
    size: 5,
    mdate: 'Mon, 1 Jan 2024 10:00:00 GMT',
    tags: [],
    starred: true,
    isFolder: false,
    getDomSelector: () => resource.id,
    canDownload: () => true,
    canRename: () => false,
    canBeDeleted: () => false,
    isReceivedShare: () => false,
    isMounted: () => false,
    ...resource
  } as Resource
}

function getMountedWrapper({
  mocks = {},
  files = [],
  loading = false,
  capabilities = {},
  lastModifiedParam = ref<string | null>(null),
  mediaTypeParam = ref<string | null>(null),
  tagParam = ref<string | null>(null),
  tags = [],
  stubTable = true
}: {
  mocks?: Record<string, unknown>
  files?: Resource[]
  loading?: boolean
  capabilities?: Partial<Capabilities['capabilities']>
  lastModifiedParam?: ReturnType<typeof ref<string | null>>
  mediaTypeParam?: ReturnType<typeof ref<string | null>>
  tagParam?: ReturnType<typeof ref<string | null>>
  tags?: string[]
  stubTable?: boolean
} = {}) {
  const plugins = defaultPlugins({ piniaOptions: { capabilityState: { capabilities } } })

  vi.mocked(useRouteQuery).mockImplementationOnce(() => lastModifiedParam)
  vi.mocked(useRouteQuery).mockImplementationOnce(() => mediaTypeParam)
  vi.mocked(useRouteQuery).mockImplementationOnce(() => tagParam)

  const resourcesViewDefaults = useResourcesViewDefaultsMock({
    // like the real view defaults: all resources get sorted, only the first page is shown
    sortedResources: ref(files),
    paginatedResources: ref(files.slice(0, 20)),
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
  defaultMocks.$clientService.graphAuthenticated.tags.listTags.mockReset()
  defaultMocks.$clientService.graphAuthenticated.tags.listTags.mockResolvedValue(tags)

  return {
    wrapper: mount(Favorites, {
      global: {
        plugins,
        mocks: defaultMocks,
        provide: defaultMocks,
        stubs: {
          ...defaultStubs,
          'app-bar': AppBarStub,
          ItemFilter: true,
          'resource-table': stubTable
        }
      }
    }),
    mocks: defaultMocks,
    resourcesViewDefaults
  }
}
