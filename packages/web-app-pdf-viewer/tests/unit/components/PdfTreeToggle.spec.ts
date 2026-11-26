import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import PdfTreeToggle from '../../../src/components/PdfTreeToggle.vue'

function createWrapper(isExpanded: boolean) {
  return mount(PdfTreeToggle, {
    props: { isExpanded },
    global: { plugins: [...defaultPlugins()], stubs: { 'oc-icon': true } }
  })
}

describe('PdfTreeToggle', () => {
  it.each([
    [true, 'Collapse', 'true'],
    [false, 'Expand', 'false']
  ])('expanded %s: labelled %s', (isExpanded, label, ariaExpanded) => {
    const button = createWrapper(isExpanded).find('button')
    expect(button.attributes('aria-label')).toBe(label)
    expect(button.attributes('aria-expanded')).toBe(ariaExpanded)
  })

  it('emits toggle on click, with Shift for the entries below as well', async () => {
    const wrapper = createWrapper(false)
    await wrapper.find('button').trigger('click')
    await wrapper.find('button').trigger('click', { shiftKey: true })
    expect(wrapper.emitted('toggle')).toEqual([[false], [true]])
  })
})
