import { defaultPlugins, PartialComponentProps, shallowMount } from '@opencloud-eu/web-test-helpers'
import Breadcrumb from './OcBreadcrumb.vue'

const items = [
  { text: 'First folder', to: { path: 'folder' } },
  { text: 'Subfolder', onClick: () => alert('Breadcrumb clicked!') },
  { text: 'Deep', to: { path: 'folder' } },
  { text: 'Deeper ellipsize in responsive mode' }
]

describe('OcBreadcrumb', () => {
  it('sets correct variation', () => {
    const { wrapper } = getWrapper({ variation: 'lead' })
    expect(wrapper.props().variation).toMatch('lead')
    expect(wrapper.find('.oc-breadcrumb').attributes('class')).toContain('oc-breadcrumb-lead')
    expect(wrapper.html()).toMatchSnapshot()
  })
  it('displays all items', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.findAll('.oc-breadcrumb-list-item:not(.sr-only)').length).toBe(items.length)
    expect(wrapper.html()).toMatchSnapshot()
  })
  it('displays context menu trigger if enabled via property', () => {
    const { wrapper } = getWrapper({ showContextActions: true })
    expect(wrapper.find('#oc-breadcrumb-contextmenu-trigger').exists()).toBe(true)
  })
  it('does not display context menu trigger if not enabled via property', () => {
    const { wrapper } = getWrapper({ showContextActions: false })
    expect(wrapper.find('#oc-breadcrumb-contextmenu-trigger').exists()).toBe(false)
  })
  describe('mobile navigation', () => {
    it.each([
      { items: [], shows: false },
      { items: [items[0]], shows: false },
      { items: [items[0], items[1]], shows: true }
    ])('shows if more than 1 breadcrumb item is given', ({ items, shows }) => {
      const { wrapper } = getWrapper({ items })
      expect(wrapper.find('.oc-breadcrumb-mobile-navigation').exists()).toBe(shows)
    })
  })
  describe('mobile current folder', () => {
    it.each([
      { items: [], shows: false },
      { items: [items[0]], shows: false },
      { items: [items[0], items[1]], shows: true }
    ])('shows if more than 1 breadcrumb item is given', ({ items, shows }) => {
      const { wrapper } = getWrapper({ items })
      expect(wrapper.find('.oc-breadcrumb-mobile-current').exists()).toBe(shows)
    })
  })
  describe('mobile breakpoint', () => {
    it.each<{ breakpoint: 'sm' | 'md' | 'lg'; listClass: string }>([
      { breakpoint: 'sm', listClass: 'sm:flex' },
      { breakpoint: 'md', listClass: 'md:flex' },
      { breakpoint: 'lg', listClass: 'lg:flex' }
    ])('sets the correct tailwind class on the breadcrumb list', ({ breakpoint, listClass }) => {
      const { wrapper } = getWrapper({ items, mobileBreakpoint: breakpoint })
      expect(wrapper.find('.oc-breadcrumb-list').classes()).toContain(listClass)
    })
    it.each<{ breakpoint: 'sm' | 'md' | 'lg'; listClass: string }>([
      { breakpoint: 'sm', listClass: 'sm:hidden' },
      { breakpoint: 'md', listClass: 'md:hidden' },
      { breakpoint: 'lg', listClass: 'lg:hidden' }
    ])('sets the correct tailwind class on the mobile breadcrumbs', ({ breakpoint, listClass }) => {
      const { wrapper } = getWrapper({ items, mobileBreakpoint: breakpoint })
      expect(wrapper.find('.oc-breadcrumb-mobile-navigation').classes()).toContain(listClass)
      expect(wrapper.find('.oc-breadcrumb-mobile-current').classes()).toContain(listClass)
    })
  })
})

const getWrapper = (props: PartialComponentProps<typeof Breadcrumb> = {}) => {
  return {
    wrapper: shallowMount(Breadcrumb, {
      props: {
        items,
        ...props
      },
      global: { renderStubDefaultSlot: true, plugins: [...defaultPlugins()] }
    })
  }
}
