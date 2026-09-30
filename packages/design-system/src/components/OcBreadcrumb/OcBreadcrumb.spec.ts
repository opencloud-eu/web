import { defaultPlugins, PartialComponentProps, shallowMount } from '@opencloud-eu/web-test-helpers'
import Breadcrumb from './OcBreadcrumb.vue'
import OcBreadcrumbItem from './OcBreadcrumbItem.vue'
import OcBreadcrumbContextMenu from './OcBreadcrumbContextMenu.vue'

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
  it('marks only the last list item as current', () => {
    const { wrapper } = getWrapper()
    const listItems = wrapper.findAll('.oc-breadcrumb-list oc-breadcrumb-item-stub')
    expect(listItems.map((item) => item.attributes('current'))).toEqual([
      'false',
      'false',
      'false',
      'true'
    ])
  })
  describe('context menu', () => {
    it('is rendered for the last list item if enabled via property', () => {
      const { wrapper } = getWrapper({ showContextActions: true })
      const lastItem = wrapper.findAll('.oc-breadcrumb-list-item').at(-1)
      expect(wrapper.findAllComponents(OcBreadcrumbContextMenu).length).toBe(1)
      expect(lastItem.findComponent(OcBreadcrumbContextMenu).exists()).toBe(true)
    })
    it('is not rendered if not enabled via property', () => {
      const { wrapper } = getWrapper({ showContextActions: false })
      expect(wrapper.findComponent(OcBreadcrumbContextMenu).exists()).toBe(false)
    })
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
      { items: [items[0], items[1]], shows: true }
    ])('shows if more than 1 breadcrumb item is given', ({ items, shows }) => {
      const { wrapper } = getWrapper({ items })
      expect(wrapper.find('.oc-breadcrumb-mobile-current').exists()).toBe(shows)
    })
    it('renders the last item as current item', () => {
      const { wrapper } = getWrapper()
      const current = wrapper.find('.oc-breadcrumb-mobile-current').findComponent(OcBreadcrumbItem)
      expect(current.props('item')).toEqual(items[3])
      expect(current.props('current')).toBe(true)
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
