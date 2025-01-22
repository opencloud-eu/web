import CreateShortcutModal from '../../../src/components/CreateShortcutModal.vue'
import {
  defaultComponentMocks,
  defaultPlugins,
  mockAxiosReject,
  RouteLocation,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import { SpaceResource } from '@opencloud-eu/web-client'
import { mock } from 'vitest-mock-extended'
import { FileResource } from '@opencloud-eu/web-client'
import { SearchResource } from '@opencloud-eu/web-client'
import { useMessages, useResourcesStore } from '../../../src/composables/piniaStores'

describe('CreateShortcutModal', () => {
  describe('method "onConfirm"', () => {
    it('should show message on success', async () => {
      const { wrapper } = getWrapper()
      await wrapper.vm.onConfirm()

      const { upsertResource } = useResourcesStore()
      expect(upsertResource).toHaveBeenCalled()
      const { showMessage } = useMessages()
      expect(showMessage).toHaveBeenCalled()
    })
    it('should show error message on fail', async () => {
      console.error = vi.fn()
      const { wrapper } = getWrapper({ rejectPutFileContents: true })
      await wrapper.vm.onConfirm()

      const { upsertResource } = useResourcesStore()
      expect(upsertResource).not.toHaveBeenCalled()
      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalled()
    })
  })
  describe('method "searchTask"', () => {
    it('should set "searchResult" correctly', async () => {
      const { wrapper } = getWrapper()
      await wrapper.vm.searchTask.perform('new file')
      expect(wrapper.vm.searchResult.values.length).toBe(3)
    })
    it('should reset "searchResult" on error', async () => {
      console.error = vi.fn()
      const { wrapper } = getWrapper({ rejectSearch: true })
      await wrapper.vm.searchTask.perform('new folder')
      expect(wrapper.vm.searchResult).toBe(null)
    })
  })
})

function getWrapper({ rejectPutFileContents = false, rejectSearch = false } = {}) {
  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files-spaces-generic' })
    })
  }

  if (rejectPutFileContents) {
    mocks.$clientService.webdav.putFileContents.mockRejectedValue(() => mockAxiosReject())
  } else {
    mocks.$clientService.webdav.putFileContents.mockResolvedValue(mock<FileResource>())
  }

  if (rejectSearch) {
    mocks.$clientService.webdav.search.mockRejectedValue(() => mockAxiosReject())
  } else {
    mocks.$clientService.webdav.search.mockResolvedValue({
      resources: [
        mock<SearchResource>({ name: 'New File' }),
        mock<SearchResource>({ name: 'New File (1)' }),
        mock<SearchResource>({ name: 'New Folder' })
      ],
      totalResults: 3
    })
  }

  return {
    mocks,
    wrapper: shallowMount(CreateShortcutModal, {
      props: {
        space: mock<SpaceResource>(),
        modal: undefined
      },
      global: {
        plugins: [
          ...defaultPlugins({
            piniaOptions: { resourcesStore: { currentFolder: mock<FileResource>() } }
          })
        ],
        mocks,
        provide: mocks
      }
    })
  }
}
