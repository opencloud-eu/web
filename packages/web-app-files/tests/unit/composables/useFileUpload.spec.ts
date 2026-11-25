import { mock } from 'vitest-mock-extended'
import { ref } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { OcUppyFile, UploadResult, useResourcesStore, useSpacesStore } from '@opencloud-eu/web-pkg'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useFileUpload } from '../../../src/composables'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useUpload: vi.fn()
}))

const space = mock<SpaceResource>({ id: 'space-1', driveType: 'personal' })

describe('useFileUpload', () => {
  describe('after a completed upload', () => {
    it('loads the uploaded top level items instead of listing the folder', async () => {
      const replaced = { id: 'file', path: '/folder/file.txt', etag: 'new' } as Resource
      const { mocks, resourcesStore, completeUpload } = setup({
        space,
        existing: [{ id: 'file', path: '/folder/file.txt', etag: 'old' } as Resource]
      })
      mocks.$clientService.webdav.getFileInfo.mockResolvedValue(replaced)

      await completeUpload(uploadResult([uploadedFile('file.txt')]))

      expect(mocks.$clientService.webdav.getFileInfo).toHaveBeenCalledExactlyOnceWith(space, {
        path: '/folder/file.txt'
      })
      expect(mocks.$clientService.webdav.listFiles).not.toHaveBeenCalled()
      expect(resourcesStore.upsertResources).toHaveBeenCalledWith([replaced])
    })

    it('loads an uploaded folder once for all of its files', async () => {
      const folder = { id: 'dir', path: '/folder/dir', etag: 'new' } as Resource
      const { mocks, resourcesStore, completeUpload } = setup({ space, existing: [] })
      mocks.$clientService.webdav.getFileInfo.mockResolvedValue(folder)

      await completeUpload(
        uploadResult(
          [uploadedFile('a.txt', '/dir'), uploadedFile('b.txt', '/dir/sub')],
          [uploadedFile('c.txt', '/dir/sub')]
        )
      )

      expect(mocks.$clientService.webdav.getFileInfo).toHaveBeenCalledExactlyOnceWith(space, {
        path: '/folder/dir'
      })
      expect(resourcesStore.upsertResources).toHaveBeenCalledWith([folder])
    })

    it('loads top level folders that were created outside of the upload result', async () => {
      const { mocks, completeUpload, succeedUpload } = setup({ space, existing: [] })
      mocks.$clientService.webdav.getFileInfo.mockResolvedValue(mock<Resource>())

      succeedUpload(createdFolder('Photos'))
      succeedUpload(createdFolder('Empty'))
      succeedUpload(createdFolder('sub', '/Photos'))
      await completeUpload(uploadResult([uploadedFile('a.jpg', '/Photos')]))

      const paths = mocks.$clientService.webdav.getFileInfo.mock.calls.map(([, { path }]) => path)
      expect(paths).toEqual(['/folder/Photos', '/folder/Empty'])
    })

    it('loads created top level folders only once', async () => {
      const { mocks, completeUpload, succeedUpload } = setup({ space, existing: [] })
      mocks.$clientService.webdav.getFileInfo.mockResolvedValue(mock<Resource>())

      succeedUpload(createdFolder('Empty'))
      await completeUpload(uploadResult([uploadedFile('a.txt')]))
      await completeUpload(uploadResult([uploadedFile('b.txt')]))

      const paths = mocks.$clientService.webdav.getFileInfo.mock.calls.map(([, { path }]) => path)
      expect(paths).toEqual(['/folder/a.txt', '/folder/Empty', '/folder/b.txt'])
    })

    it('ignores items that could not be loaded', async () => {
      const uploaded = { id: 'ok', path: '/folder/ok.txt', etag: 'new' } as Resource
      const { mocks, resourcesStore, completeUpload } = setup({ space, existing: [] })
      mocks.$clientService.webdav.getFileInfo.mockImplementation((_, { path }) =>
        path === uploaded.path ? Promise.resolve(uploaded) : Promise.reject(new Error('404'))
      )

      await completeUpload(uploadResult([uploadedFile('ok.txt')], [uploadedFile('failed.txt')]))

      expect(resourcesStore.upsertResources).toHaveBeenCalledWith([uploaded])
    })

    it('does not update unchanged resources', async () => {
      const existing = { id: 'file', path: '/folder/file.txt', etag: 'same' } as Resource
      const { mocks, resourcesStore, completeUpload } = setup({ space, existing: [existing] })
      mocks.$clientService.webdav.getFileInfo.mockResolvedValue({ ...existing })

      await completeUpload(uploadResult([uploadedFile('file.txt')]))

      expect(resourcesStore.upsertResources).not.toHaveBeenCalled()
    })

    it('lists the folder if many top level items have been uploaded', async () => {
      const children = [{ id: 'file', path: '/folder/file.txt', etag: 'new' } as Resource]
      const { mocks, resourcesStore, completeUpload } = setup({ space, existing: [], children })
      const files = Array.from({ length: 21 }, (_, i) => uploadedFile(`file${i}.txt`))

      await completeUpload(uploadResult(files))

      expect(mocks.$clientService.webdav.getFileInfo).not.toHaveBeenCalled()
      expect(mocks.$clientService.webdav.listFiles).toHaveBeenCalledExactlyOnceWith(space, {
        path: '/folder'
      })
      expect(resourcesStore.upsertResources).toHaveBeenCalledWith(children)
    })

    it('lists the folder if it holds not many more items than were uploaded', async () => {
      const children = [{ id: 'file', path: '/folder/file.txt', etag: 'new' } as Resource]
      const { mocks, resourcesStore, completeUpload } = setup({
        space,
        existing: [],
        children,
        otherItemsCount: 2
      })

      await completeUpload(uploadResult([uploadedFile('a.txt'), uploadedFile('b.txt')]))

      expect(mocks.$clientService.webdav.getFileInfo).not.toHaveBeenCalled()
      expect(mocks.$clientService.webdav.listFiles).toHaveBeenCalledExactlyOnceWith(space, {
        path: '/folder'
      })
      expect(resourcesStore.upsertResources).toHaveBeenCalledWith(children)
    })

    it('lists the folder if the upload went into another folder', async () => {
      const children = [{ id: 'sub', path: '/folder/sub', etag: 'new' } as Resource]
      const { mocks, resourcesStore, completeUpload } = setup({ space, existing: [], children })

      await completeUpload(uploadResult([uploadedFile('file.txt', '', '/folder/sub')]))

      expect(mocks.$clientService.webdav.getFileInfo).not.toHaveBeenCalled()
      expect(mocks.$clientService.webdav.listFiles).toHaveBeenCalledExactlyOnceWith(space, {
        path: '/folder'
      })
      expect(resourcesStore.upsertResources).toHaveBeenCalledWith(children)
    })

    it('lists the folder inside a vault', async () => {
      const children = [{ id: 'file', path: '/folder/file.txt', etag: 'new' } as Resource]
      const { mocks, resourcesStore, completeUpload } = setup({
        space,
        existing: [],
        children,
        currentFolder: mock<Resource>({ id: 'folder', path: '/folder', isInVault: true })
      })

      await completeUpload(uploadResult([uploadedFile('encrypted-name')]))

      expect(mocks.$clientService.webdav.getFileInfo).not.toHaveBeenCalled()
      expect(mocks.$clientService.webdav.listFiles).toHaveBeenCalledExactlyOnceWith(space, {
        path: '/folder'
      })
      expect(resourcesStore.upsertResources).toHaveBeenCalledWith(children)
    })

    it('keeps the share id of resources in a share space', async () => {
      const shareSpace = mock<SpaceResource>({ id: 'space-1', driveType: 'share' })
      const { mocks, resourcesStore, completeUpload } = setup({ space: shareSpace, existing: [] })
      mocks.$clientService.webdav.getFileInfo.mockResolvedValue({
        id: 'file',
        path: '/folder/file.txt',
        etag: 'new'
      } as Resource)

      await completeUpload(uploadResult([uploadedFile('file.txt', '', '/folder', shareSpace)]))

      expect(resourcesStore.upsertResources).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'file', remoteItemId: 'space-1' })
      ])
    })

    it('does not throw when the upload folder has been deleted', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { mocks, resourcesStore, completeUpload } = setup({ space, existing: [] })
      const error = new Error('Resource not found')
      mocks.$clientService.webdav.listFiles.mockRejectedValue(error)

      await expect(
        completeUpload(uploadResult([], [uploadedFile('file.txt', '', '/deleted')]))
      ).resolves.toBeUndefined()

      expect(resourcesStore.upsertResources).not.toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalledWith(error)
    })
  })

  describe('after a cancelled upload', () => {
    it('lists the folder', async () => {
      const uploaded = { id: 'uploaded', path: '/folder/small.txt', etag: 'new' } as Resource
      const { mocks, resourcesStore, cancelUpload } = setup({
        space,
        existing: [],
        children: [uploaded]
      })

      await cancelUpload(uploadResult([uploadedFile('small.txt')]))

      expect(mocks.$clientService.webdav.getFileInfo).not.toHaveBeenCalled()
      expect(mocks.$clientService.webdav.listFiles).toHaveBeenCalledExactlyOnceWith(space, {
        path: '/folder'
      })
      expect(resourcesStore.upsertResources).toHaveBeenCalledWith([uploaded])
    })

    it('updates the upload space quota after navigating to another space', async () => {
      const uploadSpace = mock<SpaceResource>({ id: 'space-1', driveType: 'project' })
      const updatedSpace = mock<SpaceResource>({
        id: uploadSpace.id,
        spaceQuota: { used: 10, total: 100, remaining: 90 }
      })
      const {
        space: currentSpace,
        mocks,
        resourcesStore,
        spacesStore,
        cancelUpload
      } = setup({ space: uploadSpace, existing: [] })
      mocks.$clientService.graphAuthenticated.drives.getDrive.mockResolvedValue(updatedSpace)
      currentSpace.value = mock<SpaceResource>({ id: 'space-2', driveType: 'project' })

      await cancelUpload(uploadResult([uploadedFile('file.txt', '', '/folder', uploadSpace)]))

      expect(
        mocks.$clientService.graphAuthenticated.drives.getDrive
      ).toHaveBeenCalledExactlyOnceWith(uploadSpace.id)
      expect(spacesStore.updateSpaceField).toHaveBeenCalledWith({
        id: uploadSpace.id,
        field: 'spaceQuota',
        value: updatedSpace.spaceQuota
      })
      expect(mocks.$clientService.webdav.listFiles).not.toHaveBeenCalled()
      expect(resourcesStore.upsertResources).not.toHaveBeenCalled()
    })

    it('does not refresh resources or quota without uploaded files', async () => {
      const projectSpace = mock<SpaceResource>({ id: 'space-1', driveType: 'project' })
      const { mocks, resourcesStore, spacesStore, cancelUpload } = setup({
        space: projectSpace,
        existing: []
      })

      await cancelUpload(uploadResult([]))

      expect(mocks.$clientService.graphAuthenticated.drives.getDrive).not.toHaveBeenCalled()
      expect(spacesStore.updateSpaceField).not.toHaveBeenCalled()
      expect(mocks.$clientService.webdav.listFiles).not.toHaveBeenCalled()
      expect(resourcesStore.upsertResources).not.toHaveBeenCalled()
    })
  })
})

function uploadedFile(
  name: string,
  relativeFolder = '',
  currentFolder = '/folder',
  fileSpace = space
) {
  return {
    name,
    meta: { spaceId: fileSpace.id, driveType: fileSpace.driveType, currentFolder, relativeFolder }
  } as OcUppyFile
}

function createdFolder(name: string, relativeFolder = '') {
  const file = uploadedFile(name, relativeFolder)
  file.meta.isFolder = true
  return file
}

function uploadResult(successful: OcUppyFile[], failed: OcUppyFile[] = []) {
  return { successful, failed } as UploadResult
}

function setup({
  space,
  existing,
  children = [],
  currentFolder = mock<Resource>({ id: 'folder', path: '/folder', isInVault: false }),
  otherItemsCount = 30
}: {
  space: SpaceResource
  existing: Resource[]
  children?: Resource[]
  currentFolder?: Resource
  otherItemsCount?: number
}) {
  // unrelated items in the current folder, so that loading single items is worth it
  const otherItems = Array.from(
    { length: otherItemsCount },
    (_, i) => ({ id: `other${i}`, path: `/folder/other${i}`, etag: 'etag' }) as Resource
  )
  const currentSpace = ref(space)

  const mocks = defaultComponentMocks()
  mocks.$clientService.webdav.listFiles.mockResolvedValue({ resource: currentFolder, children })
  const subscriptions: Record<string, (data: unknown) => Promise<void>> = {}
  mocks.$uppyService.subscribe.mockImplementation((topic, callback) => {
    subscriptions[topic] = callback as (data: unknown) => Promise<void>
    return 'sub'
  })

  let resourcesStore: ReturnType<typeof useResourcesStore>
  let spacesStore: ReturnType<typeof useSpacesStore>
  getComposableWrapper(
    () => {
      resourcesStore = useResourcesStore()
      spacesStore = useSpacesStore()
      useFileUpload(currentSpace)
    },
    {
      mocks,
      provide: mocks,
      pluginOptions: {
        piniaOptions: { resourcesStore: { currentFolder, resources: [...existing, ...otherItems] } }
      }
    }
  )

  return {
    space: currentSpace,
    mocks,
    resourcesStore,
    spacesStore,
    completeUpload: (result: UploadResult) => subscriptions.uploadCompleted(result),
    cancelUpload: (result: UploadResult) => subscriptions.uploadCancelled(result),
    succeedUpload: (file: OcUppyFile) => subscriptions.uploadSuccess(file)
  }
}
