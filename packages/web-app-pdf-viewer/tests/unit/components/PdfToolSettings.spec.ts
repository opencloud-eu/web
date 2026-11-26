import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import PdfToolSettings from '../../../src/components/PdfToolSettings.vue'
import type { ToolSetting } from '../../../src/composables/usePdfAnnotationTools'

const settings: ToolSetting[] = [
  { id: 'color', label: 'Color', type: 'color', paramType: 1, default: '#000000' },
  {
    id: 'tint',
    label: 'Tint',
    type: 'swatches',
    paramType: 2,
    default: '#FFFF98',
    options: [
      { value: '#FFFF98', label: 'Yellow' },
      { value: '#53FFBC', label: 'Green' }
    ]
  },
  { id: 'size', label: 'Size', type: 'range', min: 1, max: 20, paramType: 3, default: 1 }
]

function createWrapper(values = {}) {
  return mount(PdfToolSettings, {
    props: {
      settings,
      values: { color: '#000000', tint: '#ffff98', size: 4, ...values }
    },
    global: { plugins: [...defaultPlugins()], stubs: { 'oc-icon': true } }
  })
}

describe('PdfToolSettings', () => {
  it('shows the current values', () => {
    const wrapper = createWrapper()
    expect((wrapper.find('.pdf-viewer-color input').element as HTMLInputElement).value).toBe(
      '#000000'
    )
    expect((wrapper.find('.pdf-viewer-size input').element as HTMLInputElement).value).toBe('4')
    // Case-insensitive, PDF.js reports colors in either case.
    expect(wrapper.findAll('.pdf-viewer-swatch').map((s) => s.attributes('aria-pressed'))).toEqual([
      'true',
      'false'
    ])
  })

  it('emits a new color', async () => {
    const wrapper = createWrapper()
    const input = wrapper.find('.pdf-viewer-color input')
    ;(input.element as HTMLInputElement).value = '#ff0000'
    await input.trigger('input')
    expect(wrapper.emitted('update')).toContainEqual([settings[0].paramType, '#ff0000'])
  })

  it('emits the chosen swatch', async () => {
    const wrapper = createWrapper()
    await wrapper.findAll('.pdf-viewer-swatch')[1].trigger('click')
    expect(wrapper.emitted('update')).toEqual([[settings[1].paramType, '#53FFBC']])
  })

  it('emits range values as numbers', async () => {
    const wrapper = createWrapper()
    const input = wrapper.find('.pdf-viewer-size input')
    ;(input.element as HTMLInputElement).value = '12'
    await input.trigger('input')
    expect(wrapper.emitted('update')).toEqual([[settings[2].paramType, 12]])
  })
})
