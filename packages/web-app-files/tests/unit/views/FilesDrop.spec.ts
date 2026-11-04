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
import {
  DavHttpError,
  PublicSpaceResource,
  Resource,
  SharePermissionBit,
  SpaceResource
} from '@opencloud-eu/web-client'

const folderId = 'storage$space!folder'

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

  describe('resolving to the internal location', () => {
    it('redirects a logged-in user who can upload to the folder', async () => {
      const { mocks } = getMountedWrapper({ userContextReady: true })
      await flushPromises()

      const headers = { Authorization: 'Bearer access-token' }
      expect(mocks.$clientService.webdav.getPathForFileId).toHaveBeenCalledWith(folderId, {
        headers
      })
      expect(mocks.$clientService.webdav.getFileInfo).toHaveBeenCalledWith(
        expect.objectContaining({ id: folderId }),
        { fileId: folderId },
        { headers }
      )
      expect(mocks.$router.push).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'files-spaces-generic' })
      )
      expect(mocks.$clientService.webdav.listFiles).not.toHaveBeenCalled()
    })
    it('shows the drop page to a logged-in user who can only view the folder', async () => {
      const { wrapper, mocks } = getMountedWrapper({ userContextReady: true, canUpload: false })
      await flushPromises()

      expect(mocks.$clientService.webdav.getFileInfo).toHaveBeenCalled()
      expect(mocks.$router.push).not.toHaveBeenCalled()
      expect(wrapper.find('resource-upload-stub').exists()).toBeTruthy()
    })
    it('shows the drop page to a logged-in user without access', async () => {
      const { wrapper, mocks } = getMountedWrapper({
        userContextReady: true,
        hasInternalAccess: false
      })
      await flushPromises()

      expect(mocks.$clientService.webdav.getPathForFileId).toHaveBeenCalled()
      expect(mocks.$router.push).not.toHaveBeenCalled()
      expect(wrapper.find('resource-upload-stub').exists()).toBeTruthy()
    })
    it('shows the drop page to an anonymous user', async () => {
      const { wrapper, mocks } = getMountedWrapper()
      await flushPromises()

      expect(mocks.$clientService.webdav.getPathForFileId).not.toHaveBeenCalled()
      expect(mocks.$router.push).not.toHaveBeenCalled()
      expect(wrapper.find('resource-upload-stub').exists()).toBeTruthy()
    })
  })
})

function getMountedWrapper({
  listFilesError,
  userContextReady = false,
  hasInternalAccess = true,
  canUpload = true
}: {
  listFilesError?: unknown
  userContextReady?: boolean
  hasInternalAccess?: boolean
  canUpload?: boolean
} = {}) {
  const $clientService = mockDeep<ClientService>()
  if (listFilesError) {
    $clientService.webdav.listFiles.mockRejectedValue(listFilesError)
  } else {
    $clientService.webdav.listFiles.mockResolvedValue(
      mock<ListFilesResult>({
        resource: mock<PublicSpaceResource>({ publicLinkPermission: SharePermissionBit.Create })
      })
    )
  }
  // without the user's token, the request goes out with the basic auth credentials of the link
  $clientService.webdav.getPathForFileId.mockImplementation((_id, opts = {}) => {
    if (hasInternalAccess && opts.headers?.Authorization === 'Bearer access-token') {
      return Promise.resolve('/folder')
    }
    return Promise.reject(new DavHttpError('', undefined, undefined, 401))
  })
  $clientService.webdav.getFileInfo.mockImplementation((_space, _resource, opts = {}) => {
    if (hasInternalAccess && opts.headers?.Authorization === 'Bearer access-token') {
      return Promise.resolve(mock<Resource>({ canUpload: () => canUpload }))
    }
    return Promise.reject(new DavHttpError('', undefined, undefined, 401))
  })
  const defaultMocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({
        name: 'files-public-upload',
        query: { fileId: folderId }
      })
    }),
    $clientService: $clientService
  }
  const internalSpace = mock<SpaceResource>({ id: 'storage$space', driveType: 'personal' })

  return {
    mocks: defaultMocks,
    wrapper: mount(FilesDrop, {
      global: {
        plugins: [
          ...defaultPlugins({
            piniaOptions: {
              authState: { userContextReady, accessToken: 'access-token' },
              spacesState: { spaces: [internalSpace] }
            }
          })
        ],
        mocks: defaultMocks,
        provide: defaultMocks,
        stubs: defaultStubs
      }
    })
  }
}
