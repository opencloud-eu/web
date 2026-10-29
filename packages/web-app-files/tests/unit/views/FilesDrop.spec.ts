import FilesDrop from '../../../src/views/FilesDrop.vue'
import {
  defaultPlugins,
  mount,
  defaultComponentMocks,
  defaultStubs,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import { flushPromises } from '@vue/test-utils'
import { mock, mockDeep } from 'vitest-mock-extended'
import { ClientService } from '@opencloud-eu/web-pkg'
import { ListFilesResult } from '@opencloud-eu/web-client/webdav'

describe('FilesDrop view', () => {
  describe('different files view states', () => {
    it('shows the loading spinner during loading', () => {
      const { wrapper } = getMountedWrapper()
      expect(wrapper.find('app-loading-spinner').exists()).toBeTruthy()
    })
    it('shows the "resource-upload"-component after loading', async () => {
      const { wrapper } = getMountedWrapper()
      ;(wrapper.vm as any).loading = false
      await wrapper.vm.$nextTick()
      expect(wrapper.find('app-loading-spinner').exists()).toBeFalsy()
      expect(wrapper.find('resource-upload-stub').exists()).toBeTruthy()
    })
  })

  describe('error handling', () => {
    it('shows the "could not be located" message when the link was deleted (404)', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { wrapper } = getMountedWrapper({ listFilesError: { statusCode: 404 } })
      await flushPromises()
      expect(wrapper.text()).toContain(
        'The resource could not be located, it may not exist anymore.'
      )
    })
    it('shows a generic message for other errors instead of the raw error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { wrapper } = getMountedWrapper({ listFilesError: new Error('Unknown error') })
      await flushPromises()
      expect(wrapper.text()).toContain('An unknown error occurred while loading the public link.')
      expect(wrapper.text()).not.toContain('Error: Unknown error')
    })
  })
})

function getMountedWrapper({ listFilesError }: { listFilesError?: unknown } = {}) {
  const $clientService = mockDeep<ClientService>()
  if (listFilesError) {
    $clientService.webdav.listFiles.mockRejectedValue(listFilesError)
  } else {
    $clientService.webdav.listFiles.mockResolvedValue(mock<ListFilesResult>())
  }
  const defaultMocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files-common-favorites' })
    }),
    $clientService: $clientService
  }

  return {
    mocks: defaultMocks,
    wrapper: mount(FilesDrop, {
      global: {
        plugins: [...defaultPlugins()],
        mocks: defaultMocks,
        provide: defaultMocks,
        stubs: defaultStubs
      }
    })
  }
}
