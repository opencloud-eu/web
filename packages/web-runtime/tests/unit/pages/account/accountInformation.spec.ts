import AccountInformation from '../../../../src/pages/account/accountInformation.vue'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import {
  Extension,
  ExtensionPoint,
  OptionsConfig,
  useExtensionRegistry
} from '@opencloud-eu/web-pkg'
import { User } from '@opencloud-eu/web-client/graph/generated'

const $route = {
  meta: {
    title: 'Some Title'
  }
}

const selectors = {
  editUrlButton: '[data-testid="account-page-edit-url-btn"]',
  logoutButton: '[data-testid="account-page-logout-url-btn"]',
  accountPageInfo: '.account-page-info',
  groupNames: '[data-testid="group-names"]',
  groupNamesEmpty: '[data-testid="group-names-empty"]'
}

describe('account information page', () => {
  describe('public link context', () => {
    it('should render a limited view', async () => {
      const { wrapper } = getWrapper({ isUserContext: false, isPublicLinkContext: true })

      expect(wrapper.html()).toMatchSnapshot()
    })
  })

  describe('header section', () => {
    describe('edit url button', () => {
      it('should be displayed if defined via config', () => {
        const { wrapper } = getWrapper({
          accountEditLink: { href: '/' }
        })

        const editUrlButton = wrapper.find(selectors.editUrlButton)
        expect(editUrlButton.html()).toMatchSnapshot()
      })
      it('should not be displayed if not defined via config', () => {
        const { wrapper } = getWrapper()

        const editUrlButton = wrapper.find(selectors.editUrlButton)
        expect(editUrlButton.exists()).toBeFalsy()
      })
    })
  })

  describe('account information section', () => {
    it('displays basic user information', () => {
      const { wrapper } = getWrapper({
        user: mock<User>({
          onPremisesSamAccountName: 'some-username',
          displayName: 'some-displayname',
          mail: 'some-email',
          memberOf: []
        })
      })

      const accountPageInfo = wrapper.find(selectors.accountPageInfo)
      expect(accountPageInfo.html()).toMatchSnapshot()
    })

    describe('group membership', () => {
      it('displays message if not member of any groups', () => {
        const { wrapper } = getWrapper()

        const groupNamesEmpty = wrapper.find(selectors.groupNamesEmpty)
        expect(groupNamesEmpty.exists()).toBeTruthy()
      })
      it('displays group names', () => {
        const { wrapper } = getWrapper({
          user: mock<User>({
            memberOf: [{ displayName: 'one' }, { displayName: 'two' }, { displayName: 'three' }]
          })
        })

        const groupNames = wrapper.find(selectors.groupNames)
        expect(groupNames.html()).toMatchSnapshot()
      })
    })

    describe('Logout from all devices link', () => {
      it('should render the logout from active devices if logoutUrl is provided', async () => {
        const { wrapper } = getWrapper()

        expect(wrapper.find('[data-testid="logout"]').exists()).toBe(true)
      })
      it("shouldn't render the logout from active devices if logoutUrl isn't provided", async () => {
        const { wrapper } = getWrapper()

        ;(wrapper.vm as any).logoutUrl = undefined
        expect(wrapper.find('[data-testid="logout"]').exists()).toBe(true)
      })
      it('should use url from configuration manager', async () => {
        const { wrapper } = getWrapper()

        const logoutButton = wrapper.find(selectors.logoutButton)
        expect(logoutButton.attributes('href')).toBe('https://account-manager/logout')
      })
    })
  })
})

function getWrapper({
  user = mock<User>({ memberOf: [] }),
  accountEditLink = undefined,
  isPublicLinkContext = false,
  isUserContext = true,
  extensionPoints = [],
  extensions = []
}: {
  user?: User
  accountEditLink?: OptionsConfig['accountEditLink']
  isPublicLinkContext?: boolean
  isUserContext?: boolean
  extensionPoints?: ExtensionPoint<Extension>[]
  extensions?: Extension[]
} = {}) {
  const plugins = defaultPlugins({
    piniaOptions: {
      userState: { user },
      authState: {
        userContextReady: isUserContext,
        publicLinkContextReady: isPublicLinkContext
      },
      configState: {
        options: {
          logoutUrl: 'https://account-manager/logout',
          ...(accountEditLink && { accountEditLink })
        }
      }
    }
  })

  const { getExtensionPoints, requestExtensions } = useExtensionRegistry()
  vi.mocked(getExtensionPoints).mockReturnValue(extensionPoints)
  vi.mocked(requestExtensions).mockReturnValue(extensions)

  const mocks = {
    ...defaultComponentMocks(),
    $route
  }

  mocks.$clientService.graphAuthenticated.users.getMe.mockResolvedValue(mock<User>({ id: '1' }))

  return {
    mocks,
    wrapper: mount(AccountInformation, {
      global: {
        plugins,
        mocks,
        provide: mocks
      }
    })
  }
}
