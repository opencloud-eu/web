import { mock } from 'vitest-mock-extended'
import {
  defaultComponentMocks,
  getComposableWrapper,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import { Resource, ShareSpaceResource, SpaceResource } from '@opencloud-eu/web-client'
import { useAppFolderHandling } from '../../../../src/composables/appDefaults/useAppFolderHandling'
import { FileContext } from '../../../../src/composables/appDefaults/types'
import { useResourcesStore } from '../../../../src/composables/piniaStores'
import { folderService, FolderLoaderTask } from '../../../../src/services/folder'

vi.mock('../../../../src/composables/router/useFileRouteReplace', () => ({
  useFileRouteReplace: vi.fn(() => ({ replaceInvalidFileRoute: vi.fn() }))
}))

describe('useAppFolderHandling', () => {
  describe('loadFolderForFileContext', () => {
    it('assigns the share space id to the root of a single file share', async () => {
      const space = mock<ShareSpaceResource>({ id: 'share-space-id', driveType: 'share' })
      const file = mock<Resource>({
        id: 'file-id',
        path: '/',
        type: 'file',
        remoteItemId: undefined
      })

      const { mocks } = getWrapper({ fileResource: file })
      await mocks.instance.loadFolderForFileContext(createFileContext(space))

      const resourcesStore = useResourcesStore()
      expect(file.remoteItemId).toBe('share-space-id')
      expect(resourcesStore.initResourceList).toHaveBeenCalledWith({
        currentFolder: file,
        resources: [file]
      })
    })

    it('assigns the share space id to the children of a share space', async () => {
      const space = mock<ShareSpaceResource>({ id: 'share-space-id', driveType: 'share' })
      const folder = mock<Resource>({ path: '/', type: 'folder', remoteItemId: undefined })
      const child = mock<Resource>({ path: '/file.txt', type: 'file', remoteItemId: undefined })

      const { mocks } = getWrapper({ fileResource: child, folder, children: [child] })
      await mocks.instance.loadFolderForFileContext(createFileContext(space))

      expect(child.remoteItemId).toBe('share-space-id')
    })

    it('does not assign a share space id outside of share spaces', async () => {
      const space = mock<SpaceResource>({ id: 'personal-space-id', driveType: 'personal' })
      const folder = mock<Resource>({ path: '/', type: 'folder', remoteItemId: undefined })
      const child = mock<Resource>({ path: '/file.txt', type: 'file', remoteItemId: undefined })

      const { mocks } = getWrapper({ fileResource: child, folder, children: [child] })
      await mocks.instance.loadFolderForFileContext(createFileContext(space))

      expect(folder.remoteItemId).toBeUndefined()
      expect(child.remoteItemId).toBeUndefined()
    })

    it.each(['files-shares-with-me', 'files-guest-shares', 'files-common-favorites'])(
      'uses the folder loader for the flat file list "%s"',
      async (routeName) => {
        const loaderTask = mock<FolderLoaderTask>()
        vi.spyOn(folderService, 'getTask').mockReturnValue(loaderTask)

        const { mocks } = getWrapper({ fileResource: mock<Resource>() })
        await mocks.instance.loadFolderForFileContext(mock<FileContext>({ routeName }))

        expect(loaderTask.perform).toHaveBeenCalled()
      }
    )
  })
})

function createFileContext(space: SpaceResource): FileContext {
  return mock<FileContext>({
    space,
    item: '/file.txt',
    itemId: 'file-id',
    routeName: 'files-spaces-generic'
  })
}

function getWrapper({
  fileResource,
  folder = fileResource,
  children = []
}: {
  fileResource: Resource
  folder?: Resource
  children?: Resource[]
}) {
  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'preview', query: {} })
    }),
    instance: undefined as ReturnType<typeof useAppFolderHandling>
  }
  mocks.$clientService.webdav.getFileInfo.mockResolvedValue(fileResource)
  mocks.$clientService.webdav.listFiles.mockResolvedValue({ resource: folder, children })

  const wrapper = getComposableWrapper(
    () => {
      mocks.instance = useAppFolderHandling({
        currentRoute: mocks.$router.currentRoute,
        clientService: mocks.$clientService
      })
    },
    { mocks, provide: mocks }
  )

  return { wrapper, mocks }
}
