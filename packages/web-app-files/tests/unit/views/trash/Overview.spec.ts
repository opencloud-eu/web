import TrashOverview from '../../../../src/views/trash/Overview.vue'
import { folderViewsTrashOverviewExtensionPoint } from '../../../../src/extensionPoints'
import {
  defaultComponentMocks,
  defaultPlugins,
  defaultStubs,
  mount,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { nextTick } from 'vue'
import { SpaceResource } from '@opencloud-eu/web-client'
import {
  eventBus,
  FolderViewExtension,
  ResourceTable,
  ResourceTiles,
  useExtensionRegistry
} from '@opencloud-eu/web-pkg'
import { SortDir } from '@opencloud-eu/design-system/helpers'
import { flushPromises } from '@vue/test-utils'

const spaceMocks = [
  {
    id: '1',
    storageId: '1',
    name: 'Personal',
    path: '',
    type: 'space',
    isFolder: true,
    disabled: false,
    driveType: 'personal',
    getDriveAliasAndItem: () => '1',
    getDomSelector: () => '1',
    isOwner: () => true,
    hasTrashedItems: true
  },
  {
    id: '2',
    storageId: '2',
    name: 'Project space 1',
    path: '',
    type: 'space',
    isFolder: true,
    disabled: false,
    driveType: 'project',
    getDriveAliasAndItem: () => '2',
    getDomSelector: () => '2',
    isOwner: () => false,
    hasTrashedItems: true
  },
  {
    id: '3',
    storageId: '3',
    name: 'Project space 2',
    path: '',
    type: 'space',
    isFolder: true,
    disabled: false,
    driveType: 'project',
    getDriveAliasAndItem: () => '3',
    getDomSelector: () => '3',
    isOwner: () => false,
    hasTrashedItems: true
  }
] as unknown as SpaceResource[]

describe('TrashOverview', () => {
  it('should render no content message if no spaces exist', async () => {
    const { wrapper } = getWrapper({ spaces: [] })
    await flushPromises()
    expect(wrapper.find('no-content-message-stub').exists()).toBeTruthy()
  })
  it('should navigate to single space trash if only one space exists', async () => {
    const { mocks } = getWrapper({ spaces: [spaceMocks[0]] })
    await flushPromises()
    expect(mocks.$router.push).toHaveBeenCalledWith({
      name: 'files-trash-generic',
      params: { driveAliasAndItem: spaceMocks[0].getDriveAliasAndItem(undefined) },
      query: { fileId: spaceMocks[0].fileId }
    })
  })
  describe('view states', () => {
    it('shows the loading spinner during loading', async () => {
      const { wrapper } = getWrapper()
      await nextTick()
      expect(wrapper.find('oc-spinner-stub').exists()).toBeTruthy()
    })
    it('should render trash list', async () => {
      const { wrapper } = getWrapper()
      await flushPromises()
      expect(wrapper.html()).toMatchSnapshot()
    })
  })
  describe('sorting', () => {
    it.each([
      { sortDir: SortDir.Asc, expected: ['1', '2', '3'] },
      { sortDir: SortDir.Desc, expected: ['1', '3', '2'] }
    ])('keeps the personal space on top when sorting $sortDir', async ({ sortDir, expected }) => {
      const spaces = [spaceMocks[2], spaceMocks[0], spaceMocks[1]]
      const { wrapper } = getWrapper({ spaces, query: { 'sort-by': 'name', 'sort-dir': sortDir } })
      await flushPromises()
      expect(getRenderedIds(wrapper)).toEqual(expected)
    })
    it.each([
      { sortDir: SortDir.Asc, expected: ['1', '3', '2'] },
      { sortDir: SortDir.Desc, expected: ['1', '2', '3'] }
    ])(
      'sorts by deleted items $sortDir with the personal space on top',
      async ({ sortDir, expected }) => {
        const spaces = [
          { ...spaceMocks[1], hasTrashedItems: false },
          spaceMocks[0],
          spaceMocks[2]
        ] as SpaceResource[]
        const { wrapper } = getWrapper({
          spaces,
          query: { 'sort-by': 'indicators', 'sort-dir': sortDir }
        })
        await flushPromises()
        expect(getRenderedIds(wrapper)).toEqual(expected)
      }
    )
    it('offers only the name sort in the tiles view', async () => {
      const { wrapper } = getWrapper({ query: { 'view-mode': 'resource-tiles' } })
      await flushPromises()
      const sortFields = wrapper.findComponent(ResourceTiles).props('sortFields')
      expect(sortFields.map(({ label }) => label)).toEqual(['A-Z', 'Z-A'])
    })
    it('sorts names numerically', async () => {
      const spaces = [
        { ...spaceMocks[1], id: '10', name: 'Project space 10' },
        { ...spaceMocks[1], id: '2', name: 'Project space 2' }
      ] as SpaceResource[]
      const { wrapper } = getWrapper({ spaces })
      await flushPromises()
      expect(getRenderedIds(wrapper)).toEqual(['2', '10'])
    })
  })
  it('switches only once to the page of a space that is on another page', async () => {
    const spaces = Array.from({ length: 130 }, (_, i) => {
      const id = String(i + 1).padStart(3, '0')
      return { ...spaceMocks[1], id, name: `Project space ${id}` }
    }) as SpaceResource[]
    const { mocks } = getWrapper({ spaces })
    await flushPromises()
    mocks.$router.push.mockClear()
    mocks.$router.push.mockReturnValue(new Promise(() => undefined))

    eventBus.publish('app.files.navigate.page', {
      resourceId: '121',
      forceScroll: true,
      topbarElement: 'files-app-bar'
    })

    expect(mocks.$router.push).toHaveBeenCalledTimes(1)
    expect(mocks.$router.push).toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.objectContaining({ page: 2 }) })
    )
  })
  describe('indicators', () => {
    const intersectionObserver = window.IntersectionObserver

    beforeEach(() => {
      // table rows only render their content once observed as visible, which never happens in jsdom
      delete (window as any).IntersectionObserver
    })

    afterEach(() => {
      window.IntersectionObserver = intersectionObserver
    })

    it('shows the trashed items indicator for spaces that have trashed items', async () => {
      const { wrapper } = getWrapper({ stubResourceTable: false })
      await flushPromises()
      expect(
        wrapper.findAll('[data-test-indicator-type="resource-space-has-trashed-items"]').length
      ).toEqual(spaceMocks.length)
    })
    it('does not show the trashed items indicator for spaces without trashed items', async () => {
      const spaces = spaceMocks.map((space) => ({ ...space, hasTrashedItems: false }))
      const { wrapper } = getWrapper({
        spaces: spaces as unknown as SpaceResource[],
        stubResourceTable: false
      })
      await flushPromises()
      expect(wrapper.findAll('.oc-tbody-tr').length).toEqual(spaceMocks.length)
      expect(
        wrapper.find('[data-test-indicator-type="resource-space-has-trashed-items"]').exists()
      ).toBeFalsy()
    })
    it('does not show the space enabled and disabled indicators', async () => {
      const { wrapper } = getWrapper({ stubResourceTable: false })
      await flushPromises()
      expect(
        wrapper.find('[data-test-indicator-type="resource-space-enabled"]').exists()
      ).toBeFalsy()
      expect(
        wrapper.find('[data-test-indicator-type="resource-space-disabled"]').exists()
      ).toBeFalsy()
    })
  })
  describe('filtering', () => {
    it('shows only filtered spaces if filter applied', async () => {
      const { wrapper } = getWrapper()
      await flushPromises()
      ;(wrapper.vm as any).filterTerm = 'Personal'
      await nextTick()
      expect(getRenderedIds(wrapper)).toEqual([spaceMocks[0].id])
    })
    it.each([
      { areEmptyTrashesShown: true, expected: ['1', '2', '3'] },
      { areEmptyTrashesShown: false, expected: ['1', '3'] }
    ])(
      'shows empty trash bins: $areEmptyTrashesShown',
      async ({ areEmptyTrashesShown, expected }) => {
        const spaces = [spaceMocks[0], { ...spaceMocks[1], hasTrashedItems: false }, spaceMocks[2]]
        const { wrapper } = getWrapper({ spaces, areEmptyTrashesShown })
        await flushPromises()
        expect(getRenderedIds(wrapper)).toEqual(expected)
      }
    )
  })
})

function getRenderedIds(wrapper: ReturnType<typeof getWrapper>['wrapper']) {
  const resources = wrapper.findComponent(ResourceTable).props('resources') as SpaceResource[]
  return resources.map(({ id }) => id)
}

function getWrapper({
  spaces = spaceMocks,
  stubResourceTable = true,
  areEmptyTrashesShown = true,
  query = {}
}: {
  spaces?: SpaceResource[]
  stubResourceTable?: boolean
  areEmptyTrashesShown?: boolean
  query?: Record<string, string>
} = {}) {
  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({
        name: 'trash-overview',
        query: {
          'view-mode': 'resource-table',
          'tiles-size': '1',
          'sort-by': 'name',
          'sort-dir': 'asc',
          ...query
        }
      })
    })
  }

  const plugins = [
    ...defaultPlugins({
      piniaOptions: {
        spacesState: { spaces },
        resourcesStore: { resources: spaces, areEmptyTrashesShown }
      }
    })
  ]

  const viewMode = query['view-mode'] || 'resource-table'
  const extensions = [
    {
      id: `com.github.opencloud-eu.web.files.folder-view.${viewMode}`,
      type: 'folderView',
      extensionPointIds: [folderViewsTrashOverviewExtensionPoint.id],
      folderView: {
        name: viewMode,
        label: 'Switch view',
        icon: { name: 'menu-line', fillType: 'none' },
        component: viewMode === 'resource-tiles' ? ResourceTiles : ResourceTable
      }
    }
  ] satisfies FolderViewExtension[]
  const { requestExtensions } = useExtensionRegistry()
  vi.mocked(requestExtensions).mockImplementation((extensionPoint) =>
    extensions.filter((e) => e.type === extensionPoint.extensionType)
  )

  mocks.$clientService.graphAuthenticated.drives.listMyDrives.mockResolvedValue(spaceMocks)

  return {
    mocks,
    wrapper: mount(TrashOverview, {
      global: {
        stubs: {
          ...defaultStubs,
          NoContentMessage: true,
          'resource-tiles': true,
          ...(!stubResourceTable && { 'resource-table': false, 'trash-quick-actions': true })
        },
        mocks,
        provide: mocks,
        plugins
      }
    })
  }
}
