import AvatarUpload from '../../../../src/components/Avatars/AvatarUpload.vue'
import {
  createMockFile,
  defaultComponentMocks,
  defaultPlugins,
  mount,
  nextTicks
} from '@opencloud-eu/web-test-helpers'
import { useMessages } from '../../../../src'
import { describe } from 'vitest'

vi.mock('cropperjs', () => {
  const mockCanvas = {
    toBlob: vi.fn((cb) => cb(new Blob())),
    toDataURL: vi.fn(() => 'data:image/png;base64,mocked')
  }

  const mockSelection = {
    aspectRatio: 0,
    initialCoverage: 0,
    $toCanvas: vi.fn(() => Promise.resolve(mockCanvas))
  }

  const mockImage = {
    $ready: vi.fn(() => Promise.resolve()),
    $move: vi.fn(),
    $scale: vi.fn()
  }

  const Cropper = vi.fn(
    class {
      getCropperSelection = vi.fn(() => mockSelection)
      getCropperImage = vi.fn(() => mockImage)
      destroy = vi.fn()
    }
  )
  return { default: Cropper }
})

window.URL.createObjectURL = vi.fn(() => 'foo')

const selectors = {
  removeAvatarButton: '.avatar-upload-remove-button',
  avatarFileInput: '.avatar-file-input',
  modalConfirm: '.oc-modal-body-actions-confirm '
}

describe('AvatarUpload', () => {
  describe('removeButton', () => {
    it('should exist when user has avatar', () => {
      const { wrapper } = getWrapper()
      expect(wrapper.find(selectors.removeAvatarButton).exists()).toBeTruthy()
    })
    it('should not exist when user has no avatar', () => {
      const { wrapper } = getWrapper({ userHasAvatar: false })
      expect(wrapper.find(selectors.removeAvatarButton).exists()).toBeFalsy()
    })
    it('should show message on successful removal', async () => {
      const { wrapper } = getWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.find(selectors.removeAvatarButton).trigger('click')
      await wrapper.find(selectors.modalConfirm).trigger('click')
      const { showMessage } = useMessages()
      expect(showMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Profile picture was removed successfully'
        })
      )
    })
    it('should show error message on removal error', async () => {
      const { wrapper, mocks } = getWrapper()
      mocks.$clientService.graphAuthenticated.photos.deleteOwnUserPhoto.mockRejectedValueOnce(
        new Error('')
      )
      await wrapper.vm.$nextTick()
      await wrapper.find(selectors.removeAvatarButton).trigger('click')
      await wrapper.find(selectors.modalConfirm).trigger('click')
      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Failed to remove profile picture'
        })
      )
    })
  })
  describe('uploadButton', () => {
    it('should show error message when file size it too big', () => {
      const { wrapper } = getWrapper({})
      const file = createMockFile('large-file.png', 20 * 1024 * 1024, 'image/png')
      const input = wrapper.find(selectors.avatarFileInput).element as HTMLInputElement
      const event = new Event('change')

      Object.defineProperty(event, 'target', {
        writable: false,
        value: { files: [file] }
      })

      input.dispatchEvent(event)
      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'File size exceeds the limit of 10MB'
        })
      )
    })

    it('should show message on successful upload', async () => {
      const { wrapper } = getWrapper()
      const file = createMockFile('file.png', 9 * 1024 * 1024, 'image/png')
      const input = wrapper.find(selectors.avatarFileInput).element as HTMLInputElement
      const event = new Event('change')

      Object.defineProperty(event, 'target', {
        writable: false,
        value: { files: [file] }
      })

      input.dispatchEvent(event)
      await nextTicks(2)
      ;(wrapper.vm as any).cropperSelectionRef = {
        $toCanvas: vi.fn(() =>
          Promise.resolve({
            toBlob: vi.fn((cb) => cb(new Blob())),
            toDataURL: vi.fn(() => 'data:image/png;base64,mocked')
          })
        )
      }

      await wrapper.find(selectors.modalConfirm).trigger('click')
      await nextTicks(2)

      const { showMessage } = useMessages()
      expect(showMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Profile picture was set successfully'
        })
      )
    })
    it('should show error message on upload error', async () => {
      const { wrapper, mocks } = getWrapper()
      mocks.$clientService.graphAuthenticated.photos.updateOwnUserPhotoPatch.mockRejectedValueOnce(
        new Error('')
      )

      const file = createMockFile('file.png', 9 * 1024 * 1024, 'image/png')
      const input = wrapper.find(selectors.avatarFileInput).element as HTMLInputElement
      const event = new Event('change')

      Object.defineProperty(event, 'target', {
        writable: false,
        value: { files: [file] }
      })

      input.dispatchEvent(event)
      await nextTicks(2)
      ;(wrapper.vm as any).cropperSelectionRef = {
        $toCanvas: vi.fn(() =>
          Promise.resolve({
            toBlob: vi.fn((cb) => cb(new Blob())),
            toDataURL: vi.fn(() => 'data:image/png;base64,mocked')
          })
        )
      }

      await wrapper.find(selectors.modalConfirm).trigger('click')
      await nextTicks(2)

      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Failed to set profile picture'
        })
      )
    })
  })
})

const getWrapper = ({ userHasAvatar = true } = {}) => {
  const mocks = {
    ...defaultComponentMocks({})
  }

  return {
    mocks,
    wrapper: mount(AvatarUpload, {
      global: {
        renderStubDefaultSlot: true,
        stubs: {
          FocusTrap: true,
          'cropper-canvas': true,
          'cropper-image': true,
          'cropper-shade': true,
          'cropper-handle': true,
          'cropper-selection': true,
          'cropper-grid': true,
          'cropper-crosshair': true
        },
        plugins: [
          ...defaultPlugins({
            piniaOptions: {
              avatarsStore: {
                avatarMap: userHasAvatar ? { '1': 'https://localhost:9201/some-object-url' } : {}
              }
            }
          })
        ],
        mocks,
        provide: mocks
      }
    })
  }
}
