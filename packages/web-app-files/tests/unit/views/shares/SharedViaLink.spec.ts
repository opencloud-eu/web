import SharedViaLink from '../../../../src/views/shares/SharedViaLink.vue'
import { useResourcesViewDefaults } from '../../../../src/composables'
import { useResourcesViewDefaultsMock } from '../../../../tests/mocks/useResourcesViewDefaultsMock'
import { ref } from 'vue'
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
})

function getMountedWrapper({
  mocks = {},
  files = [],
  loading = false,
  viewDefaults = {}
}: {
  mocks?: Record<string, unknown>
  files?: OutgoingShareResource[]
  loading?: boolean
  viewDefaults?: Partial<ReturnType<typeof useResourcesViewDefaults>>
} = {}) {
  const plugins = [...defaultPlugins({ piniaOptions: { stubActions: false } })]

  const defaultMocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files-shares-via-link' })
    }),
    ...(mocks && mocks)
  }

  vi.mocked(useResourcesViewDefaults).mockImplementation(() =>
    useResourcesViewDefaultsMock({
      paginatedResources: ref(files),
      areResourcesLoading: ref(loading),
      ...viewDefaults
    })
  )

  return {
    mocks: defaultMocks,
    wrapper: mount(SharedViaLink, {
      global: {
        plugins,
        mocks: defaultMocks,
        provide: defaultMocks,
        stubs: defaultStubs
      }
    })
  }
}
