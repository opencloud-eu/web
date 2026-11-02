import { mock } from 'vitest-mock-extended'
import { flushPromises } from '@vue/test-utils'
import { Task } from 'vue-concurrency'
import { unref } from 'vue'
import { Router } from 'vue-router'
import { IncomingShareResource, Resource } from '@opencloud-eu/web-client'
import { ExtensionPoint, FolderViewExtension, useResourcesStore } from '@opencloud-eu/web-pkg'
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
})

function getWrapper({
  query = { scrollTo: '1' },
  resources = [],
  filterResources,
  router
}: {
  query?: Record<string, string>
  resources?: Resource[]
  filterResources?: (resources: Resource[]) => Resource[]
  router?: Router
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
        loadResourcesTask: mock<Task<unknown, unknown[]>>(),
        filterResources
      })
      return result
    },
    { mocks, provide: mocks, pluginOptions: { piniaOptions: { stubActions: false } } }
  )
  return { wrapper, mocks, result }
}
