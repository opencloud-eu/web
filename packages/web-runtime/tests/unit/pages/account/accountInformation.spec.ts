import AccountInformation from '../../../../src/pages/account/accountInformation.vue'
import { flushPromises } from '@vue/test-utils'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { OptionsConfig, useMessages, useUserStore } from '@opencloud-eu/web-pkg'
import { User } from '@opencloud-eu/web-client/graph/generated'
import { Graph } from '@opencloud-eu/web-client/graph'
import { AxiosResponse } from 'axios'

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
  groupNamesEmpty: '[data-testid="group-names-empty"]',
  twoFactor: '[data-testid="two-factor"]',
  twoFactorSwitch: '[data-testid="account-page-two-factor-switch"]',
  twoFactorButton: '[data-testid="account-page-two-factor-btn"]'
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

    describe('two-factor authentication', () => {
      it('requests the state from the builtin IDP', async () => {
        const { mocks } = getWrapper()
        await flushPromises()

        expect(mocks.$clientService.httpUnAuthenticated.get).toHaveBeenCalledWith(
          expect.stringMatching(/\/signin\/v1\/identifier\/_\/mfa\/status$/),
          expect.objectContaining({ headers: { 'Kopano-Konnect-XSRF': '1' } })
        )
      })
      it('shows a switch that is off when it is off', async () => {
        const { wrapper } = getWrapper({
          twoFactorResponse: { status: 200, data: { enabled: false } }
        })
        await flushPromises()

        const twoFactorSwitch = wrapper.find(selectors.twoFactorSwitch)
        expect(twoFactorSwitch.text()).toBe('Off')
        expect(twoFactorSwitch.find('button').attributes('aria-checked')).toBe('false')
        expect(wrapper.find(selectors.twoFactorButton).exists()).toBeFalsy()
      })
      it('shows a switch that is on when it is on', async () => {
        const { wrapper } = getWrapper({
          twoFactorResponse: { status: 200, data: { enabled: true } }
        })
        await flushPromises()

        const twoFactorSwitch = wrapper.find(selectors.twoFactorSwitch)
        expect(twoFactorSwitch.text()).toBe('On')
        expect(twoFactorSwitch.find('button').attributes('aria-checked')).toBe('true')
      })
      it('opens the page of the IDP when the switch is used and keeps its state', async () => {
        const open = vi.spyOn(window, 'open').mockImplementation(() => null)
        const { wrapper } = getWrapper({
          twoFactorResponse: { status: 200, data: { enabled: false } }
        })
        await flushPromises()

        await wrapper.find(selectors.twoFactorSwitch).find('button').trigger('click')

        expect(open).toHaveBeenCalledWith(
          expect.stringMatching(/\/signin\/v1\/mfa$/),
          '_blank',
          'noopener'
        )
        expect(
          wrapper.find(selectors.twoFactorSwitch).find('button').attributes('aria-checked')
        ).toBe('false')
        open.mockRestore()
      })
      it('follows the state when the user comes back to the page', async () => {
        const { wrapper, mocks } = getWrapper({
          twoFactorResponse: { status: 200, data: { enabled: false } }
        })
        await flushPromises()

        mocks.$clientService.httpUnAuthenticated.get.mockResolvedValue(
          mock<AxiosResponse>({ status: 200, data: { enabled: true } })
        )
        document.dispatchEvent(new Event('visibilitychange'))
        await flushPromises()

        expect(
          wrapper.find(selectors.twoFactorSwitch).find('button').attributes('aria-checked')
        ).toBe('true')
      })
      it('links to the page of the IDP without a state when there is no session at the IDP', async () => {
        const { wrapper } = getWrapper({ twoFactorResponse: { status: 401, data: {} } })
        await flushPromises()

        expect(wrapper.find(selectors.twoFactorSwitch).exists()).toBeFalsy()
        expect(wrapper.find(selectors.twoFactorButton).text()).toBe('Manage')
        expect(wrapper.find(selectors.twoFactorButton).attributes('href')).toMatch(
          /\/signin\/v1\/mfa$/
        )
      })
      it.each([404, 400, 502])(
        'is not displayed when the IDP does not offer it (status %s)',
        async (status) => {
          const { wrapper } = getWrapper({ twoFactorResponse: { status, data: {} } })
          await flushPromises()

          expect(wrapper.find(selectors.twoFactor).exists()).toBeFalsy()
        }
      )
      it('is not displayed when the request fails', async () => {
        const { wrapper } = getWrapper({ twoFactorResponse: new Error('network') })
        await flushPromises()

        expect(wrapper.find(selectors.twoFactor).exists()).toBeFalsy()
      })
      it('is not requested outside of the user context', async () => {
        const { wrapper, mocks } = getWrapper({ isUserContext: false, isPublicLinkContext: true })
        await flushPromises()

        expect(mocks.$clientService.httpUnAuthenticated.get).not.toHaveBeenCalled()
        expect(wrapper.find(selectors.twoFactor).exists()).toBeFalsy()
      })
    })

    describe('Logout from all devices link', () => {
      it('should render the logout from active devices if logoutUrl is provided', () => {
        const { wrapper } = getWrapper()

        expect(wrapper.find('[data-testid="logout"]').exists()).toBe(true)
      })
      it("shouldn't render the logout from active devices if logoutUrl isn't provided", () => {
        const { wrapper } = getWrapper({ logoutUrl: null })

        expect(wrapper.find('[data-testid="logout"]').exists()).toBe(false)
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
  twoFactorResponse = { status: 404, data: {} },
  isPublicLinkContext = false,
  isUserContext = true,
  logoutUrl = 'https://account-manager/logout',
  getMe
}: {
  user?: User
  memberOf?: User['memberOf']
  accountEditLink?: OptionsConfig['accountEditLink']
  twoFactorResponse?: { status: number; data: { enabled?: boolean } } | Error
  isPublicLinkContext?: boolean
  isUserContext?: boolean
  logoutUrl?: OptionsConfig['logoutUrl']
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
          ...(logoutUrl && { logoutUrl }),
          ...(accountEditLink && { accountEditLink })
        }
      }
    }
  })

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

  if (twoFactorResponse instanceof Error) {
    mocks.$clientService.httpUnAuthenticated.get.mockRejectedValue(twoFactorResponse)
  } else {
    mocks.$clientService.httpUnAuthenticated.get.mockResolvedValue(
      mock<AxiosResponse>(twoFactorResponse)
    )
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
