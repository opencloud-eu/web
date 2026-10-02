import { createPinia, setActivePinia } from 'pinia'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { useGroupwareAccountsStore, type GroupwareAccount } from '@opencloud-eu/web-pkg'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import Calendar from '../../../src/views/Calendar.vue'
import { useAppointmentsStore } from '../../../src/composables/piniaStores/appointments'

const mocks = vi.hoisted(() => ({
  loadAppointments: vi.fn(),
  loadCalendars: vi.fn(),
  clearAppointments: vi.fn()
}))

vi.mock('../../../src/composables/useLoadAppointments', () => ({
  useLoadAppointments: () => ({ ...mocks, isLoading: ref(false), error: ref<Error>() })
}))

describe('Calendar view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads calendars when the current account was already initialized by another app', async () => {
    await getWrapper()

    expect(mocks.loadCalendars).toHaveBeenCalledOnce()
    expect(mocks.loadCalendars).toHaveBeenCalledWith('account-1')
  })

  it('loads the appointments of all calendars of the account', async () => {
    const { appointmentsStore } = await getWrapper()

    expect(mocks.loadAppointments).toHaveBeenCalledOnce()
    expect(mocks.loadAppointments).toHaveBeenCalledWith(
      'account-1',
      appointmentsStore.currentMonthRange,
      ['personal', 'team']
    )
  })

  it('reloads the appointments when the month changes', async () => {
    const { appointmentsStore } = await getWrapper()
    mocks.loadAppointments.mockClear()

    appointmentsStore.goToNextMonth()
    await flushPromises()

    expect(mocks.loadAppointments).toHaveBeenCalledOnce()
    expect(mocks.loadAppointments).toHaveBeenCalledWith(
      'account-1',
      appointmentsStore.currentMonthRange,
      ['personal', 'team']
    )
  })

  it('does not reload the appointments when a calendar is toggled', async () => {
    const { appointmentsStore } = await getWrapper()
    mocks.loadAppointments.mockClear()

    appointmentsStore.setCalendarSelected('team', false)
    await flushPromises()

    expect(mocks.loadAppointments).not.toHaveBeenCalled()
  })

  it('clears the appointments when the account has no calendars', async () => {
    await getWrapper({ calendars: [] })

    expect(mocks.loadAppointments).not.toHaveBeenCalled()
    expect(mocks.clearAppointments).toHaveBeenCalled()
  })
})

const getWrapper = async ({
  calendars = [
    { id: 'personal', name: 'Personal' },
    { id: 'team', name: 'Team' }
  ]
} = {}) => {
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

  const appointmentsStore = useAppointmentsStore()
  mocks.loadCalendars.mockImplementation(() => {
    appointmentsStore.setCalendars(calendars)
    return Promise.resolve(calendars)
  })

  const componentMocks = defaultComponentMocks()
  const wrapper = mount(Calendar, {
    global: {
      plugins: [...defaultPlugins({ pinia: false }), pinia],
      mocks: componentMocks,
      provide: componentMocks,
      stubs: {
        AppointmentDetailsModal: true,
        MonthView: true
      }
    }
  })
  await flushPromises()

  return { wrapper, appointmentsStore }
}
