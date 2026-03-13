import { useExtensionRegistry, CustomComponentExtension, Extension } from '@opencloud-eu/web-pkg'
import SidebarNav from '../../../../src/components/SidebarNav/SidebarNav.vue'
import sidebarNavItemFixtures from '../../../__fixtures__/sidebarNavItems'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { h } from 'vue'

describe('OcSidebarNav', () => {
  it('renders navItems into a list', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.html()).toMatchSnapshot()
  })

  describe('dynamic extension points', () => {
    it('renders extensions for the main extension point', () => {
      const { wrapper } = getWrapper({
        route: '/files/spaces',
        extensions: [createExtensionMock('test-main-extension', 'app.files.sidebar-nav.main')]
      })
      expect(wrapper.find('[data-testid="extension-main"]').exists()).toBeTruthy()
    })

    it('renders extensions for the bottom extension point', () => {
      const { wrapper } = getWrapper({
        route: '/files/spaces',
        extensions: [createExtensionMock('test-bottom-extension', 'app.files.sidebar-nav.bottom')]
      })
      expect(wrapper.find('[data-testid="extension-bottom"]').exists()).toBeTruthy()
    })

    it('does not render extensions when no matching extensions exist', () => {
      const { wrapper } = getWrapper({
        route: '/files/spaces',
        extensions: []
      })
      expect(wrapper.find('[data-testid="extension-main"]').exists()).toBeFalsy()
      expect(wrapper.find('[data-testid="extension-bottom"]').exists()).toBeFalsy()
    })
  })
})

function getWrapper({
  closed = false,
  route = '/files/spaces',
  extensions = [] as Extension[]
} = {}) {
  const mocks = defaultComponentMocks({ currentRoute: mock({ path: route }) })

  const plugins = defaultPlugins({
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

  const { requestExtensions } = useExtensionRegistry()
  vi.mocked(requestExtensions).mockReturnValue(extensions)

  return {
    wrapper: mount(SidebarNav, {
      props: {
        navItems: sidebarNavItemFixtures,
        closed
      },
      global: {
        renderStubDefaultSlot: true,
        plugins,
        mocks,
        provide: mocks,
        stubs: { SidebarNavItem: true }
      }
    })
  }
}

function createExtensionMock(id: string, extensionPointId: string) {
  const testId = extensionPointId.includes('.main') ? 'extension-main' : 'extension-bottom'
  return mock<CustomComponentExtension>({
    id,
    type: 'customComponent',
    extensionPointIds: [extensionPointId],
    content: () => [
      h('div', {
        innerHTML: `Extension: ${id}`,
        'data-testid': testId
      })
    ]
  })
}
