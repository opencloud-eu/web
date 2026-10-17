import SharedWithOthers from '../../../../src/views/shares/SharedWithOthers.vue'
import { useResourcesViewDefaults } from '../../../../src/composables'
import { useResourcesViewDefaultsMock } from '../../../../tests/mocks/useResourcesViewDefaultsMock'
import { computed, unref, defineComponent, h, ref } from 'vue'
import { defaultStubs, RouteLocation } from '@opencloud-eu/web-test-helpers'
import { mock, mockDeep } from 'vitest-mock-extended'
import { Task, TaskInstance } from 'vue-concurrency'
import { flushPromises } from '@vue/test-utils'
import { IncomingShareResource } from '@opencloud-eu/web-client'
import { defaultPlugins, mount, defaultComponentMocks } from '@opencloud-eu/web-test-helpers'
import { ShareTypes } from '@opencloud-eu/web-client'
import { useSortMock } from '../../../mocks/useSortMock'
import { AppBar, ResourceTable, useResourcesStore } from '@opencloud-eu/web-pkg'

vi.mock('../../../../src/composables')
vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useSort: vi.fn().mockImplementation(() => useSortMock()),
  queryItemAsString: vi.fn(),
  useRouteQuery: vi.fn(),
  useFileActions: () => ({ triggerDefaultAction: vi.fn() })
}))

const AppBarStub = defineComponent({
  props: AppBar.props,
  setup(_, { slots }) {
    return () => h('app-bar-stub', {}, [slots.actions?.()])
  }
})

describe('SharedWithOthers view', () => {
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
      expect(wrapper.find('#app-loading-spinner').exists()).toBeTruthy()
    })
    it('shows the no-content-message after loading', () => {
      const { wrapper } = getMountedWrapper()
      expect(wrapper.find('#app-loading-spinner').exists()).toBeFalsy()
      expect(wrapper.find('.no-content-message').exists()).toBeTruthy()
    })
    it('shows the files table when files are available', () => {
      const mockedFiles = [
        mockDeep<IncomingShareResource>({ shareTypes: [ShareTypes.user.value] }),
        mockDeep<IncomingShareResource>({ shareTypes: [ShareTypes.user.value] })
      ]
      const { wrapper } = getMountedWrapper({ files: mockedFiles })
      expect(wrapper.find('.no-content-message').exists()).toBeFalsy()
      expect(wrapper.find('resource-table-stub').exists()).toBeTruthy()
      expect(
        wrapper.findComponent<typeof ResourceTable>('resource-table-stub').props().resources.length
      ).toEqual(mockedFiles.length)
    })
  })
  describe('filter', () => {
    describe('share type', () => {
      it('shows filter if multiple share types are present', () => {
        const { wrapper } = getMountedWrapper({
          files: [
            mock<IncomingShareResource>({ shareTypes: [ShareTypes.user.value] }),
            mock<IncomingShareResource>({ shareTypes: [ShareTypes.group.value] })
          ]
        })
        expect(wrapper.find('.share-type-filter').exists()).toBeTruthy()
      })
      it('does not show filter if only one share type is present', () => {
        const { wrapper } = getMountedWrapper({
          files: [mock<IncomingShareResource>({ shareTypes: [ShareTypes.user.value] })]
        })
        expect(wrapper.find('.share-type-filter').exists()).toBeFalsy()
      })
      it('offers the share types of shares beyond the current page', () => {
        const files = Array.from({ length: 30 }, (_, i) =>
          mock<IncomingShareResource>({
            shareTypes: [i === 29 ? ShareTypes.group.value : ShareTypes.user.value]
          })
        )
        const { wrapper } = getMountedWrapper({ files })
        expect(wrapper.find('.share-type-filter').exists()).toBeTruthy()
      })
    })
    describe('search', () => {
      it('finds shares beyond the current page', async () => {
        const files = Array.from({ length: 30 }, (_, i) =>
          mock<IncomingShareResource>({
            id: `${i + 1}`,
            name: `share-${i + 1}`,
            shareTypes: [ShareTypes.user.value]
          })
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
  })

  describe('resource field updates', () => {
    async function setup() {
      const paginatedResources = ref([
        mock<IncomingShareResource>({ id: 'old-id', fileId: 'file-id', shareTypes: [] })
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
              mock<IncomingShareResource>({ id: 'new-id', fileId: 'file-id', shareTypes: [] })
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
        mock<IncomingShareResource>({
          id: `${i + 1}`,
          name: `share-${i + 1}`,
          shareTypes: [ShareTypes.user.value]
        })
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
  viewDefaults = {}
}: {
  mocks?: Record<string, unknown>
  files?: IncomingShareResource[]
  loading?: boolean
  viewDefaults?: Partial<ReturnType<typeof useResourcesViewDefaults>>
} = {}) {
  const plugins = [...defaultPlugins({ piniaOptions: { stubActions: false } })]

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

  const defaultMocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files-shares-with-others' })
    }),
    ...(mocks && mocks)
  }

  return {
    mocks: defaultMocks,
    wrapper: mount(SharedWithOthers, {
      global: {
        plugins,
        mocks: defaultMocks,
        provide: defaultMocks,
        stubs: { ...defaultStubs, 'app-bar': AppBarStub, ItemFilter: true, AppLoadingSpinner: true }
      }
    })
  }
}
