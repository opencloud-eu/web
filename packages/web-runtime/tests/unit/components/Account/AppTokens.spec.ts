import { mock, mockDeep } from 'vitest-mock-extended'
import { AxiosResponse } from 'axios'
import { RouteLocationNormalizedLoaded } from 'vue-router'
import {
  defaultComponentMocks,
  defaultPlugins,
  mockAxiosResolve,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import { AppLoadingSpinner, ClientService, useModals } from '@opencloud-eu/web-pkg'
import { flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { OcTable } from '@opencloud-eu/design-system/components'
import { FieldType, SortDir } from '@opencloud-eu/design-system/helpers'
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

      it('makes exactly the columns of the sort fields sortable, with their direction', async () => {
        const { wrapper } = getWrapper({ appTokens })
        await flushPromises()
        const sortableColumns = wrapper
          .findComponent<typeof OcTable>(selectors.appTokensTable)
          .props('fields')
          .filter(({ sortable }: FieldType) => sortable)
          .map(({ name, sortDir }: FieldType) => `${name} ${sortDir}`)
        expect(sortableColumns).toEqual(['creationDate desc', 'expirationDate desc', 'status asc'])
      })
      it('sorts by creation date descending by default', async () => {
        const { wrapper } = getWrapper({ appTokens })
        await flushPromises()
        const table = wrapper.findComponent<typeof OcTable>(selectors.appTokensTable)

        expect(table.props('sortBy')).toBe('creationDate')
        expect(table.props('sortDir')).toBe(SortDir.Desc)
        expect(table.props('data').map(({ token }: AppToken) => token)).toEqual(['3', '2', '1'])
      })
      afterEach(() => {
        window.localStorage.clear()
      })

      it('sorts by the stored sorting', async () => {
        storeSort('expirationDate', SortDir.Asc)
        const { wrapper } = getWrapper({ appTokens })
        await flushPromises()
        const table = wrapper.findComponent<typeof OcTable>(selectors.appTokensTable)

        expect(table.props('sortBy')).toBe('expirationDate')
        expect(table.props('sortDir')).toBe(SortDir.Asc)
        expect(table.props('data').map(({ token }: AppToken) => token)).toEqual(['2', '3', '1'])
      })
      it('sorts active tokens before expired ones by status', async () => {
        storeSort('status', SortDir.Asc)
        const { wrapper } = getWrapper({
          appTokens: [
            {
              token: 'expired',
              label: 'a',
              created_date: '2021-01-01',
              expiration_date: '2021-01-02'
            },
            {
              token: 'active',
              label: 'b',
              created_date: '2021-01-01',
              expiration_date: '2999-01-01'
            }
          ]
        })
        await flushPromises()
        const table = wrapper.findComponent<typeof OcTable>(selectors.appTokensTable)

        expect(table.props('data').map(({ token }: AppToken) => token)).toEqual([
          'active',
          'expired'
        ])
      })
      it('sorts the table when it emits "sort"', async () => {
        const { wrapper } = getWrapper({ appTokens })
        await flushPromises()
        const table = wrapper.findComponent<typeof OcTable>(selectors.appTokensTable)
        table.vm.$emit('sort', { sortBy: 'expirationDate', sortDir: SortDir.Asc })
        await nextTick()

        expect(table.props('sortBy')).toBe('expirationDate')
        expect(table.props('sortDir')).toBe(SortDir.Asc)
        expect(table.props('data').map(({ token }: AppToken) => token)).toEqual(['2', '3', '1'])
      })
    })
    it('shows a loading spinner instead of the empty state while loading', async () => {
      let resolveTokens: (value: AxiosResponse) => void
      const { wrapper } = getWrapper({
        tokensRequest: new Promise((resolve) => {
          resolveTokens = resolve
        })
      })
      await flushPromises()

      expect(wrapper.find(selectors.noAppTokensAvailable).exists()).toBeFalsy()
      expect(wrapper.findComponent(AppLoadingSpinner).exists()).toBeTruthy()

      resolveTokens(mockAxiosResolve([]))
      await flushPromises()

      expect(wrapper.findComponent(AppLoadingSpinner).exists()).toBeFalsy()
      expect(wrapper.find(selectors.noAppTokensAvailable).exists()).toBeTruthy()
    })
    it('keeps the table instead of the loading spinner while reloading', async () => {
      const appToken: AppToken = {
        token: '1',
        label: 'a',
        created_date: '2021-01-01',
        expiration_date: '2999-01-01'
      }
      const { wrapper, mocks } = getWrapper({ appTokens: [appToken] })
      await flushPromises()
      mocks.$clientService.httpAuthenticated.get.mockReturnValue(new Promise(() => undefined))
      await wrapper.find(selectors.createAppTokenBtn).trigger('click')
      const { dispatchModal } = useModals()
      const { onCreated } = vi.mocked(dispatchModal).mock.calls[0][0].customComponentAttrs()
      ;(onCreated as () => void)()
      await flushPromises()

      expect(wrapper.findComponent(AppLoadingSpinner).exists()).toBeFalsy()
      expect(wrapper.find(selectors.appTokensTable).exists()).toBeTruthy()
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
    it('focuses the note input initially', async () => {
      const { wrapper } = getWrapper()
      await flushPromises()
      await wrapper.find(selectors.createAppTokenBtn).trigger('click')
      const { dispatchModal } = useModals()

      expect(dispatchModal).toHaveBeenCalledWith(
        expect.objectContaining({ focusTrapInitial: '#app-token-note-input' })
      )
    })
    it('reloads the app tokens when a token has been created', async () => {
      const { wrapper, mocks } = getWrapper()
      await flushPromises()
      await wrapper.find(selectors.createAppTokenBtn).trigger('click')
      const { dispatchModal } = useModals()
      const { onCreated } = vi.mocked(dispatchModal).mock.calls[0][0].customComponentAttrs()
      ;(onCreated as () => void)()
      await flushPromises()

      expect(mocks.$clientService.httpAuthenticated.get).toHaveBeenCalledTimes(2)
    })
  })
})

function storeSort(sortBy: string, sortDir: SortDir) {
  window.localStorage.setItem('oc-options_account-preferences_sort-by', sortBy)
  window.localStorage.setItem('oc-options_account-preferences_sort-dir', sortDir)
}

function getWrapper({
  authAppServiceDisabled = false,
  appTokens = [],
  tokensRequest
}: {
  authAppServiceDisabled?: boolean
  appTokens?: AppToken[]
  tokensRequest?: Promise<AxiosResponse>
} = {}) {
  const clientService = mockDeep<ClientService>()

  if (tokensRequest) {
    clientService.httpAuthenticated.get.mockReturnValue(tokensRequest)
  } else if (authAppServiceDisabled) {
    clientService.httpAuthenticated.get.mockRejectedValue(new Error())
  } else {
    clientService.httpAuthenticated.get.mockResolvedValue(mockAxiosResolve(appTokens))
  }

  // assign the query after creating the mock, otherwise missing query params resolve to mock functions
  const currentRoute = mock<RouteLocationNormalizedLoaded>({ name: 'account-preferences' })
  currentRoute.query = {}

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
