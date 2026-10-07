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
    const space = mock<SpaceResource>({ id: 'space-1' })
    const currentFolder = mock<Resource>({ id: 'folder', path: '/folder' })
    const existing = { id: 'file', path: '/folder/file.txt', etag: 'old', size: 20 } as Resource
    const replaced = { id: 'file', path: '/folder/file.txt', etag: 'new', size: 50 } as Resource

    const mocks = defaultComponentMocks()
    mocks.$clientService.webdav.listFiles.mockResolvedValue({
      resource: currentFolder,
      children: [replaced]
    })
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
          piniaOptions: { resourcesStore: { currentFolder, resources: [existing] } }
        }
      }
    )

    await onUploadComplete(
      mock<UploadResult>({
        successful: [{ meta: { spaceId: 'space-1', driveType: 'personal' } }]
      })
    )

    expect(resourcesStore.upsertResources).toHaveBeenCalledWith([replaced])
  })
})
