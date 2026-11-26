import { defaultPlugins, mount, ocDropStub } from '@opencloud-eu/web-test-helpers'
import PdfZoomMenu from '../../../src/components/PdfZoomMenu.vue'

function createWrapper(scaleValue = 'auto', scale = 1) {
  return mount(PdfZoomMenu, {
    props: { scaleValue, scale },
    global: {
      plugins: [...defaultPlugins()],
      stubs: { 'oc-icon': true, 'oc-drop': ocDropStub }
    }
  })
}

describe('PdfZoomMenu', () => {
  it.each([
    ['auto', 1.25, '125%'],
    ['page-width', 0.8, '80%'],
    ['1.1', 1.1, '110%']
  ])('shows the actual zoom for %s', (scaleValue, scale, label) => {
    expect(createWrapper(scaleValue, scale).find('.pdf-viewer-zoom-label').text()).toBe(label)
  })

  it('offers zoom presets and marks the current one', () => {
    const wrapper = createWrapper('page-fit')
    const options = wrapper.findAll('.pdf-viewer-scale-option')
    expect(options.map((o) => o.text())).toEqual(
      expect.arrayContaining(['Page width', 'Page fit', '50%', '400%'])
    )
    const current = options.find((o) => o.attributes('data-scale') === 'page-fit')
    expect(current.attributes('aria-current')).toBe('true')
  })

  it('emits the selected zoom', async () => {
    const wrapper = createWrapper()
    await wrapper.find('.pdf-viewer-scale-option[data-scale="0.5"]').trigger('click')
    expect(wrapper.emitted('setScale')).toEqual([['0.5']])
  })
})
