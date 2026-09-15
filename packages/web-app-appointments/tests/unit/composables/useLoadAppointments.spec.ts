import { createPinia, setActivePinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import { useAppointmentsStore } from '../../../src/composables/piniaStores/appointments'
import type { Appointment } from '../../../src/types'

const calendarApi = vi.hoisted(() => ({
  loadCalendars: vi.fn(),
  loadAppointments: vi.fn()
}))

vi.mock('../../../src/composables/useCalendarApi', () => ({
  useCalendarApi: () => calendarApi
}))

const range = { start: '2026-06-01T00:00:00.000Z', end: '2026-07-05T23:59:59.999Z' }

describe('useLoadAppointments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('writes loaded calendars into the store', async () => {
    calendarApi.loadCalendars.mockResolvedValueOnce([{ id: 'personal', name: 'Personal' }])
    const { loadCalendars, error } = await getComposable()

    await loadCalendars('account-1')

    expect(useAppointmentsStore().calendars).toEqual([{ id: 'personal', name: 'Personal' }])
    expect(error.value).toBeUndefined()
  })

  it('exposes a load failure as an error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    calendarApi.loadCalendars.mockRejectedValueOnce(new Error('No connection'))
    const { loadCalendars, calendarsError } = await getComposable()

    await expect(loadCalendars('account-1')).rejects.toThrow('No connection')
    expect(calendarsError.value?.message).toBe('No connection')
  })

  it('does not let a superseded run overwrite the result of the newer one', async () => {
    // The first run is aborted by `restartable` as soon as the second one is performed.
    calendarApi.loadAppointments.mockImplementationOnce(
      (_accountId: string, _range: unknown, _calendarIds: string[], signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('canceled')))
        })
    )
    calendarApi.loadAppointments.mockResolvedValueOnce([appointment({ id: 'from-second-run' })])
    const { loadAppointments, error } = await getComposable()

    const superseded = loadAppointments('account-1', range, ['personal'])
    await loadAppointments('account-1', range, ['personal'])
    await flushPromises()

    expect(superseded.isCanceled).toBeTruthy()
    expect(useAppointmentsStore().appointments.map(({ id }) => id)).toEqual(['from-second-run'])
    expect(error.value).toBeUndefined()
  })
})

/**
 * The loading tasks and their state live in module scope, so every test needs a fresh module
 * instance to stay independent of the ones before it.
 */
const getComposable = async () => {
  vi.resetModules()
  setActivePinia(createPinia())
  const { useLoadAppointments } = await import('../../../src/composables/useLoadAppointments')

  return useLoadAppointments()
}

const appointment = (overrides: Partial<Appointment>): Appointment => ({
  id: 'appointment',
  calendarId: 'personal',
  title: 'Planning',
  start: '2026-06-25T08:00:00.000Z',
  end: '2026-06-25T09:00:00.000Z',
  allDay: false,
  participants: [],
  recurrenceRules: [],
  hasRecurrence: false,
  hasReminder: false,
  excluded: false,
  ...overrides
})
