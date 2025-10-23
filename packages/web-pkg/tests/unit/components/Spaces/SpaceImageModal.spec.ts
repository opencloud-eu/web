import SpaceImageModal from '../../../../src/components/Spaces/SpaceImageModal.vue'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { eventBus, useMessages } from '../../../../src'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { mock } from 'vitest-mock-extended'
import { useSpaceHelpers } from '../../../../src/composables/spaces/useSpaceHelpers'

vi.mock('../../../../src/composables/spaces/useSpaceHelpers', () => ({
  useSpaceHelpers: vi.fn()
}))
vi.mock('cropperjs')

window.URL.createObjectURL = vi.fn(() => '')

describe('SpaceImageModal', () => {
  describe('method "uploadSpaceImage"', () => {
    it('should show message on success', async () => {
      const { wrapper, mocks } = getWrapper()
      const busStub = vi.spyOn(eventBus, 'publish')
      const spaceMock = mock<SpaceResource>({ spaceImageData: {} })
      mocks.$clientService.graphAuthenticated.drives.updateDrive.mockResolvedValue(spaceMock)
      mocks.$clientService.webdav.putFileContents.mockResolvedValue(
        mock<Resource>({
          fileId:
            'YTE0ODkwNGItNTZhNy00NTQ4LTk2N2MtZjcwZjhhYTY0Y2FjOmQ4YzMzMmRiLWUxNWUtNDRjMy05NGM2LTViYjQ2MGMwMWJhMw=='
        })
      )
      const arrayBuffer = new ArrayBuffer(0)
      await (wrapper.vm as any).uploadSpaceImage(arrayBuffer)

      expect(busStub).toHaveBeenCalledWith('app.files.spaces.uploaded-image', expect.anything())
      const { showMessage } = useMessages()
      expect(showMessage).toHaveBeenCalledTimes(1)
    })
  })

  it('should show showErrorMessage on error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { wrapper, mocks } = getWrapper()
    mocks.$clientService.webdav.putFileContents.mockRejectedValue(new Error(''))
    const arrayBuffer = new ArrayBuffer(0)

    await (wrapper.vm as any).uploadSpaceImage(arrayBuffer)

    const { showErrorMessage } = useMessages()
    expect(showErrorMessage).toHaveBeenCalledTimes(1)
  })
})

function getWrapper() {
  vi.mocked(useSpaceHelpers).mockReturnValue({
    getDefaultMetaFolder: () => Promise.resolve(mock<Resource>())
  })

  const mocks = defaultComponentMocks()
  return {
    mocks,
    wrapper: mount(SpaceImageModal, {
      props: {
        modal: undefined,
        space: {
          id: '1fe58d8b-aa69-4c22-baf7-97dd57479f22',
          spaceQuota: {
            remaining: 9999999836,
            state: 'normal',
            total: 10000000000,
            used: 164
          }
        } as SpaceResource,
        file: mock<File>({ name: 'test.png' })
      },
      global: {
        mocks,
        provide: mocks,
        plugins: [...defaultPlugins()]
      }
    })
  }
}
