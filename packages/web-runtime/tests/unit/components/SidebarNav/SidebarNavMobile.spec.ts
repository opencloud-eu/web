import SidebarNavMobile from '../../../../src/components/SidebarNav/SidebarNavMobile.vue'
import { defaultPlugins, defaultComponentMocks, mount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { NavItem } from '@opencloud-eu/web-pkg'

const selectors = {
  mobileNavBtn: '#mobile-nav-button',
  mobileNavItem: '.oc-sidebar-nav-item'
}

const navItems = [
  mock<NavItem>({ name: 'nav1', active: true }),
  mock<NavItem>({ name: 'nav2', active: false })
]

let mockIsTablet = true
let mockNavItems = navItems

vi.mock('@opencloud-eu/design-system/composables', async (importOriginal) => {
  const original = await importOriginal<any>()
  return { ...original, useIsMobile: () => ({ isTablet: mockIsTablet }) }
})
vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => {
  const original = await importOriginal<any>()
  return {
    ...original,
    useNavItems: () => ({ navItems: mockNavItems }),
    useExtensionRegistry: () => ({ requestExtensions: vi.fn(() => []) })
  }
})

describe('SidebarNavMobile component', () => {
  it('renders the mobile nav button', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find(selectors.mobileNavBtn).exists()).toBe(true)
  })

  it('does not render if not tablet', () => {
    const { wrapper } = getWrapper({ isTablet: false })
    expect(wrapper.find('#mobile-nav').exists()).toBe(false)
  })

  it('does not render if navItems are empty', () => {
    const { wrapper } = getWrapper({ navItems: [] })
    expect(wrapper.find('#mobile-nav').exists()).toBe(false)
  })
})

function getWrapper({ isTablet = true, navItems: items = navItems } = {}) {
  mockIsTablet = isTablet
  mockNavItems = items

  const mocks = {
    ...defaultComponentMocks()
  }

  return {
    wrapper: mount(SidebarNavMobile, {
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        provide: mocks,
        stubs: {
          VersionCheck: true,
          SidebarNav: true,
          Teleport: true
        },
        renderStubDefaultSlot: true
      }
    })
  }
}
