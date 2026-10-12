import SharedWithOthers from '../../../../src/views/shares/SharedWithOthers.vue'
import { useResourcesViewDefaults } from '../../../../src/composables'
import { useResourcesViewDefaultsMock } from '../../../../tests/mocks/useResourcesViewDefaultsMock'
import { defineComponent, h, ref } from 'vue'
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
    })
  })

  it('keeps the selection on the reloaded item when a resource field gets updated', async () => {
    const paginatedResources = ref([
      mock<IncomingShareResource>({ id: 'old-id', fileId: 'file-id', shareTypes: [] })
    ])
    const selectedResourcesIds = ref<string[]>([])
    const loadResourcesTask = mockDeep<Task<any, any>>({ isRunning: false })
    getMountedWrapper({
      viewDefaults: { paginatedResources, selectedResourcesIds, loadResourcesTask }
    })
    await flushPromises()
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
    const resourcesStore = useResourcesStore()
    resourcesStore.updateResourceField({ id: 'old-id', field: 'name', value: 'foo' })
    await new Promise((resolve) => setTimeout(resolve))
    await flushPromises()

    expect(selectedResourcesIds.value).toEqual(['new-id'])
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

  vi.mocked(useResourcesViewDefaults).mockImplementation(() =>
    useResourcesViewDefaultsMock({
      paginatedResources: ref(files),
      areResourcesLoading: ref(loading),
      ...viewDefaults
    })
  )

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
