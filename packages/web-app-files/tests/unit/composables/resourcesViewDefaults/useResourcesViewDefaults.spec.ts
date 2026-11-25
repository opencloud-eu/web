import { mock } from 'vitest-mock-extended'
import { flushPromises } from '@vue/test-utils'
import { Task, useTask } from 'vue-concurrency'
import { unref } from 'vue'
import { Router } from 'vue-router'
import { IncomingShareResource, Resource } from '@opencloud-eu/web-client'
import {
  ExtensionPoint,
  filesSortFields,
  FolderViewExtension,
  FolderViewModeConstants,
  SortFieldsPreset,
  useResourcesStore
} from '@opencloud-eu/web-pkg'
import { SortDir } from '@opencloud-eu/design-system/helpers'
import {
  defaultComponentMocks,
  createRouter,
  getComposableWrapper,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import { useResourcesViewDefaults } from '../../../../src/composables/resourcesViewDefaults'

describe('useResourcesViewDefaults', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  describe('scrollTo param on selection changes', () => {
    it('removes the param when a selection gets reset', async () => {
      const { mocks } = getWrapper()
      const resourcesStore = useResourcesStore()
      resourcesStore.setSelection(['1'])
      vi.mocked(mocks.$router.replace).mockClear()

      resourcesStore.resetSelection()
      await vi.waitFor(() =>
        expect(mocks.$router.replace).toHaveBeenCalledWith(
          expect.objectContaining({ query: expect.objectContaining({ scrollTo: undefined }) })
        )
      )
    })
    it('removes the param when the last selected resource gets removed from the selection', async () => {
      const { mocks } = getWrapper()
      const resourcesStore = useResourcesStore()
      resourcesStore.setSelection(['1'])
      vi.mocked(mocks.$router.replace).mockClear()

      resourcesStore.removeSelection('1')
      await vi.waitFor(() =>
        expect(mocks.$router.replace).toHaveBeenCalledWith(
          expect.objectContaining({ query: expect.objectContaining({ scrollTo: undefined }) })
        )
      )
    })
    it('removes the param when the last selected resource gets removed from the list', async () => {
      const resource = { id: '1', name: 'file.txt' } as Resource
      const { mocks } = getWrapper({ resources: [resource] })
      const resourcesStore = useResourcesStore()
      resourcesStore.setSelection(['1'])
      vi.mocked(mocks.$router.replace).mockClear()

      resourcesStore.removeResources([resource])
      resourcesStore.resetSelection()
      await vi.waitFor(() =>
        expect(mocks.$router.replace).toHaveBeenCalledWith(
          expect.objectContaining({ query: expect.objectContaining({ scrollTo: undefined }) })
        )
      )
    })
    it('keeps the param when an unselected resource gets removed from the list', async () => {
      const resources = [
        { id: '1', name: 'file.txt' },
        { id: '2', name: 'other.txt' }
      ] as Resource[]
      const { mocks } = getWrapper({ resources })
      const resourcesStore = useResourcesStore()
      resourcesStore.setSelection(['1'])

      resourcesStore.removeResources([resources[1]])
      await new Promise((resolve) => setTimeout(resolve))
      expect(mocks.$router.replace).not.toHaveBeenCalledWith(
        expect.objectContaining({ query: expect.objectContaining({ scrollTo: undefined }) })
      )
    })
    it('removes the param when another resource gets selected', async () => {
      const { mocks } = getWrapper()
      const resourcesStore = useResourcesStore()
      resourcesStore.setSelection(['1'])
      vi.mocked(mocks.$router.replace).mockClear()

      resourcesStore.setSelection(['2'])
      await vi.waitFor(() =>
        expect(mocks.$router.replace).toHaveBeenCalledWith(
          expect.objectContaining({ query: expect.objectContaining({ scrollTo: undefined }) })
        )
      )
    })
    it('keeps the param when the resource from the param gets selected', async () => {
      const { mocks } = getWrapper()
      const resourcesStore = useResourcesStore()

      resourcesStore.setSelection(['1'])
      await new Promise((resolve) => setTimeout(resolve))
      expect(mocks.$router.replace).not.toHaveBeenCalledWith(
        expect.objectContaining({ query: expect.objectContaining({ scrollTo: undefined }) })
      )
    })
    it('keeps the param when the incoming share from the param gets selected', async () => {
      const share = {
        id: 'share-id',
        remoteItemId: 'remote-item-id',
        name: 'file.txt',
        sharedWith: [],
        outgoing: false
      } as IncomingShareResource
      const { mocks } = getWrapper({ query: { scrollTo: 'remote-item-id' }, resources: [share] })
      const resourcesStore = useResourcesStore()

      resourcesStore.setSelection(['share-id'])
      await new Promise((resolve) => setTimeout(resolve))
      expect(mocks.$router.replace).not.toHaveBeenCalledWith(
        expect.objectContaining({ query: expect.objectContaining({ scrollTo: undefined }) })
      )
    })
    it('stays in the current folder when its name contains a hash', async () => {
      const $router = createRouter({
        routes: [
          { name: 'files-public-link', path: '/files/link/:driveAliasAndItem(.*)?', component: {} }
        ]
      })
      await $router.push('/files/link/public/token/Doc%23A?scrollTo=1')
      getWrapper({ router: $router })
      await flushPromises()
      const resourcesStore = useResourcesStore()
      resourcesStore.setSelection(['1'])
      const pushSpy = vi.spyOn($router, 'push')

      resourcesStore.resetSelection()
      await vi.waitFor(() => expect(unref($router.currentRoute).query.scrollTo).toBeUndefined())
      expect(unref($router.currentRoute).path).toBe('/files/link/public/token/Doc%23A')
      expect(pushSpy).not.toHaveBeenCalled()
    })
    it('keeps the param when there was no selection to reset', async () => {
      const { mocks } = getWrapper()
      const resourcesStore = useResourcesStore()

      resourcesStore.resetSelection()
      await new Promise((resolve) => setTimeout(resolve))
      expect(mocks.$router.replace).not.toHaveBeenCalledWith(
        expect.objectContaining({ query: expect.objectContaining({ scrollTo: undefined }) })
      )
    })
  })
  describe('filterResources', () => {
    const resources = Array.from(
      { length: 30 },
      (_, i) => ({ id: `${i + 1}`, name: `file-${i + 1}`, type: 'file' }) as Resource
    )

    beforeEach(() => {
      window.localStorage.setItem('oc-options_items-per-page', '20')
    })

    it('filters all resources before paginating them', () => {
      const { result } = getWrapper({
        query: { page: '1' },
        resources,
        filterResources: (items) => items.filter(({ name }) => name === 'file-30')
      })

      expect(unref(result.paginatedResources).map(({ name }) => name)).toEqual(['file-30'])
      expect(unref(result.paginationPages)).toBe(1)
    })
    it('paginates the filtered resources', () => {
      const { result } = getWrapper({
        query: { page: '2' },
        resources,
        filterResources: (items) => items.filter(({ name }) => name !== 'file-1')
      })

      expect(unref(result.paginatedResources).length).toBe(9)
      expect(unref(result.paginationPages)).toBe(2)
      expect(unref(result.sortedResources).length).toBe(29)
    })
  })
  describe('sortFields', () => {
    const sortFields: SortFieldsPreset = {
      table: [{ name: 'largest', prop: 'size', sortable: true, sortDir: SortDir.Desc }],
      tiles: [
        { label: 'Smallest', name: 'smallest', prop: 'size', sortable: true, sortDir: SortDir.Asc }
      ]
    }
    const resources = [
      { id: '1', name: 'a', type: 'file', size: 1 },
      { id: '2', name: 'b', type: 'file', size: 3 },
      { id: '3', name: 'c', type: 'file', size: 2 }
    ] as Resource[]

    it('sorts with the table fields of the view in the table view mode', () => {
      window.localStorage.setItem('oc-options_view-mode', FolderViewModeConstants.name.table)
      const { result } = getWrapper({ resources, sortFields })

      expect(unref(result.sortFields)).toEqual(sortFields.table)
      expect(unref(result.sortedResources).map(({ id }) => id)).toEqual(['2', '3', '1'])
    })
    it('sorts with the tiles fields of the view in the tiles view mode', () => {
      window.localStorage.setItem('oc-options_view-mode', FolderViewModeConstants.name.tiles)
      const { result } = getWrapper({ resources, sortFields })

      expect(unref(result.sortFields)).toEqual(sortFields.tiles)
      expect(unref(result.sortedResources).map(({ id }) => id)).toEqual(['1', '3', '2'])
    })
    it.each([FolderViewModeConstants.name.table, FolderViewModeConstants.name.tiles])(
      'keeps the fields of the view if a space comes first (%s)',
      (viewMode) => {
        window.localStorage.setItem('oc-options_view-mode', viewMode)
        window.localStorage.setItem('oc-options_files-common-favorites_sort-by', 'size')
        window.localStorage.setItem('oc-options_files-common-favorites_sort-dir', 'desc')
        const { result } = getWrapper({
          routeName: 'files-common-favorites',
          resources: [
            { id: 'space', name: 'space', type: 'space', size: 2 },
            { id: 'small', name: 'small', type: 'file', size: 1 },
            { id: 'large', name: 'large', type: 'file', size: 3 }
          ] as Resource[],
          sortFields: filesSortFields
        })

        expect(unref(result.sortBy)).toBe('size')
        expect(unref(result.sortedResources).map(({ id }) => id)).toEqual([
          'large',
          'space',
          'small'
        ])
      }
    )
  })

  describe('loadResources', () => {
    it('resolves when the load gets canceled by a newer one', async () => {
      const loadResourcesTask = useTask(function* () {
        yield new Promise(() => undefined)
      }).restartable()
      const { result } = getWrapper({ loadResourcesTask })

      const olderLoad = result.loadResources()
      result.loadResources()

      await expect(olderLoad).resolves.toBeUndefined()
    })

    it('rejects when the load fails', async () => {
      const loadResourcesTask = useTask(function* () {
        yield Promise.reject(new Error('load failed'))
      })
      const { result } = getWrapper({ loadResourcesTask })

      await expect(result.loadResources()).rejects.toThrow('load failed')
    })
  })
})

function getWrapper({
  query = { scrollTo: '1' },
  resources = [],
  filterResources,
  sortFields = filesSortFields,
  routeName,
  router,
  loadResourcesTask = mock<Task<unknown, unknown[]>>()
}: {
  query?: Record<string, string>
  resources?: Resource[]
  loadResourcesTask?: Task<unknown, unknown[]>
  filterResources?: (resources: Resource[]) => Resource[]
  sortFields?: SortFieldsPreset
  routeName?: string
  router?: Router
} = {}) {
  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ path: '/files', query, name: routeName })
    }),
    ...(router && { $router: router })
  }
  let result: ReturnType<typeof useResourcesViewDefaults>
  const wrapper = getComposableWrapper(
    () => {
      useResourcesStore().initResourceList({ currentFolder: null, resources })
      result = useResourcesViewDefaults({
        folderViewExtensionPoint: mock<ExtensionPoint<FolderViewExtension>>(),
        loadResourcesTask,
        filterResources,
        sortFields
      })
      return result
    },
    { mocks, provide: mocks, pluginOptions: { piniaOptions: { stubActions: false } } }
  )
  return { wrapper, mocks, result }
}
