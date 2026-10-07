import SidebarNavItem from '../../../../src/components/SidebarNav/SidebarNavItem.vue'
import sidebarNavItemFixtures from '../../../__fixtures__/sidebarNavItems'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'

const exampleNavItem = sidebarNavItemFixtures[0]

const propsData = {
  name: exampleNavItem.name,
  active: false,
  target: exampleNavItem.route.path,
  icon: exampleNavItem.icon,
  index: '5',
  id: '123'
}

describe('OcSidebarNav', () => {
  it('renders navItem without toolTip if expanded', () => {
    const { wrapper } = getWrapper(false)
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('renders navItem with toolTip if collapsed', () => {
    const { wrapper } = getWrapper(true)
    expect(wrapper.html()).toMatchSnapshot()
  })

  describe('icon', () => {
    it('renders a named icon in the given fill type regardless of its own fill type', () => {
      const { wrapper } = getWrapper(false, {
        icon: { name: 'folder', fillType: 'fill', color: 'red' },
        fillType: 'line'
      })
      expect(wrapper.findComponent({ name: 'OcIcon' }).props('icon')).toEqual({
        name: 'folder',
        fillType: 'line',
        color: 'red'
      })
    })
    it('renders an icon name in the given fill type', () => {
      const { wrapper } = getWrapper(false, { icon: 'folder', fillType: 'line' })
      expect(wrapper.findComponent({ name: 'OcIcon' }).props('icon')).toEqual({
        name: 'folder',
        fillType: 'line'
      })
    })
    it('renders an image icon as declared', () => {
      const { wrapper } = getWrapper(false, { icon: { src: 'logo.png' }, fillType: 'line' })
      expect(wrapper.findComponent({ name: 'OcIcon' }).props('icon')).toEqual({ src: 'logo.png' })
    })
  })
})

function getWrapper(collapsed: boolean, props: Record<string, unknown> = {}) {
  return {
    wrapper: mount(SidebarNavItem, {
      props: {
        ...propsData,
        collapsed,
        ...props
      },
      global: {
        plugins: [...defaultPlugins()],
        stubs: { 'router-link': true },
        renderStubDefaultSlot: 'icon' in props
      }
    })
  }
}
