import SharedViaLink from '../../../../src/views/shares/SharedViaLink.vue'
import { useResourcesViewDefaults } from '../../../../src/composables'
import { useResourcesViewDefaultsMock } from '../../../../tests/mocks/useResourcesViewDefaultsMock'
import { computed, unref, ref } from 'vue'
import { mock, mockDeep } from 'vitest-mock-extended'
import { Task, TaskInstance } from 'vue-concurrency'
import { flushPromises } from '@vue/test-utils'
import { OutgoingShareResource } from '@opencloud-eu/web-client'
import {
  defaultPlugins,
  mount,
  defaultComponentMocks,
  defaultStubs,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import { ResourceTable, useResourcesStore } from '@opencloud-eu/web-pkg'

vi.mock('../../../../src/composables')
vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useFileActions: () => ({ triggerDefaultAction: vi.fn() })
}))

describe('SharedViaLink view', () => {
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
    it('shows "Nothing shared, yet" when there are no shares', () => {
      const { wrapper } = getMountedWrapper()
      expect(wrapper.find('#files-shared-via-link-empty').text()).toContain('Nothing shared, yet')
      expect(wrapper.find('#files-shared-via-link-no-results').exists()).toBeFalsy()
    })
    it('asks to refine the search when shares exist but none matches', async () => {
      const { wrapper } = getMountedWrapper({
        files: [mock<OutgoingShareResource>({ name: 'share1' })]
      })
      ;(wrapper.vm as any).filterTerm = 'nomatch'
      await wrapper.vm.$nextTick()

      const message = wrapper.find('#files-shared-via-link-no-results')
      expect(message.text()).toContain('No shares found')
      expect(message.text()).toContain('Try refining the search term or filters to get results')
      expect(wrapper.find('#files-shared-via-link-empty').exists()).toBeFalsy()
    })
    it('shows the files table when files are available', () => {
      const mockedFiles = [mockDeep<OutgoingShareResource>(), mockDeep<OutgoingShareResource>()]
      const { wrapper } = getMountedWrapper({ files: mockedFiles })
      expect(wrapper.find('.no-content-message').exists()).toBeFalsy()
      expect(wrapper.find('resource-table-stub').exists()).toBeTruthy()
      expect(
        wrapper.findComponent<typeof ResourceTable>('resource-table-stub').props().resources.length
      ).toEqual(mockedFiles.length)
    })
  })

  describe('search', () => {
    it('finds shares beyond the current page', async () => {
      const files = Array.from({ length: 30 }, (_, i) =>
        mock<OutgoingShareResource>({ id: `${i + 1}`, name: `share-${i + 1}` })
      )
      const { wrapper } = getMountedWrapper({ files })
      ;(wrapper.vm as any).filterTerm = 'share-25'
      await wrapper.vm.$nextTick()

      const resources = wrapper
        .findComponent<typeof ResourceTable>('resource-table-stub')
        .props('resources')
      expect(resources.find(({ name }) => name === 'share-25')).toBeDefined()
    })
    it('resets the pagination to the first page', async () => {
      const { wrapper, mocks } = getMountedWrapper()
      ;(wrapper.vm as any).filterTerm = 'share'
      await flushPromises()

      expect(mocks.$router.push).toHaveBeenCalledWith(
        expect.objectContaining({ query: expect.objectContaining({ page: '1' }) })
      )
    })
  })

  describe('selection', () => {
    it('deselects the resources a filter hides, also when it hides all of them', async () => {
      const files = [mock<OutgoingShareResource>({ id: '1', name: 'file.txt' })]
      const { wrapper } = getMountedWrapper({ files, stubAppBar: false })
      const resourcesStore = useResourcesStore()
      resourcesStore.setSelection(['1'])

      await wrapper.find('.search-filter input').setValue('no match')

      expect(wrapper.find('.no-content-message').exists()).toBeTruthy()
      expect(resourcesStore.selectedIds).toEqual([])
    })
  })

  describe('resource field updates', () => {
    async function setup() {
      const paginatedResources = ref([
        mock<OutgoingShareResource>({ id: 'old-id', fileId: 'file-id' })
      ])
      const selectedResourcesIds = ref<string[]>([])
      const loadResourcesTask = mockDeep<Task<any, any>>({ isRunning: false })
      getMountedWrapper({
        viewDefaults: { paginatedResources, selectedResourcesIds, loadResourcesTask }
      })
      await flushPromises()
      loadResourcesTask.perform.mockClear()
      selectedResourcesIds.value = ['old-id']

      loadResourcesTask.perform.mockImplementation(() => {
        // the loaders clear the list and the selection before refilling it
        selectedResourcesIds.value = []
        paginatedResources.value = []
        return new Promise((resolve) => {
          setTimeout(() => {
            paginatedResources.value = [
              mock<OutgoingShareResource>({ id: 'new-id', fileId: 'file-id' })
            ]
            resolve(undefined)
          })
        }) as unknown as TaskInstance<any>
      })
      return { selectedResourcesIds, loadResourcesTask, resourcesStore: useResourcesStore() }
    }

    it('reloads and keeps the selection on the reloaded item when the share types change', async () => {
      const { selectedResourcesIds, loadResourcesTask, resourcesStore } = await setup()
      resourcesStore.updateResourceField({ id: 'old-id', field: 'shareTypes', value: [3] })
      await new Promise((resolve) => setTimeout(resolve))
      await flushPromises()

      expect(loadResourcesTask.perform).toHaveBeenCalledTimes(1)
      expect(selectedResourcesIds.value).toEqual(['new-id'])
    })

    it('does not reload when another field like the thumbnail changes', async () => {
      const { selectedResourcesIds, loadResourcesTask, resourcesStore } = await setup()
      resourcesStore.updateResourceField({ id: 'old-id', field: 'thumbnail', value: 'blob:foo' })
      await flushPromises()

      expect(loadResourcesTask.perform).not.toHaveBeenCalled()
      expect(selectedResourcesIds.value).toEqual(['old-id'])
    })
  })
  describe('scrollTo', () => {
    it('finds the resource to scroll to beyond the current page', async () => {
      const files = Array.from({ length: 30 }, (_, i) =>
        mock<OutgoingShareResource>({ id: `${i + 1}`, name: `share-${i + 1}` })
      )
      const scrollToResourceFromRoute = vi.fn()
      getMountedWrapper({ files, viewDefaults: { scrollToResourceFromRoute } })
      await flushPromises()

      const [resources] = scrollToResourceFromRoute.mock.calls[0]
      expect(resources).toContain(files[29])
    })
  })
})

function getMountedWrapper({
  mocks = {},
  files = [],
  loading = false,
  viewDefaults = {},
  stubAppBar = true
}: {
  mocks?: Record<string, unknown>
  files?: OutgoingShareResource[]
  loading?: boolean
  viewDefaults?: Partial<ReturnType<typeof useResourcesViewDefaults>>
  stubAppBar?: boolean
} = {}) {
  const plugins = [...defaultPlugins({ piniaOptions: { stubActions: false } })]

  const defaultMocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files-shares-via-link' })
    }),
    ...(mocks && mocks)
  }

  vi.mocked(useResourcesViewDefaults).mockImplementation(({ filterResources }) => {
    // like the real view defaults: filter all resources, then paginate them
    const sortedResources = computed(() => (filterResources ? filterResources(files) : files))
    return useResourcesViewDefaultsMock({
      storeItems: ref(files),
      sortedResources,
      paginatedResources: computed(() => unref(sortedResources).slice(0, 20)),
      areResourcesLoading: ref(loading),
      ...viewDefaults
    })
  })

  return {
    mocks: defaultMocks,
    wrapper: mount(SharedViaLink, {
      global: {
        plugins,
        mocks: defaultMocks,
        provide: defaultMocks,
        stubs: { ...defaultStubs, 'app-bar': stubAppBar }
      }
    })
  }
}
