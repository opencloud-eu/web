import AccountInformation from '../../../../src/pages/account/accountInformation.vue'
import { flushPromises } from '@vue/test-utils'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import {
  Extension,
  ExtensionPoint,
  OptionsConfig,
  useExtensionRegistry,
  useMessages,
  useUserStore
} from '@opencloud-eu/web-pkg'
import { User } from '@opencloud-eu/web-client/graph/generated'
import { Graph } from '@opencloud-eu/web-client/graph'

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
  it('should not throw when the user gets reset, e.g. on logout', async () => {
    const { wrapper } = getWrapper()
    await flushPromises()
    useUserStore().user = null
    await flushPromises()
    expect(wrapper.find('#account-information').exists()).toBeFalsy()
  })

  describe('public link context', () => {
    it('should render a limited view', () => {
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
          mail: 'some-email'
        })
      })

      const accountPageInfo = wrapper.find(selectors.accountPageInfo)
      expect(accountPageInfo.html()).toMatchSnapshot()
    })

    describe('group membership', () => {
      it('loads the group memberships of the current user', () => {
        const { mocks } = getWrapper()

        expect(mocks.$clientService.graphAuthenticated.users.getMe).toHaveBeenCalledWith(
          { expand: ['memberOf'] },
          expect.anything()
        )
      })
      it('displays message if not member of any groups', async () => {
        const { wrapper } = getWrapper()
        await flushPromises()

        const groupNamesEmpty = wrapper.find(selectors.groupNamesEmpty)
        expect(groupNamesEmpty.exists()).toBeTruthy()
      })
      it('stores the loaded group memberships in the user store', async () => {
        const memberOf = [{ displayName: 'one' }, { displayName: 'two' }]
        getWrapper({ memberOf })
        await flushPromises()

        const userStore = useUserStore()
        expect(userStore.setUser).toHaveBeenCalledWith(expect.objectContaining({ memberOf }))
      })
      it('displays group names', () => {
        const { wrapper } = getWrapper({
          user: mock<User>({
            memberOf: [{ displayName: 'one' }, { displayName: 'two' }, { displayName: 'three' }]
          })
        })

        expect(wrapper.find(selectors.groupNames).text()).toBe('one, two, three')
      })
      describe('failed load', () => {
        beforeEach(() => {
          vi.spyOn(console, 'error').mockImplementation(() => undefined)
        })

        it('shows an error message instead of claiming no group memberships', async () => {
          const error = new Error('Request failed with status code 500')
          const { wrapper } = getWrapper({ getMe: () => Promise.reject(error) })
          await flushPromises()

          const { showErrorMessage } = useMessages()
          expect(showErrorMessage).toHaveBeenCalledWith({
            title: 'Failed to load group memberships',
            errors: [error]
          })
          expect(wrapper.find(selectors.groupNamesEmpty).exists()).toBeFalsy()
        })
        it('stays silent when leaving the page cancels the load', async () => {
          let requestSignal: AbortSignal
          const { wrapper } = getWrapper({
            getMe: (_, { signal }) => {
              requestSignal = signal
              return new Promise((_, reject) => {
                signal.addEventListener('abort', () =>
                  reject(new DOMException('The operation was aborted.', 'AbortError'))
                )
              })
            }
          })
          await flushPromises()
          wrapper.unmount()
          await flushPromises()

          expect(requestSignal.aborted).toBe(true)
          const { showErrorMessage } = useMessages()
          expect(showErrorMessage).not.toHaveBeenCalled()
        })
      })
    })

    describe('Logout from all devices link', () => {
      it('should render the logout from active devices if logoutUrl is provided', () => {
        const { wrapper } = getWrapper()

        expect(wrapper.find('[data-testid="logout"]').exists()).toBe(true)
      })
      it("shouldn't render the logout from active devices if logoutUrl isn't provided", () => {
        const { wrapper } = getWrapper()

        ;(wrapper.vm as any).logoutUrl = undefined
        expect(wrapper.find('[data-testid="logout"]').exists()).toBe(true)
      })
      it('should use url from configuration manager', () => {
        const { wrapper } = getWrapper()

        const logoutButton = wrapper.find(selectors.logoutButton)
        expect(logoutButton.attributes('href')).toBe('https://account-manager/logout')
      })
    })
  })
})

function getWrapper({
  user = mock<User>(),
  memberOf = [],
  accountEditLink = undefined,
  isPublicLinkContext = false,
  isUserContext = true,
  extensionPoints = [],
  extensions = [],
  getMe
}: {
  user?: User
  memberOf?: User['memberOf']
  accountEditLink?: OptionsConfig['accountEditLink']
  isPublicLinkContext?: boolean
  isUserContext?: boolean
  extensionPoints?: ExtensionPoint<Extension>[]
  extensions?: Extension[]
  getMe?: Graph['users']['getMe']
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

  mocks.$clientService.graphAuthenticated.users.getMe.mockResolvedValue(
    mock<User>({ id: '1', memberOf })
  )
  if (getMe) {
    mocks.$clientService.graphAuthenticated.users.getMe.mockImplementation(getMe)
  }

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
