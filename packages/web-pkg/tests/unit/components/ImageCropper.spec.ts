import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import ImageCropper from '../../../src/components/ImageCropper.vue'

vi.mock('cropperjs', () => ({}))

describe('ImageCropper', () => {
  it('names the crop area and links it to the keyboard hint', () => {
    const wrapper = getWrapper()
    const selection = wrapper.find('#image-cropper-selection')
    expect(selection.attributes('role')).toBe('group')
    expect(selection.attributes('aria-label')).toBe('Crop area')
    const hint = wrapper.find(`#${selection.attributes('aria-describedby')}`)
    expect(hint.text()).toContain('Zoom via')
  })
  it('gives the image to crop a text alternative', () => {
    const wrapper = getWrapper()
    expect(wrapper.find('cropper-image').attributes('alt')).toBe('Selected image')
  })
  it('hides the decorative grid from assistive technologies', () => {
    const wrapper = getWrapper()
    const grid = wrapper.find('cropper-grid')
    expect(grid.attributes('role')).toBeUndefined()
    expect(grid.attributes('aria-hidden')).toBe('true')
  })
})

function getWrapper() {
  return mount(ImageCropper, {
    props: { imageUrl: 'blob:image' },
    global: { plugins: [...defaultPlugins()] }
  })
}
