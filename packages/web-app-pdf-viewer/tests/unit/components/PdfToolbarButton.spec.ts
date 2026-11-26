import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import PdfToolbarButton from '../../../src/components/PdfToolbarButton.vue'

type Props = InstanceType<typeof PdfToolbarButton>['$props']

function createWrapper(props: Partial<Props> = {}, slots = {}) {
  return mount(PdfToolbarButton, {
    props: { label: 'Print', icon: 'printer', ...props },
    slots,
    global: { plugins: [...defaultPlugins()], stubs: { 'oc-icon': true } }
  })
}

describe('PdfToolbarButton', () => {
  it('is labelled for tooltips and screen readers', () => {
    expect(createWrapper().find('button').attributes('aria-label')).toBe('Print')
  })

  it.each([
    [true, 'true'],
    [false, 'false'],
    [undefined, undefined]
  ])('is a toggle button only with a state (active: %s)', (isActive, pressed) => {
    expect(createWrapper({ isActive }).find('button').attributes('aria-pressed')).toBe(pressed)
  })

  it('shows the spinner instead of the icon', () => {
    const wrapper = createWrapper({ showSpinner: true })
    expect(wrapper.find('oc-icon-stub[name="printer"]').exists()).toBe(false)
    expect(wrapper.find('.oc-spinner').exists()).toBe(true)
  })

  it('shows content instead of the icon, a chevron for drops', () => {
    const wrapper = createWrapper(
      { icon: undefined, hasDropdown: true },
      { default: '<span class="zoom">100%</span>' }
    )
    expect(wrapper.find('.zoom').text()).toBe('100%')
    expect(wrapper.find('oc-icon-stub[name="arrow-down-s"]').exists()).toBe(true)
  })
})
