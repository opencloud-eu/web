import SidebarNavMobile from '../../../../src/components/SidebarNav/SidebarNavMobile.vue'
import { defaultPlugins, defaultComponentMocks, mount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { NavItem } from '@opencloud-eu/web-pkg'
import { enableAutoUnmount } from '@vue/test-utils'

enableAutoUnmount(afterEach)
afterEach(() => {
  document.body.innerHTML = ''
})

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

  it('moves focus into the menu and returns it to the toggle on Escape', async () => {
    const { wrapper } = getWrapper()
    const toggle = wrapper.get<HTMLButtonElement>(selectors.mobileNavBtn)
    toggle.element.focus()

    await toggle.trigger('click')
    const panel = wrapper.get('#sidebar-nav-mobile-panel')
    expect(document.activeElement).toBe(panel.element)

    await panel.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('#sidebar-nav-mobile-panel').exists()).toBe(false)
    expect(document.activeElement).toBe(toggle.element)
  })

  it.each([
    { shiftKey: false, targets: ['button', 'a[href="/files"]', 'a[href="/favorites"]', 'button'] },
    {
      shiftKey: true,
      targets: ['a[href="/favorites"]', 'a[href="/files"]', 'button', 'a[href="/favorites"]']
    }
  ])(
    'handles every Tab step inside the menu (shiftKey=$shiftKey)',
    async ({ shiftKey, targets }) => {
      const { wrapper } = getWrapper()
      await wrapper.get(selectors.mobileNavBtn).trigger('click')
      const panel = wrapper.get('#sidebar-nav-mobile-panel')

      for (const target of targets) {
        const event = new KeyboardEvent('keydown', {
          key: 'Tab',
          shiftKey,
          bubbles: true,
          cancelable: true
        })
        document.activeElement.dispatchEvent(event)

        expect(event.defaultPrevented).toBe(true)
        expect(document.activeElement).toBe(panel.get(target).element)
      }
    }
  )
})

function getWrapper({ isTablet = true, navItems: items = navItems } = {}) {
  mockIsTablet = isTablet
  mockNavItems = items

  const mocks = {
    ...defaultComponentMocks()
  }

  return {
    wrapper: mount(SidebarNavMobile, {
      attachTo: document.body,
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        provide: mocks,
        stubs: {
          VersionCheck: true,
          SidebarNav: {
            template: `<aside>
              <a href="/files">Files</a>
              <button disabled>Disabled</button>
              <a href="/skipped" tabindex="-1">Skipped</a>
              <button style="display: none">Hidden</button>
              <a href="/favorites">Favorites</a>
            </aside>`
          },
          Teleport: true
        },
        renderStubDefaultSlot: true
      }
    })
  }
}
