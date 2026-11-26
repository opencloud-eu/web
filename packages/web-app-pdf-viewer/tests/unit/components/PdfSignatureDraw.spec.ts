import { nextTick } from 'vue'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import PdfSignatureDraw from '../../../src/components/PdfSignatureDraw.vue'
import type { DrawnCurves } from '../../../src/composables/usePdfSignature'

function createWrapper(modelValue: DrawnCurves = undefined) {
  const wrapper = mount(PdfSignatureDraw, {
    props: {
      modelValue,
      'onUpdate:modelValue': (value: DrawnCurves) => wrapper.setProps({ modelValue: value })
    },
    global: { plugins: [...defaultPlugins()], stubs: { 'oc-icon': true } }
  })
  const area = wrapper.find('svg').element
  area.setPointerCapture = vi.fn()
  area.getBoundingClientRect = () => ({ width: 300, height: 150 }) as DOMRect
  return wrapper
}

function pointer(type: string, offsetX: number, offsetY: number) {
  return Object.assign(new Event(type), { pointerId: 1, offsetX, offsetY })
}

describe('PdfSignatureDraw', () => {
  it('collects the strokes like the PDF.js signature dialog', async () => {
    const wrapper = createWrapper()
    const area = wrapper.find('svg').element
    area.dispatchEvent(pointer('pointerdown', 10.4, 20))
    area.dispatchEvent(pointer('pointermove', 30, 40.6))
    area.dispatchEvent(pointer('pointerup', 30, 41))
    area.dispatchEvent(pointer('pointermove', 50, 50))
    area.dispatchEvent(pointer('pointerdown', 60, 70))
    // The stroke being drawn shows, it's added once it ends.
    await nextTick()
    expect(wrapper.find('path').attributes('d')).toBe(' M 10 20 L 30 41 M 60 70')
    expect(wrapper.props('modelValue').curves).toHaveLength(1)
    area.dispatchEvent(pointer('pointerup', 60, 70))
    await nextTick()
    expect(wrapper.props('modelValue')).toEqual({
      width: 300,
      height: 150,
      thickness: 1,
      curves: [{ points: [10, 20, 30, 41] }, { points: [60, 70] }]
    })
    expect(wrapper.find('path').attributes('d')).toBe(' M 10 20 L 30 41 M 60 70')
  })

  // Like PDF.js' signature dialog: from 1 to 5, for the whole drawing.
  it('draws with the chosen thickness', async () => {
    const wrapper = createWrapper()
    const range = wrapper.find('.pdf-viewer-signature-thickness input')
    expect(range.attributes()).toMatchObject({ min: '1', max: '5', value: '1' })
    await range.setValue('4')
    const area = wrapper.find('svg').element
    area.dispatchEvent(pointer('pointerdown', 10, 20))
    area.dispatchEvent(pointer('pointerup', 10, 20))
    await nextTick()
    expect(wrapper.props('modelValue').thickness).toBe(4)
    expect(wrapper.find('path').attributes('stroke-width')).toBe('4')
    await range.setValue('2')
    expect(wrapper.props('modelValue').thickness).toBe(2)
    expect(wrapper.find('path').attributes('stroke-width')).toBe('2')
  })

  it('clears the drawing and its thickness', async () => {
    const wrapper = createWrapper({
      width: 1,
      height: 1,
      thickness: 3,
      curves: [{ points: [1, 2] }]
    })
    const range = wrapper.find<HTMLInputElement>('.pdf-viewer-signature-thickness input')
    expect(range.element.value).toBe('3')
    await wrapper.find('.pdf-viewer-signature-clear').trigger('click')
    expect(wrapper.props('modelValue')).toBeUndefined()
    expect(wrapper.find('p').text()).toBe('Draw your signature here')
    expect(range.element.value).toBe('1')
  })
})
