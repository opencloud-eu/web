import { mock, mockDeep } from 'vitest-mock-extended'
import { RouteLocationNormalizedLoaded } from 'vue-router'
import {
  defaultComponentMocks,
  defaultPlugins,
  mockAxiosResolve,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import { ClientService, useModals } from '@opencloud-eu/web-pkg'
import { flushPromises } from '@vue/test-utils'
import { OcTable } from '@opencloud-eu/design-system/components'
import { SortDir } from '@opencloud-eu/design-system/helpers'
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
    describe('sorting', () => {
      const appTokens: AppToken[] = [
        { token: '1', label: 'a', created_date: '2021-01-01', expiration_date: '2021-03-01' },
        { token: '2', label: 'b', created_date: '2021-02-01', expiration_date: '2021-01-01' },
        { token: '3', label: 'c', created_date: '2021-03-01', expiration_date: '2021-02-01' }
      ]

      it('sorts by creation date descending by default', async () => {
        const { wrapper } = getWrapper({ appTokens })
        await flushPromises()
        const table = wrapper.findComponent<typeof OcTable>(selectors.appTokensTable)

        expect(table.props('sortBy')).toBe('creationDate')
        expect(table.props('sortDir')).toBe(SortDir.Desc)
        expect(table.props('data').map(({ token }: AppToken) => token)).toEqual(['3', '2', '1'])
      })
      it('sorts by the sort parameters from the route query', async () => {
        const { wrapper } = getWrapper({
          appTokens,
          query: { 'sort-by': 'expirationDate', 'sort-dir': SortDir.Asc }
        })
        await flushPromises()
        const table = wrapper.findComponent<typeof OcTable>(selectors.appTokensTable)

        expect(table.props('sortBy')).toBe('expirationDate')
        expect(table.props('sortDir')).toBe(SortDir.Asc)
        expect(table.props('data').map(({ token }: AppToken) => token)).toEqual(['2', '3', '1'])
      })
      it('stores the sort parameters in the route query on sort', async () => {
        const { wrapper, mocks } = getWrapper({ appTokens })
        await flushPromises()
        const table = wrapper.findComponent<typeof OcTable>(selectors.appTokensTable)
        table.vm.$emit('sort', { sortBy: 'expirationDate', sortDir: SortDir.Asc })

        expect(mocks.$router.replace).toHaveBeenCalledWith(
          expect.objectContaining({
            query: expect.objectContaining({ 'sort-by': 'expirationDate', 'sort-dir': SortDir.Asc })
          })
        )
      })
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
  appTokens = [],
  query = {}
}: {
  authAppServiceDisabled?: boolean
  appTokens?: AppToken[]
  query?: Record<string, string>
} = {}) {
  const clientService = mockDeep<ClientService>()

  if (authAppServiceDisabled) {
    clientService.httpAuthenticated.get.mockRejectedValue(new Error())
  } else {
    clientService.httpAuthenticated.get.mockResolvedValue(mockAxiosResolve(appTokens))
  }

  // assign the query after creating the mock, otherwise missing query params resolve to mock functions
  const currentRoute = mock<RouteLocationNormalizedLoaded>({ name: 'account-preferences' })
  currentRoute.query = query

  const mocks = { ...defaultComponentMocks({ currentRoute }), $clientService: clientService }

  return {
    mocks,
    wrapper: shallowMount(AppTokens, {
      global: {
        mocks,
        provide: mocks,
        plugins: [...defaultPlugins({ piniaOptions: { authState: { userContextReady: true } } })],
        stubs: { AccountHeading: false }
      }
    })
  }
}
