import { defaultPlugins, mount, PartialComponentProps } from '@opencloud-eu/web-test-helpers'
import OcBreadcrumbItem from './OcBreadcrumbItem.vue'

describe('OcBreadcrumbItem', () => {
  it('renders a link if the item has a route', () => {
    const { wrapper } = getWrapper({ item: { text: 'Folder', to: { path: 'folder' } } })
    expect(wrapper.find('router-link-stub').exists()).toBe(true)
    expect(wrapper.find('button').exists()).toBe(false)
  })
  it('renders a button that triggers the click handler if the item has one', async () => {
    const onClick = vi.fn()
    const { wrapper } = getWrapper({ item: { text: 'Folder', onClick } })
    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
    await button.trigger('click')
    expect(onClick).toHaveBeenCalled()
  })
  it('renders plain text if the item is neither a link nor clickable', () => {
    const { wrapper } = getWrapper({ item: { text: 'Folder' } })
    expect(wrapper.find('router-link-stub').exists()).toBe(false)
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.text()).toBe('Folder')
  })
  it.each([
    { item: { text: 'Folder', to: { path: 'folder' } } },
    { item: { text: 'Folder', onClick: vi.fn() } }
  ])('marks the current item as current page and bold if it is clickable', ({ item }) => {
    const { wrapper } = getWrapper({ item, current: true })
    const root = wrapper.find('[aria-current="page"]')
    expect(root.exists()).toBe(true)
    expect(root.classes()).toContain('font-bold')
  })
  it('marks the current item as current page but not bold if it is plain text', () => {
    const { wrapper } = getWrapper({ item: { text: 'Folder' }, current: true })
    const root = wrapper.find('[aria-current="page"]')
    expect(root.exists()).toBe(true)
    expect(root.classes()).not.toContain('font-bold')
  })
  it('does not mark other items as current', () => {
    const { wrapper } = getWrapper({ item: { text: 'Folder', to: { path: 'folder' } } })
    expect(wrapper.find('[aria-current="page"]').exists()).toBe(false)
    expect(wrapper.find('.font-bold').exists()).toBe(false)
  })
  it('renders item icons passed via props', () => {
    const { wrapper } = getWrapper({
      item: { text: 'Vault', icon: 'resource-type-vault', iconAccessibleLabel: 'Encrypted vault' }
    })
    const icon = wrapper.findComponent({ name: 'OcIcon' })
    expect(icon.props('name')).toBe('resource-type-vault')
    expect(icon.props('accessibleLabel')).toBe('Encrypted vault')
  })
})

const getWrapper = (props: PartialComponentProps<typeof OcBreadcrumbItem>) => {
  return {
    wrapper: mount(OcBreadcrumbItem, {
      props: { item: { text: '' }, ...props },
      global: {
        plugins: [...defaultPlugins()],
        renderStubDefaultSlot: true,
        stubs: { 'router-link': true }
      }
    })
  }
}
