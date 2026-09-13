import { createPinia, setActivePinia } from 'pinia'
import { useAppointmentsStore } from '../../../../src/composables/piniaStores/appointments'
import type { Appointment, Calendar } from '../../../../src/types'

describe('appointments store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('groups the appointments of the selected calendars by day', () => {
    const store = useAppointmentsStore()
    store.setCurrentMonth(new Date(2026, 5, 1))
    store.setCalendars([calendar({ id: 'c' }), calendar({ id: 'hidden' })])
    store.setCalendarSelected('hidden', false)
    store.setAppointments([
      appointment({ id: '1', calendarId: 'c', start: '2026-06-25T08:00:00.000Z' }),
      appointment({ id: '2', calendarId: 'c', start: '2026-06-25T10:00:00.000Z' }),
      appointment({ id: '3', calendarId: 'hidden', start: '2026-06-26T10:00:00.000Z' })
    ])

    expect(store.appointments).toHaveLength(3)
    expect(store.occurrencesByDay['2026-06-25']).toHaveLength(2)
    expect(store.occurrencesByDay['2026-06-26']).toBeUndefined()
  })

  it('hides appointments outside of the visible month grid', () => {
    const store = useAppointmentsStore()
    store.setCurrentMonth(new Date(2026, 5, 1))
    store.setCalendars([calendar({ id: 'c' })])
    store.setAppointments([
      appointment({ id: 'visible', calendarId: 'c', start: '2026-06-25T08:00:00.000Z' }),
      appointment({ id: 'other-month', calendarId: 'c', start: '2026-09-25T08:00:00.000Z' })
    ])

    expect(store.visibleAppointments.map(({ id }) => id)).toEqual(['visible'])
  })

  it('exposes the month grid range of the current month', () => {
    const store = useAppointmentsStore()

    store.setCurrentMonth(new Date(2026, 5, 25))

    expect(store.currentMonth.getDate()).toBe(1)
    expect(store.currentMonthRange).toEqual({
      start: '2026-06-01T00:00:00.000Z',
      end: '2026-07-05T23:59:59.999Z'
    })
  })

  it('navigates between months and back to today', () => {
    const store = useAppointmentsStore()

    store.setCurrentMonth(new Date(2026, 5, 1))
    store.goToNextMonth()
    expect(store.currentMonth.getMonth()).toBe(6)

    store.goToPreviousMonth()
    expect(store.currentMonth.getMonth()).toBe(5)

    store.goToToday()
    expect(store.currentMonth.getMonth()).toBe(new Date().getMonth())
  })

  it('selects all calendars initially and keeps the selection on reload', () => {
    const store = useAppointmentsStore()

    store.setCalendars([calendar({ id: 'personal' }), calendar({ id: 'team' })])
    expect(store.selectedCalendarIds).toEqual(['personal', 'team'])

    store.setCalendarSelected('team', false)
    store.setCalendars([calendar({ id: 'personal' }), calendar({ id: 'team' })])
    expect(store.selectedCalendarIds).toEqual(['personal'])
  })

  it('drops a selected calendar that no longer exists', () => {
    const store = useAppointmentsStore()

    store.setCalendars([calendar({ id: 'personal' }), calendar({ id: 'team' })])
    store.setCalendars([calendar({ id: 'personal' })])

    expect(store.selectedCalendarIds).toEqual(['personal'])
  })

  it('ignores a selection change for an unknown calendar', () => {
    const store = useAppointmentsStore()

    store.setCalendars([calendar({ id: 'personal' })])
    store.setCalendarSelected('unknown', true)

    expect(store.selectedCalendarIds).toEqual(['personal'])
  })

  it('resolves the selected occurrence and drops it on a month change', () => {
    const store = useAppointmentsStore()
    store.setCurrentMonth(new Date(2026, 5, 1))
    store.setCalendars([calendar({ id: 'c' })])
    store.setAppointments([appointment({ id: '1', calendarId: 'c' })])

    const [occurrence] = store.visibleOccurrences
    store.setSelectedOccurrence(occurrence.id)
    expect(store.selectedOccurrence?.appointmentId).toBe('1')

    store.setCurrentMonth(new Date(2026, 6, 1))
    expect(store.selectedOccurrence).toBeUndefined()
  })

  it('clears all account bound state when the account changes', () => {
    const store = useAppointmentsStore()
    store.setActiveAccountId('account-1')
    store.setCalendars([calendar({ id: 'c' })])
    store.setAppointments([appointment({ id: '1', calendarId: 'c' })])

    store.setActiveAccountId('account-2')

    expect(store.activeAccountId).toBe('account-2')
    expect(store.appointments).toEqual([])
    expect(store.calendars).toEqual([])
    expect(store.selectedCalendarIds).toEqual([])
  })
})

const calendar = (overrides: Partial<Calendar>): Calendar => ({
  id: 'c',
  name: 'Personal',
  ...overrides
})

const appointment = (overrides: Partial<Appointment>): Appointment => ({
  id: 'appointment',
  calendarId: 'c',
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
