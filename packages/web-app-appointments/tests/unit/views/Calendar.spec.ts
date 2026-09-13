import { createPinia, setActivePinia } from 'pinia'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { useGroupwareAccountsStore, type GroupwareAccount } from '@opencloud-eu/web-pkg'
import { flushPromises } from '@vue/test-utils'
import Calendar from '../../../src/views/Calendar.vue'

const mocks = vi.hoisted(() => ({
  loadAppointments: vi.fn(),
  loadCalendars: vi.fn()
}))

vi.mock('../../../src/composables/useLoadAppointments', () => ({
  useLoadAppointments: () => mocks
}))

describe('Calendar view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads calendars when the current account was already initialized by another app', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const accountsStore = useGroupwareAccountsStore()
    const account: GroupwareAccount = {
      accountId: 'account-1',
      name: 'Personal',
      isPersonal: true,
      isReadOnly: false,
      identities: []
    }
    accountsStore.setAccounts([account])
    accountsStore.setCurrentAccount(account)
    const componentMocks = defaultComponentMocks()

    mount(Calendar, {
      global: {
        plugins: [...defaultPlugins({ designSystem: false, pinia: false }), pinia],
        mocks: componentMocks,
        provide: componentMocks,
        stubs: {
          AppointmentDetailsModal: true,
          MonthView: true
        }
      }
    })
    await flushPromises()

    expect(mocks.loadCalendars).toHaveBeenCalledOnce()
    expect(mocks.loadCalendars).toHaveBeenCalledWith('account-1')
  })
})
