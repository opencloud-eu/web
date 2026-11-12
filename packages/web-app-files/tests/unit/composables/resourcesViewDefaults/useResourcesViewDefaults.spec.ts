import { mock } from 'vitest-mock-extended'
import { flushPromises } from '@vue/test-utils'
import { Task, useTask } from 'vue-concurrency'
import { nextTick, Ref, ref, unref } from 'vue'
import { Router } from 'vue-router'
import { IncomingShareResource, Resource } from '@opencloud-eu/web-client'
import {
  ExtensionPoint,
  FolderViewExtension,
  SortField,
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

    it('filters all resources before paginating them', () => {
      const { result } = getWrapper({
        query: { page: '1', 'items-per-page': '20' },
        resources,
        filterResources: (items) => items.filter(({ name }) => name === 'file-30')
      })

      expect(unref(result.paginatedResources).map(({ name }) => name)).toEqual(['file-30'])
      expect(unref(result.paginationPages)).toBe(1)
    })
    it('paginates the filtered resources', () => {
      const { result } = getWrapper({
        query: { page: '2', 'items-per-page': '20' },
        resources,
        filterResources: (items) => items.filter(({ name }) => name !== 'file-1')
      })

      expect(unref(result.paginatedResources).length).toBe(9)
      expect(unref(result.paginationPages)).toBe(2)
      expect(unref(result.sortedResources).length).toBe(29)
    })
  })
  describe('sortFields', () => {
    it('sorts with the given sort fields', () => {
      const sortFields: SortField[] = [
        { name: 'largest', prop: 'size', sortable: true, sortDir: SortDir.Desc }
      ]
      const { result } = getWrapper({
        query: { 'sort-by': 'largest', 'sort-dir': SortDir.Desc },
        resources: [
          { id: '1', name: 'a', type: 'file', size: 1 },
          { id: '2', name: 'b', type: 'file', size: 3 },
          { id: '3', name: 'c', type: 'file', size: 2 }
        ] as Resource[],
        sortFields
      })

      expect(unref(result.sortFields)).toEqual(sortFields)
      expect(unref(result.sortedResources).map(({ id }) => id)).toEqual(['2', '3', '1'])
    })
  })

  describe('infinite scroll mode', () => {
    const resources = Array.from(
      { length: 250 },
      (_, i) => ({ id: `${i + 1}`, name: `file-${i + 1}`, type: 'file' }) as Resource
    )
    const routes = [{ path: '/files', component: {} }]

    const mountWithRoute = async (url: string, list: Resource[] = resources) => {
      const $router = createRouter({ routes })
      await $router.push(url)
      const { wrapper, result } = getWrapper({ router: $router, resources: list })
      // let the pending navigation writes from the initial mount settle
      await flushPromises()
      return { $router, result, wrapper }
    }

    it('renders one chunk cumulatively when infinite scrolling is enabled', async () => {
      const { result } = await mountWithRoute('/files?items-per-page=∞')
      expect(unref(result.isInfiniteScrollEnabled)).toBe(true)
      expect(unref(result.paginatedResources)).toEqual(resources.slice(0, 100))
      expect(unref(result.allLoaded)).toBe(false)
    })
    it('keeps numbered pagination for numeric items per page values', async () => {
      const { result } = await mountWithRoute('/files?page=2&items-per-page=100')
      expect(unref(result.isInfiniteScrollEnabled)).toBe(false)
      expect(unref(result.paginatedResources)).toEqual(resources.slice(100, 200))
    })
    it('appends chunks via loadMore until everything is rendered', async () => {
      const { result } = await mountWithRoute('/files?items-per-page=∞')

      result.loadMore()
      expect(unref(result.paginatedResources)).toEqual(resources.slice(0, 200))

      result.loadMore()
      expect(unref(result.paginatedResources)).toEqual(resources)
      expect(unref(result.allLoaded)).toBe(true)
    })
    it('honors a legacy page param once and strips it from the url', async () => {
      const { $router, result } = await mountWithRoute('/files?page=3&items-per-page=∞')

      await flushPromises()

      expect(unref($router.currentRoute).query.page).toBeUndefined()
      expect(unref(result.paginatedResources)).toEqual(resources)
      expect(unref(result.allLoaded)).toBe(true)
    })
    it('honors a legacy page param after resources have been loaded', async () => {
      const $router = createRouter({ routes })
      await $router.push('/files?page=3&items-per-page=∞')
      const initialResources: Resource[] = []
      const { result } = getWrapper({ router: $router, resources: initialResources })
      await flushPromises()

      useResourcesStore().initResourceList({ currentFolder: null, resources })
      await nextTick()

      expect(unref(result.paginatedResources)).toEqual(resources)
      expect(unref(result.allLoaded)).toBe(true)
      expect(unref($router.currentRoute).query.page).toBeUndefined()
    })
    it('honors a legacy page param across an asynchronously changing reset key', async () => {
      const $router = createRouter({ routes })
      await $router.push('/files?page=3&items-per-page=∞')
      const infiniteScrollResetKey = ref<unknown>(undefined)
      const { result } = getWrapper({
        router: $router,
        resources: [] as Resource[],
        infiniteScrollResetKey
      })
      await flushPromises()

      useResourcesStore().initResourceList({
        currentFolder: { id: 'folder-1' } as unknown as Resource,
        resources
      })
      infiniteScrollResetKey.value = 'folder-1'
      await nextTick()

      expect(unref(result.paginatedResources)).toEqual(resources)
      expect(unref(result.allLoaded)).toBe(true)
    })
    it('honors a legacy page param for an initially empty list', async () => {
      const { $router, result } = await mountWithRoute('/files?page=3&items-per-page=∞', [])
      await flushPromises()

      expect(unref($router.currentRoute).query.page).toBeUndefined()
      expect(unref(result.paginatedResources)).toEqual([])
      expect(unref(result.allLoaded)).toBe(true)
    })
    it('strips a legacy page param of 1', async () => {
      const { $router, result } = await mountWithRoute('/files?page=1&items-per-page=∞')
      await flushPromises()

      expect(unref($router.currentRoute).query.page).toBeUndefined()
      expect(unref(result.paginatedResources)).toEqual(resources.slice(0, 100))
    })
    it('keeps the rendered items when handing over from numbered pagination', async () => {
      const { $router, result } = await mountWithRoute('/files?page=3&items-per-page=50')

      await $router.push('/files?page=3&items-per-page=∞')
      await flushPromises()

      expect(unref($router.currentRoute).query.page).toBeUndefined()
      expect(unref(result.isInfiniteScrollEnabled)).toBe(true)
      expect(unref(result.paginatedResources)).toEqual(resources.slice(0, 150))
    })
    it('writes the equivalent page back when handing over to numbered pagination', async () => {
      const { $router, result } = await mountWithRoute('/files?items-per-page=∞')

      result.loadMore()
      result.loadMore()
      expect(unref(result.paginatedResources)).toEqual(resources)

      await $router.push('/files?items-per-page=50')
      await flushPromises()

      expect(unref($router.currentRoute).query.page).toBe('5')
      expect(unref(result.paginatedResources)).toEqual(resources.slice(200, 250))
    })
    it('resets the rendered items when the reset key changes', async () => {
      const $router = createRouter({ routes })
      await $router.push('/files?items-per-page=∞')
      const infiniteScrollResetKey = ref('folder-1')
      const { result } = getWrapper({
        router: $router,
        resources,
        infiniteScrollResetKey
      })

      result.loadMore()
      expect(unref(result.paginatedResources).length).toBe(200)

      infiniteScrollResetKey.value = 'folder-2'
      await nextTick()

      expect(unref(result.paginatedResources).length).toBe(100)
    })
    it('resets the rendered items when a resetOn value changes', async () => {
      const $router = createRouter({ routes })
      await $router.push('/files?items-per-page=∞')
      const filterTerm = ref('')
      const { result } = getWrapper({
        router: $router,
        resources,
        infiniteScrollResetOn: [filterTerm]
      })

      result.loadMore()
      expect(unref(result.paginatedResources).length).toBe(200)

      filterTerm.value = 'test'
      await nextTick()

      expect(unref(result.paginatedResources).length).toBe(100)
    })
    it('resets the rendered items when any of several resetOn values changes', async () => {
      const $router = createRouter({ routes })
      await $router.push('/files?items-per-page=∞')
      const filterTerm = ref('')
      const shareType = ref('')
      const { result } = getWrapper({
        router: $router,
        resources,
        infiniteScrollResetOn: [filterTerm, shareType]
      })

      result.loadMore()
      expect(unref(result.paginatedResources).length).toBe(200)

      filterTerm.value = 'test'
      await nextTick()
      expect(unref(result.paginatedResources).length).toBe(100)

      result.loadMore()
      expect(unref(result.paginatedResources).length).toBe(200)

      shareType.value = 'user'
      await nextTick()
      expect(unref(result.paginatedResources).length).toBe(100)
    })
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
  sortFields,
  router,
  loadResourcesTask = mock<Task<unknown, unknown[]>>(),
  infiniteScrollResetKey = undefined,
  infiniteScrollResetOn = undefined
}: {
  query?: Record<string, string>
  resources?: Resource[]
  loadResourcesTask?: Task<unknown, unknown[]>
  filterResources?: (resources: Resource[]) => Resource[]
  sortFields?: SortField[]
  router?: Router
  infiniteScrollResetKey?: Ref<unknown>
  infiniteScrollResetOn?: Array<Ref<unknown>>
} = {}) {
  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ path: '/files', query })
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
        sortFields,
        infiniteScrollResetKey,
        infiniteScrollResetOn
      })
      return result
    },
    { mocks, provide: mocks, pluginOptions: { piniaOptions: { stubActions: false } } }
  )
  return { wrapper, mocks, result }
}
