import { Capabilities } from '@opencloud-eu/web-client/ocs'
import {
  ApplicationInformation,
  AppMenuItemExtension,
  useExtensionRegistry
} from '@opencloud-eu/web-pkg'
import { mock } from 'vitest-mock-extended'
import { computed } from 'vue'
import TopBar from '../../../../src/components/Topbar/TopBar.vue'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'

const mockUseEmbedMode = vi.fn().mockReturnValue({ isEnabled: computed(() => false) })

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useEmbedMode: vi.fn().mockImplementation(() => mockUseEmbedMode())
}))

describe('Top Bar component', () => {
  it('Displays applications menu', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find('applications-menu-stub').exists()).toBeTruthy()
  })
  it('hides the applications menu in a guest context', () => {
    const { wrapper } = getWrapper({ userContextReady: false, guestContextReady: true })
    expect(wrapper.find('applications-menu-stub').exists()).toBeFalsy()
  })
  it('links the logo of a guest to their shares', () => {
    const { wrapper } = getWrapper({ userContextReady: false, guestContextReady: true })
    expect((wrapper.vm as any).homeLink).toEqual({ name: 'files-guest-shares' })
  })
  describe('notifications bell', () => {
    it('should display in authenticated context if announced via capabilities', () => {
      const { wrapper } = getWrapper({
        capabilities: {
          notifications: { 'ocs-endpoints': ['list', 'get', 'delete'] }
        }
      })
      expect(wrapper.find('notifications-stub').exists()).toBeTruthy()
    })
    it('should not display in an unauthenticated context', () => {
      const { wrapper } = getWrapper({
        userContextReady: false,
        capabilities: {
          notifications: { 'ocs-endpoints': ['list', 'get', 'delete'] }
        }
      })
      expect(wrapper.find('notifications-stub').exists()).toBeFalsy()
    })
    it('should not display if endpoint list is missing', () => {
      const { wrapper } = getWrapper({
        capabilities: { notifications: { 'ocs-endpoints': [] } }
      })
      expect(wrapper.find('notifications-stub').exists()).toBeFalsy()
    })
  })
  it.each(['applications-menu', 'feedback-link', 'notifications', 'user-menu'])(
    'should hide %s when mode is "embed"',
    (componentName) => {
      mockUseEmbedMode.mockReturnValue({
        isEnabled: computed(() => true)
      })

      const { wrapper } = getWrapper()
      expect(wrapper.find(`${componentName}-stub`).exists()).toBeFalsy()
    }
  )
  it.each(['applications-menu', 'feedback-link', 'notifications', 'user-menu'])(
    'should not hide %s when mode is not "embed"',
    (componentName) => {
      mockUseEmbedMode.mockReturnValue({
        isEnabled: computed(() => false)
      })

      const { wrapper } = getWrapper({
        capabilities: {
          notifications: { 'ocs-endpoints': ['list', 'get', 'delete'] }
        }
      })
      expect(wrapper.find(`${componentName}-stub`).exists()).toBeTruthy()
    }
  )
})

const getWrapper = ({
  capabilities = {},
  userContextReady = true,
  guestContextReady = false
}: {
  capabilities?: Partial<Capabilities['capabilities']>
  userContextReady?: boolean
  guestContextReady?: boolean
} = {}) => {
  const mocks = { ...defaultComponentMocks() }

  const plugins = defaultPlugins({
    piniaOptions: {
      authState: { userContextReady, guestContextReady },
      capabilityState: { capabilities },
      configState: { options: { disableFeedbackLink: false } }
    }
  })

  const extensionRegistry = useExtensionRegistry()
  vi.mocked(extensionRegistry.requestExtensions).mockReturnValue([mock<AppMenuItemExtension>()])

  return {
    wrapper: shallowMount(TopBar, {
      props: {
        applicationsList: [
          mock<ApplicationInformation>({
            icon: ''
          })
        ]
      },
      global: {
        plugins,
        stubs: { 'router-link': true, notifications: true },
        mocks,
        provide: mocks
      }
    })
  }
}
