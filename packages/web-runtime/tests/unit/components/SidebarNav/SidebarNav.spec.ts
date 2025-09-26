import SidebarNav from '../../../../src/components/SidebarNav/SidebarNav.vue'
import sidebarNavItemFixtures from '../../../__fixtures__/sidebarNavItems'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'

vi.mock('uuid', () => ({
  v4: () => {
    return '00000000-0000-0000-0000-000000000000'
  }
}))

const slots = {
  bottom: '<span class="footer">Footer</span>'
}

describe('OcSidebarNav', () => {
  it('displays a bottom slot if given', () => {
    const { wrapper } = getWrapper({ slots })
    expect(wrapper.findAll('.footer').length).toBe(1)
  })
  it('renders navItems into a list', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.html()).toMatchSnapshot()
  })
  it('expands the navbar in open state', () => {
    const { wrapper } = getWrapper({ closed: false })
    expect(wrapper.find('.toggle-sidebar-button').attributes('aria-expanded')).toBe('true')
  })
  it('collapses the navbar in closed state', () => {
    const { wrapper } = getWrapper({ closed: true })
    expect(wrapper.find('.toggle-sidebar-button').attributes('aria-expanded')).toBe('false')
  })
  it('emits "update:nav-bar-closed" upon button click', async () => {
    const { wrapper } = getWrapper()
    await wrapper.find('.toggle-sidebar-button').trigger('click')
    expect(wrapper.emitted('update:nav-bar-closed').length).toBeGreaterThan(0)
  })
  it('initially sets the highlighter to the active nav item', async () => {
    const { wrapper } = getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.highlighterAttrs).toEqual({
      style: {
        transform: 'translateY(0px)',
        'transition-duration': '0.2s'
      }
    })
  })
  describe('VersionCheck component', () => {
    it('renders when capability "check-for-updates" is true', () => {
      const { wrapper } = getWrapper({ closed: false, checkForUpdates: true })
      expect(wrapper.findComponent({ name: 'version-check' }).exists()).toBeTruthy()
    })
    it('does not render when capability "check-for-updates" is false', () => {
      const { wrapper } = getWrapper({ closed: false, checkForUpdates: false })
      expect(wrapper.findComponent({ name: 'version-check' }).exists()).toBeFalsy()
    })
  })
})

function getWrapper({ closed = false, checkForUpdates = true, slots = {} } = {}) {
  const mocks = defaultComponentMocks()

  return {
    wrapper: mount(SidebarNav, {
      slots,
      props: {
        navItems: sidebarNavItemFixtures,
        closed
      },
      global: {
        renderStubDefaultSlot: true,
        plugins: [
          ...defaultPlugins({
            piniaOptions: {
              capabilityState: {
                capabilities: {
                  core: {
                    'check-for-updates': checkForUpdates,
                    status: { productversion: '3.5.0' }
                  }
                }
              }
            }
          })
        ],
        mocks,
        provide: mocks,
        stubs: { SidebarNavItem: true }
      }
    })
  }
}
