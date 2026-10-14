import { mock } from 'vitest-mock-extended'
import { ref } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { UploadResult, useResourcesStore, useSpacesStore } from '@opencloud-eu/web-pkg'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useFileUpload } from '../../../src/composables'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useUpload: vi.fn()
}))

describe('useFileUpload', () => {
  it('updates existing resources that were replaced by the upload', async () => {
    const existing = { id: 'file', path: '/folder/file.txt', etag: 'old', size: 20 } as Resource
    const replaced = { id: 'file', path: '/folder/file.txt', etag: 'new', size: 50 } as Resource
    const { resourcesStore, completeUpload } = setup({
      space: mock<SpaceResource>({ id: 'space-1', driveType: 'personal' }),
      existing: [existing],
      children: [replaced]
    })

    await completeUpload()

    expect(resourcesStore.upsertResources).toHaveBeenCalledWith([replaced])
  })

  it('updates the resources after an upload has been cancelled', async () => {
    const uploaded = { id: 'uploaded', path: '/folder/small.txt', etag: 'new' } as Resource
    const { resourcesStore, cancelUpload } = setup({
      space: mock<SpaceResource>({ id: 'space-1', driveType: 'personal' }),
      existing: [],
      children: [uploaded]
    })

    await cancelUpload()

    expect(resourcesStore.upsertResources).toHaveBeenCalledWith([uploaded])
  })

  it('updates the upload space quota after navigating to another space and cancelling', async () => {
    const uploadSpace = mock<SpaceResource>({ id: 'space-1', driveType: 'project' })
    const updatedSpace = mock<SpaceResource>({
      id: uploadSpace.id,
      spaceQuota: { used: 10, total: 100, remaining: 90 }
    })
    const { space, mocks, resourcesStore, spacesStore, cancelUpload } = setup({
      space: uploadSpace,
      existing: [],
      children: []
    })
    mocks.$clientService.graphAuthenticated.drives.getDrive.mockResolvedValue(updatedSpace)
    space.value = mock<SpaceResource>({ id: 'space-2', driveType: 'project' })

    await cancelUpload()

    expect(mocks.$clientService.graphAuthenticated.drives.getDrive).toHaveBeenCalledExactlyOnceWith(
      uploadSpace.id
    )
    expect(spacesStore.updateSpaceField).toHaveBeenCalledWith({
      id: uploadSpace.id,
      field: 'spaceQuota',
      value: updatedSpace.spaceQuota
    })
    expect(mocks.$clientService.webdav.listFiles).not.toHaveBeenCalled()
    expect(resourcesStore.upsertResources).not.toHaveBeenCalled()
  })

  it('does not refresh resources or quota when cancelling without successful uploads', async () => {
    const { mocks, resourcesStore, spacesStore, cancelUpload } = setup({
      space: mock<SpaceResource>({ id: 'space-1', driveType: 'project' }),
      existing: [],
      children: []
    })

    await cancelUpload({ successful: [], failed: [] })

    expect(mocks.$clientService.graphAuthenticated.drives.getDrive).not.toHaveBeenCalled()
    expect(spacesStore.updateSpaceField).not.toHaveBeenCalled()
    expect(mocks.$clientService.webdav.listFiles).not.toHaveBeenCalled()
    expect(resourcesStore.upsertResources).not.toHaveBeenCalled()
  })

  it('keeps the share id of resources in a share space', async () => {
    const replaced = { id: 'file', path: '/folder/file.txt', etag: 'new' } as Resource
    const { resourcesStore, completeUpload } = setup({
      space: mock<SpaceResource>({ id: 'space-1', driveType: 'share' }),
      existing: [{ id: 'file', path: '/folder/file.txt', etag: 'old' } as Resource],
      children: [replaced]
    })

    await completeUpload()

    expect(resourcesStore.upsertResources).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'file', remoteItemId: 'space-1' })
    ])
  })
})

function setup({
  space,
  existing,
  children
}: {
  space: SpaceResource
  existing: Resource[]
  children: Resource[]
}) {
  const currentFolder = mock<Resource>({ id: 'folder', path: '/folder' })
  const currentSpace = ref(space)
  const uploadResult = mock<UploadResult>({
    successful: [{ meta: { spaceId: space.id, driveType: space.driveType } }],
    failed: []
  })

  const mocks = defaultComponentMocks()
  mocks.$clientService.webdav.listFiles.mockResolvedValue({ resource: currentFolder, children })
  const subscriptions: Record<string, (result: UploadResult) => Promise<void>> = {}
  mocks.$uppyService.subscribe.mockImplementation((topic, callback) => {
    subscriptions[topic] = callback as (result: UploadResult) => Promise<void>
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
        piniaOptions: { resourcesStore: { currentFolder, resources: existing } }
      }
    }
  )

  return {
    space: currentSpace,
    mocks,
    resourcesStore,
    spacesStore,
    completeUpload: () => subscriptions.uploadCompleted(uploadResult),
    cancelUpload: (result = uploadResult) => subscriptions.uploadCancelled(result)
  }
}
