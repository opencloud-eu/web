import { mockDeep } from 'vitest-mock-extended'
import {
  defaultComponentMocks,
  defaultPlugins,
  mockAxiosResolve,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import { ClientService, useModals } from '@opencloud-eu/web-pkg'
import { flushPromises } from '@vue/test-utils'
import { OcTable } from '@opencloud-eu/design-system/components'
import AppTokens from '../../../../src/components/Account/AppTokens.vue'
import { AppToken } from '../../../../src/helpers/appTokens'

const selectors = {
  createAppTokenBtn: '.create-app-token-btn',
  appTokensTable: 'oc-table-stub',
  authServiceUnavailable: '[data-testid="auth-service-unavailable"]',
  noAppTokensAvailable: '[data-testid="no-app-tokens-available"]'
}

describe('AppTokens component', () => {
  describe('listing app tokens', () => {
    it('lists all app tokens in a table', async () => {
      const appToken: AppToken = {
        token: '123',
        label: 'test',
        created_date: '2021-01-01',
        expiration_date: '2021-01-02'
      }
      const { wrapper } = getWrapper({ appTokens: [appToken] })
      await flushPromises()
      const table = wrapper.findComponent<typeof OcTable>(selectors.appTokensTable)

      expect(table.props('data').length).toBe(1)
      expect(table.props('data')[0]).toEqual(appToken)
    })
    it('does show message if no app tokens found', async () => {
      const { wrapper } = getWrapper()
      await flushPromises()

      expect(wrapper.find(selectors.noAppTokensAvailable).exists()).toBeTruthy()
    })
    it('does show message if auth app service is disabled', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { wrapper } = getWrapper({ authAppServiceDisabled: true })
      await flushPromises()

      expect(wrapper.find(selectors.authServiceUnavailable).exists()).toBeTruthy()
    })
  })
  describe('create button', () => {
    it('does show when the auth app service is enabled', async () => {
      const { wrapper } = getWrapper()
      await flushPromises()

      expect(wrapper.find(selectors.createAppTokenBtn).exists()).toBeTruthy()
    })
    it('does not show when the auth app service is disabled', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { wrapper } = getWrapper({ authAppServiceDisabled: true })
      await flushPromises()

      expect(wrapper.find(selectors.createAppTokenBtn).exists()).toBeFalsy()
    })
    it('dispatches a modal on click', async () => {
      const { wrapper } = getWrapper()
      await flushPromises()
      await wrapper.find(selectors.createAppTokenBtn).trigger('click')
      const { dispatchModal } = useModals()

      expect(dispatchModal).toHaveBeenCalled()
    })
  })
})

function getWrapper({
  authAppServiceDisabled = false,
  appTokens = []
}: { authAppServiceDisabled?: boolean; appTokens?: AppToken[] } = {}) {
  const clientService = mockDeep<ClientService>()

  if (authAppServiceDisabled) {
    clientService.httpAuthenticated.get.mockRejectedValue(new Error())
  } else {
    clientService.httpAuthenticated.get.mockResolvedValue(mockAxiosResolve(appTokens))
  }

  const mocks = { ...defaultComponentMocks(), $clientService: clientService }

  return {
    mocks,
    wrapper: shallowMount(AppTokens, {
      global: {
        mocks,
        provide: mocks,
        plugins: [...defaultPlugins({ piniaOptions: { authState: { userContextReady: true } } })]
      }
    })
  }
}
