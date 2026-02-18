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
