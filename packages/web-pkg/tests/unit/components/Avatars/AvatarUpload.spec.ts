import AvatarUpload from '../../../../src/components/Avatars/AvatarUpload.vue'
import {
  createMockFile,
  defaultComponentMocks,
  defaultPlugins,
  mount,
  nextTicks
} from '@opencloud-eu/web-test-helpers'
import { useMessages, useUserStore } from '../../../../src'
import { describe } from 'vitest'
import { flushPromises } from '@vue/test-utils'

const createImageBitmap = vi.fn(() => Promise.resolve({ close: vi.fn() }))
vi.stubGlobal('createImageBitmap', createImageBitmap)

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
  modalConfirm: '.oc-modal-body-actions-confirm ',
  modalCancel: '.oc-modal-body-actions-cancel'
}

describe('AvatarUpload', () => {
  it('should not throw when the user gets reset, e.g. on logout', async () => {
    const { wrapper } = getWrapper()
    useUserStore().user = null
    await nextTicks(2)
    expect(wrapper.html()).not.toContain('avatar-file-input')
  })
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
  describe('remove modal', () => {
    it('disables cancel and confirm while the removal is in flight and closes afterwards', async () => {
      const { wrapper, mocks } = getWrapper()
      let finishRemoval: () => void
      mocks.$clientService.graphAuthenticated.photos.deleteOwnUserPhoto.mockReturnValueOnce(
        new Promise<void>((resolve) => {
          finishRemoval = resolve
        }) as any
      )
      await wrapper.vm.$nextTick()
      await wrapper.find(selectors.removeAvatarButton).trigger('click')
      await wrapper.find(selectors.modalConfirm).trigger('click')

      expect(wrapper.find(selectors.modalCancel).attributes('disabled')).toBeDefined()
      expect(wrapper.find(selectors.modalConfirm).attributes('disabled')).toBeDefined()

      finishRemoval()
      await flushPromises()

      expect(wrapper.find(selectors.modalCancel).exists()).toBeFalsy()
    })
  })
  describe('crop modal', () => {
    it('uploads only once on a double click and disables confirm while the upload is in flight', async () => {
      const { wrapper, mocks } = getWrapper()
      let finishUpload: () => void
      mocks.$clientService.graphAuthenticated.photos.updateOwnUserPhotoPatch.mockReturnValueOnce(
        new Promise<void>((resolve) => {
          finishUpload = resolve
        }) as any
      )

      const file = createMockFile('file.png', 1024, 'image/png')
      const input = wrapper.find(selectors.avatarFileInput).element as HTMLInputElement
      const event = new Event('change')

      Object.defineProperty(event, 'target', {
        writable: false,
        value: { files: [file] }
      })

      input.dispatchEvent(event)
      await flushPromises()
      ;(wrapper.vm as any).imageCropperRef = {
        getCroppedCanvas: vi.fn(() =>
          Promise.resolve({
            toBlob: vi.fn((cb) => cb(new Blob())),
            toDataURL: vi.fn(() => 'data:image/png;base64,mocked')
          })
        )
      }

      const confirmButton = wrapper.find(selectors.modalConfirm)
      confirmButton.trigger('click')
      confirmButton.trigger('click')
      await flushPromises()

      expect(
        mocks.$clientService.graphAuthenticated.photos.updateOwnUserPhotoPatch
      ).toHaveBeenCalledTimes(1)
      expect(wrapper.find(selectors.modalConfirm).attributes('disabled')).toBeDefined()

      finishUpload()
      await flushPromises()

      expect(wrapper.find(selectors.modalConfirm).exists()).toBeFalsy()
      const { showMessage, showErrorMessage } = useMessages()
      expect(showMessage).toHaveBeenCalledTimes(1)
      expect(showErrorMessage).not.toHaveBeenCalled()
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

    it('should show an error and no crop modal for an image that cannot be decoded', async () => {
      createImageBitmap.mockRejectedValueOnce(new Error('broken'))
      const { wrapper } = getWrapper()
      const file = createMockFile('broken.png', 1024, 'image/png')
      const input = wrapper.find(selectors.avatarFileInput).element as HTMLInputElement
      const event = new Event('change')

      Object.defineProperty(event, 'target', {
        writable: false,
        value: { files: [file] }
      })

      input.dispatchEvent(event)
      await nextTicks(2)

      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'The selected image is not supported or damaged' })
      )
      expect(wrapper.find(selectors.modalConfirm).exists()).toBe(false)
    })

    it.each([
      { name: 'too large', size: 20 * 1024 * 1024, decodable: true },
      { name: 'not decodable', size: 1024, decodable: false }
    ])(
      'should reset the file input when the file is $name so it can be picked again',
      async ({ size, decodable }) => {
        if (!decodable) {
          createImageBitmap.mockRejectedValueOnce(new Error('broken'))
        }
        const { wrapper } = getWrapper()
        const file = createMockFile('rejected.png', size, 'image/png')
        const input = wrapper.find(selectors.avatarFileInput).element as HTMLInputElement
        let inputValue = 'C:\\fakepath\\rejected.png'
        Object.defineProperty(input, 'value', {
          get: () => inputValue,
          set: (value: string) => {
            inputValue = value
          }
        })
        const event = new Event('change')

        Object.defineProperty(event, 'target', {
          writable: false,
          value: { files: [file] }
        })

        input.dispatchEvent(event)
        await flushPromises()

        expect(input.value).toBe('')
      }
    )

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
      await flushPromises()
      ;(wrapper.vm as any).imageCropperRef = {
        getCroppedCanvas: vi.fn(() =>
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
      await flushPromises()
      ;(wrapper.vm as any).imageCropperRef = {
        getCroppedCanvas: vi.fn(() =>
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
          ImageCropper: true
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
