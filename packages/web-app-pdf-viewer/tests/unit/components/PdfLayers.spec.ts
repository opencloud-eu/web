import { shallowRef } from 'vue'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import PdfLayers from '../../../src/components/PdfLayers.vue'
import { pdfLayersKey, type PdfLayerItem } from '../../../src/composables/usePdfLayers'

const items: PdfLayerItem[] = [
  { id: '5R', name: 'Background', isVisible: true },
  { name: 'Annotations', items: [{ id: '6R', name: 'Notes', isVisible: true }] },
  { name: null, items: [{ id: '7R', name: 'Comments', isVisible: false }] }
]

function createWrapper() {
  const setVisible = vi.fn()
  const wrapper = mount(PdfLayers, {
    props: { items },
    global: {
      plugins: [...defaultPlugins()],
      stubs: { 'oc-icon': true },
      provide: { [pdfLayersKey as symbol]: { layers: shallowRef(items), setVisible } }
    }
  })
  return { wrapper, setVisible }
}

function labels(wrapper: ReturnType<typeof createWrapper>['wrapper']) {
  return wrapper.findAll('.pdf-viewer-layer').map((layer) => layer.text())
}

describe('PdfLayers', () => {
  it('shows the layers, groups without a name collapsed like in the PDF.js viewer', () => {
    const { wrapper } = createWrapper()
    expect(labels(wrapper)).toEqual(['Background', 'Notes'])
    expect(wrapper.text()).toContain('Additional layers')
  })

  it('expands a group', async () => {
    const { wrapper } = createWrapper()
    await wrapper.findAll('.pdf-viewer-layers-toggle')[1].trigger('click')
    expect(labels(wrapper)).toEqual(['Background', 'Notes', 'Comments'])
  })

  it('shows and hides a layer', async () => {
    const { wrapper, setVisible } = createWrapper()
    await wrapper.find('.pdf-viewer-layer input').setValue(false)
    expect(setVisible).toHaveBeenCalledWith('5R', false)
  })
})
