import { mock } from 'vitest-mock-extended'
import { unref } from 'vue'
import { Resource, ShareSpaceResource, SpaceResource } from '@opencloud-eu/web-client'
import {
  defaultComponentMocks,
  getComposableWrapper,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import { useFileActionsDuplicate } from '../../../../../src/composables/actions/files'
import { useMessages, useResourcesStore } from '@opencloud-eu/web-pkg'

function getSourceResource(name = 'Report.txt', parentPath = '/folder') {
  return mock<Resource>({
    id: `source-${name}`,
    name,
    extension: name.split('.').pop(),
    path: `${parentPath === '/' ? '' : parentPath}/${name}`,
    canDownload: () => true
  })
}

describe('duplicate', () => {
  describe('computed property "actions"', () => {
    describe('isVisible', () => {
      it('returns true for downloadable resources in writable folders', () => {
        getWrapper({
          setup: ({ actions }, { space }) => {
            expect(
              unref(actions)[0].isVisible({ space, resources: [getSourceResource()] })
            ).toBeTruthy()
          }
        })
      })

      it('returns false without resources', () => {
        getWrapper({
          setup: ({ actions }, { space }) => {
            expect(unref(actions)[0].isVisible({ space, resources: [] })).toBeFalsy()
          }
        })
      })

      it('returns false if one resource is not downloadable', () => {
        getWrapper({
          setup: ({ actions }, { space }) => {
            const resource = mock<Resource>({
              path: '/folder/Report.txt',
              canDownload: () => false
            })
            expect(unref(actions)[0].isVisible({ space, resources: [resource] })).toBeFalsy()
          }
        })
      })

      it('returns false if folder is not writable', () => {
        getWrapper({
          canCreate: false,
          setup: ({ actions }, { space }) => {
            expect(
              unref(actions)[0].isVisible({ space, resources: [getSourceResource()] })
            ).toBeFalsy()
          }
        })
      })

      it('returns false for project spaces', () => {
        getWrapper({
          setup: ({ actions }, { space }) => {
            const resource = mock<SpaceResource>({
              path: '/folder/Project',
              driveType: 'project',
              canDownload: () => true
            })
            expect(unref(actions)[0].isVisible({ space, resources: [resource] })).toBeFalsy()
          }
        })
      })

      it('returns false for root resources', () => {
        getWrapper({
          currentFolderPath: '/',
          setup: ({ actions }, { space }) => {
            const resource = mock<Resource>({ path: '/', canDownload: () => true })
            expect(unref(actions)[0].isVisible({ space, resources: [resource] })).toBeFalsy()
          }
        })
      })

      it('returns false for resources outside of the current folder', () => {
        getWrapper({
          setup: ({ actions }, { space }) => {
            expect(
              unref(actions)[0].isVisible({
                space,
                resources: [getSourceResource('Report.txt', '/')]
              })
            ).toBeFalsy()
          }
        })
      })
    })
  })

  describe('method "duplicateFiles"', () => {
    it('duplicates with incremented file names', async () => {
      const { instance, mocks } = getWrapper()
      const { space, $clientService: clientService } = mocks
      clientService.webdav.listFiles.mockResolvedValue({
        resource: mock<Resource>({ id: 'folder-1', path: '/folder' }),
        children: [
          mock<Resource>({ name: 'Report.txt', extension: 'txt' }),
          mock<Resource>({ name: 'Report (1).txt', extension: 'txt' })
        ]
      })
      clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ id: 'copy-1', path: '/folder/Report (2).txt' })
      )

      await instance.duplicateFiles({ space, resources: [getSourceResource()] })

      expect(clientService.webdav.copyFiles).toHaveBeenCalledWith(
        space,
        expect.objectContaining({ name: 'Report.txt' }),
        space,
        { path: '/folder/Report (2).txt' }
      )
      expect(clientService.webdav.listFiles).toHaveBeenCalledWith(space, { path: '/folder' })

      const { upsertResources } = useResourcesStore()
      expect(upsertResources).toHaveBeenCalledWith([
        expect.objectContaining({ path: '/folder/Report (2).txt' })
      ])

      const { showMessage } = useMessages()
      expect(showMessage).toHaveBeenCalledWith({
        title: '"Report.txt" was duplicated successfully'
      })
    })

    it('shows count message for multiple duplicated resources', async () => {
      const { instance, mocks } = getWrapper()
      const { space, $clientService: clientService } = mocks
      clientService.webdav.listFiles.mockResolvedValue({
        resource: mock<Resource>({ id: 'folder-1', path: '/folder' }),
        children: [
          mock<Resource>({ name: 'Report.txt', extension: 'txt' }),
          mock<Resource>({ name: 'Image.png', extension: 'png' })
        ]
      })
      clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ id: 'copy-1', path: '/folder/ignored' })
      )

      await instance.duplicateFiles({
        space,
        resources: [getSourceResource('Report.txt'), getSourceResource('Image.png')]
      })

      const { showMessage } = useMessages()
      expect(showMessage).toHaveBeenCalledWith({
        title: '2 items were duplicated successfully'
      })
    })

    it('shows an error message if duplication fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)

      const { instance, mocks } = getWrapper()
      const { space, $clientService: clientService } = mocks
      clientService.webdav.copyFiles.mockRejectedValue(new Error('failed'))
      clientService.webdav.listFiles.mockResolvedValue({
        resource: mock<Resource>({ id: 'folder-1', path: '/folder' }),
        children: [mock<Resource>({ name: 'Report.txt', extension: 'txt' })]
      })

      await instance.duplicateFiles({ space, resources: [getSourceResource()] })

      const { showErrorMessage, showMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalledTimes(1)
      expect(showMessage).not.toHaveBeenCalled()
    })

    it('shows an error message if listing the parent folder fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)

      const { instance, mocks } = getWrapper()
      const { space, $clientService: clientService } = mocks
      clientService.webdav.listFiles.mockRejectedValue(new Error('failed'))

      await instance.duplicateFiles({ space, resources: [getSourceResource()] })

      expect(clientService.webdav.copyFiles).not.toHaveBeenCalled()
      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalledTimes(1)
    })

    it('upserts successful duplicates and shows an error on partial failure', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)

      const { instance, mocks } = getWrapper()
      const { space, $clientService: clientService } = mocks
      clientService.webdav.listFiles.mockResolvedValue({
        resource: mock<Resource>({ id: 'folder-1', path: '/folder' }),
        children: [
          mock<Resource>({ name: 'Report.txt', extension: 'txt' }),
          mock<Resource>({ name: 'Image.png', extension: 'png' })
        ]
      })
      clientService.webdav.copyFiles.mockImplementation((_s, _source, _t, { path }) =>
        path === '/folder/Image (1).png'
          ? Promise.reject(new Error('failed'))
          : Promise.resolve(undefined)
      )
      clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ id: 'copy-1', path: '/folder/Report (1).txt' })
      )

      await instance.duplicateFiles({
        space,
        resources: [getSourceResource('Report.txt'), getSourceResource('Image.png')]
      })

      const { upsertResources, resetSelection } = useResourcesStore()
      expect(upsertResources).toHaveBeenCalledWith([
        expect.objectContaining({ path: '/folder/Report (1).txt' })
      ])
      expect(resetSelection).not.toHaveBeenCalled()

      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalledTimes(1)
    })

    it('reports success if fetching the duplicate fails after copying', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)

      const { instance, mocks } = getWrapper()
      const { space, $clientService: clientService } = mocks
      clientService.webdav.listFiles.mockResolvedValue({
        resource: mock<Resource>({ id: 'folder-1', path: '/folder' }),
        children: [mock<Resource>({ name: 'Report.txt', extension: 'txt' })]
      })
      clientService.webdav.getFileInfo.mockRejectedValue(new Error('failed'))

      await instance.duplicateFiles({ space, resources: [getSourceResource()] })

      const { upsertResources } = useResourcesStore()
      expect(upsertResources).not.toHaveBeenCalled()

      const { showMessage, showErrorMessage } = useMessages()
      expect(showErrorMessage).not.toHaveBeenCalled()
      expect(showMessage).toHaveBeenCalledWith({
        title: '"Report.txt" was duplicated successfully'
      })
    })

    it('does not upsert if the current folder changed while duplicating', async () => {
      const { instance, mocks } = getWrapper()
      const { space, $clientService: clientService } = mocks
      const resourcesStore = useResourcesStore()
      clientService.webdav.listFiles.mockResolvedValue({
        resource: mock<Resource>({ id: 'folder-1', path: '/folder' }),
        children: [mock<Resource>({ name: 'Report.txt', extension: 'txt' })]
      })
      clientService.webdav.copyFiles.mockImplementation(() => {
        resourcesStore.currentFolder = mock<Resource>({ id: 'folder-2', path: '/other' })
        return Promise.resolve(undefined)
      })
      clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ id: 'copy-1', path: '/folder/Report (1).txt' })
      )

      await instance.duplicateFiles({ space, resources: [getSourceResource()] })

      expect(resourcesStore.upsertResources).not.toHaveBeenCalled()
    })

    it('sets the remote item id on duplicates in share spaces', async () => {
      const { instance, mocks } = getWrapper()
      const { $clientService: clientService } = mocks
      const shareSpace = mock<ShareSpaceResource>({ id: 'share-1', driveType: 'share' })
      clientService.webdav.listFiles.mockResolvedValue({
        resource: mock<Resource>({ id: 'folder-1', path: '/folder' }),
        children: [mock<Resource>({ name: 'Report.txt', extension: 'txt' })]
      })
      clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({
          id: 'copy-1',
          path: '/folder/Report (1).txt',
          remoteItemId: undefined
        })
      )

      await instance.duplicateFiles({ space: shareSpace, resources: [getSourceResource()] })

      const { upsertResources } = useResourcesStore()
      expect(upsertResources).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'copy-1', remoteItemId: 'share-1' })
      ])
    })

    it('only upserts duplicates located in the current folder', async () => {
      const { instance, mocks } = getWrapper()
      const { space, $clientService: clientService } = mocks
      clientService.webdav.listFiles.mockResolvedValue({
        resource: mock<Resource>({ id: 'folder-1', path: '/folder' }),
        children: [mock<Resource>({ name: 'Report.txt', extension: 'txt' })]
      })
      clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ id: 'copy-1', path: '/elsewhere/Report (1).txt' })
      )

      await instance.duplicateFiles({ space, resources: [getSourceResource()] })

      const { upsertResources } = useResourcesStore()
      expect(upsertResources).toHaveBeenCalledWith([])
    })
  })
})

function getWrapper({
  canCreate = true,
  currentFolderPath = '/folder',
  setup
}: {
  canCreate?: boolean
  currentFolderPath?: string
  setup?: (
    instance: ReturnType<typeof useFileActionsDuplicate>,
    { space }: { space: SpaceResource }
  ) => void
} = {}) {
  const currentFolder = mock<Resource>({
    id: 'folder-1',
    path: currentFolderPath,
    canCreate: () => canCreate
  })
  const space = mock<SpaceResource>({ id: 'space-1' })
  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files-spaces-generic' })
    }),
    space
  }

  let instance: ReturnType<typeof useFileActionsDuplicate>
  const wrapper = getComposableWrapper(
    () => {
      instance = useFileActionsDuplicate()
      setup?.(instance, { space })
    },
    {
      mocks,
      provide: mocks,
      pluginOptions: { piniaOptions: { resourcesStore: { currentFolder } } }
    }
  )
  return { wrapper, instance, mocks }
}
