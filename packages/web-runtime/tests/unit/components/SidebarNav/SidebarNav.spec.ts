import SidebarNav from '../../../../src/components/SidebarNav/SidebarNav.vue'
import sidebarNavItemFixtures from '../../../__fixtures__/sidebarNavItems'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'

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
