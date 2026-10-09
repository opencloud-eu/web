import { mock } from 'vitest-mock-extended'
import { ref } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { UploadResult, useResourcesStore } from '@opencloud-eu/web-pkg'
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

  const mocks = defaultComponentMocks()
  mocks.$clientService.webdav.listFiles.mockResolvedValue({ resource: currentFolder, children })
  let onUploadComplete: (result: UploadResult) => Promise<void>
  mocks.$uppyService.subscribe.mockImplementation((_, callback) => {
    onUploadComplete = callback as typeof onUploadComplete
    return 'sub'
  })

  let resourcesStore: ReturnType<typeof useResourcesStore>
  getComposableWrapper(
    () => {
      resourcesStore = useResourcesStore()
      useFileUpload(ref(space))
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
    resourcesStore,
    completeUpload: () =>
      onUploadComplete(
        mock<UploadResult>({
          successful: [{ meta: { spaceId: space.id, driveType: space.driveType } }]
        })
      )
  }
}
