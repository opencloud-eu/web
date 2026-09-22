import SpaceImageModal from '../../../../src/components/Spaces/SpaceImageModal.vue'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'

const { getCroppedArrayBuffer } = vi.hoisted(() => ({ getCroppedArrayBuffer: vi.fn() }))

vi.mock('../../../../src/components/ImageCropper.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'ImageCropper',
      setup(_, { expose }) {
        expose({ getCroppedArrayBuffer })
        return () => h('div', { 'data-testid': 'cropper' })
      }
    })
  }
})

window.URL.createObjectURL = vi.fn(() => 'blob:image')
window.URL.revokeObjectURL = vi.fn()

describe('SpaceImageModal', () => {
  it('hands the cropped image to the caller', async () => {
    const content = new ArrayBuffer(8)
    getCroppedArrayBuffer.mockResolvedValue(content)
    const { wrapper, save } = getWrapper()
    // the cropper only renders once the object URL is in place
    await wrapper.vm.$nextTick()

    await (wrapper.vm as any).onConfirm()

    expect(save).toHaveBeenCalledWith(content)
  })

  it('hands nothing over when there is nothing to crop', async () => {
    getCroppedArrayBuffer.mockResolvedValue(null)
    const { wrapper, save } = getWrapper()
    // the cropper only renders once the object URL is in place
    await wrapper.vm.$nextTick()

    await (wrapper.vm as any).onConfirm()

    expect(save).not.toHaveBeenCalled()
  })
})

function getWrapper() {
  const mocks = defaultComponentMocks()
  const save = vi.fn()

  return {
    mocks,
    save,
    wrapper: mount(SpaceImageModal, {
      props: {
        modal: undefined,
        file: mock<File>(),
        save
      },
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        provide: mocks
      }
    })
  }
}
