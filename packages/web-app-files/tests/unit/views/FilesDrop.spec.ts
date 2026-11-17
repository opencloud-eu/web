import FilesDrop from '../../../src/views/FilesDrop.vue'
import {
  defaultPlugins,
  mount,
  defaultComponentMocks,
  defaultStubs,
  RouteLocation,
  useGetMatchingSpaceMock
} from '@opencloud-eu/web-test-helpers'
import { flushPromises } from '@vue/test-utils'
import { mock, mockDeep } from 'vitest-mock-extended'
import { ClientService, useGetMatchingSpace } from '@opencloud-eu/web-pkg'
import { SpaceResource } from '@opencloud-eu/web-client'
import { ListFilesResult } from '@opencloud-eu/web-client/webdav'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useGetMatchingSpace: vi.fn()
}))

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

  describe('logged-in user with internal access', () => {
    it('replaces the history entry with the internal folder', async () => {
      const internalSpace = mock<SpaceResource>({
        driveType: 'personal',
        getDriveAliasAndItem: () => 'personal/admin/folder'
      })
      const { mocks } = getMountedWrapper({ userContextReady: true, internalSpace })
      await flushPromises()

      expect(mocks.$router.replace).toHaveBeenCalledWith({
        name: 'files-spaces-generic',
        params: { driveAliasAndItem: 'personal/admin/folder' },
        query: { fileId: 'storage$space!folder' }
      })
      expect(mocks.$router.push).not.toHaveBeenCalled()
    })
    it('replaces the history entry with the private link resolver for a share', async () => {
      const { mocks } = getMountedWrapper({ userContextReady: true })
      await flushPromises()

      expect(mocks.$router.replace).toHaveBeenCalledWith({
        name: 'resolvePrivateLink',
        params: { fileId: 'storage$space!folder' }
      })
      expect(mocks.$router.push).not.toHaveBeenCalled()
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

function getMountedWrapper({
  listFilesError,
  userContextReady = false,
  internalSpace
}: {
  listFilesError?: unknown
  userContextReady?: boolean
  internalSpace?: SpaceResource
} = {}) {
  vi.mocked(useGetMatchingSpace).mockImplementation(() =>
    useGetMatchingSpaceMock({ getInternalSpace: () => internalSpace })
  )
  const $clientService = mockDeep<ClientService>()
  $clientService.webdav.getPathForFileId.mockResolvedValue('/folder')
  if (listFilesError) {
    $clientService.webdav.listFiles.mockRejectedValue(listFilesError)
  } else {
    $clientService.webdav.listFiles.mockResolvedValue(mock<ListFilesResult>())
  }
  const currentRoute = mock<RouteLocation>({ name: 'files-public-upload' })
  // a mocked query would return a mock for every missing query item
  currentRoute.query = { fileId: 'storage$space!folder' }
  const defaultMocks = {
    ...defaultComponentMocks({ currentRoute }),
    $clientService: $clientService
  }

  return {
    mocks: defaultMocks,
    wrapper: mount(FilesDrop, {
      global: {
        plugins: [...defaultPlugins({ piniaOptions: { authState: { userContextReady } } })],
        mocks: defaultMocks,
        provide: defaultMocks,
        stubs: defaultStubs
      }
    })
  }
}
