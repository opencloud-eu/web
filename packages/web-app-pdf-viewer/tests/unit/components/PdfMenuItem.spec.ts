import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import PdfMenuItem from '../../../src/components/PdfMenuItem.vue'

function createWrapper(
  props: { label: string; icon?: string; isActive?: boolean },
  onClick = vi.fn()
) {
  return mount(PdfMenuItem, {
    props,
    attrs: { class: 'my-item', 'data-value': 'x', onClick },
    global: { plugins: [...defaultPlugins()], stubs: { 'oc-icon': true } }
  })
}

describe('PdfMenuItem', () => {
  it('puts classes and data attributes on the button', () => {
    const button = createWrapper({ label: 'Item' }).find('button')
    expect(button.classes()).toContain('my-item')
    expect(button.attributes('data-value')).toBe('x')
    expect(button.text()).toBe('Item')
  })

  it.each([
    [true, 'true'],
    [false, undefined],
    [undefined, undefined]
  ])('marks the chosen option (active: %s)', (isActive, current) => {
    expect(
      createWrapper({ label: 'Item', isActive }).find('button').attributes('aria-current')
    ).toBe(current)
  })

  it('passes clicks on', async () => {
    const onClick = vi.fn()
    const wrapper = createWrapper({ label: 'Item', icon: 'add' }, onClick)
    await wrapper.find('button').trigger('click', { detail: 0 })
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick.mock.calls[0][0]).toBeInstanceOf(MouseEvent)
  })
})
