import MobileNav from '../../../../src/components/Navigation/MobileNav.vue'
import { defaultPlugins, defaultComponentMocks, mount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { NavItem } from '../../../../src/composables/navItems'

const selectors = {
  mobileNavBtn: '#mobile-nav-button',
  mobileNavItem: '.mobile-nav-item'
}

const navItems = [
  mock<NavItem>({ name: 'nav1', active: true }),
  mock<NavItem>({ name: 'nav2', active: false })
]

vi.mock('@opencloud-eu/design-system/composables', async (importOriginal) => {
  const original = await importOriginal<any>()
  return { ...original, useIsMobile: () => ({ isMobile: true }) }
})
vi.mock('../../../../src/composables/navItems/useNavItems', () => ({
  useNavItems: () => ({ navItems })
}))

describe('MobileNav component', () => {
  it('renders the active nav item', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find(selectors.mobileNavBtn).exists()).toBeTruthy()
    expect(wrapper.find(selectors.mobileNavBtn).text()).toEqual(navItems[0].name)
  })
  it('renders all nav items inside the drop menu', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.findAll(selectors.mobileNavItem).length).toBe(navItems.length)
  })
})

function getWrapper() {
  const mocks = {
    ...defaultComponentMocks()
  }

  return {
    wrapper: mount(MobileNav, {
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        stubs: {
          VersionCheck: true,
          OcDrop: true
        },
        renderStubDefaultSlot: true
      }
    })
  }
}
