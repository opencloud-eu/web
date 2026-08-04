import { createPinia, setActivePinia } from 'pinia'
import { useAppointmentsStore } from '../../../../src/composables/piniaStores/appointments'
import type { Appointment, Calendar } from '../../../../src/types'

describe('appointments store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('stores appointments and groups them by day', () => {
    const store = useAppointmentsStore()

    store.setCalendars([calendar({ id: 'c' })])
    store.setAppointments([
      appointment({ id: '1', calendarId: 'c', start: '2026-06-25T08:00:00.000Z' }),
      appointment({ id: '2', calendarId: 'c', start: '2026-06-25T10:00:00.000Z' })
    ])

    expect(store.appointments).toHaveLength(2)
    expect(store.appointmentsByDay['2026-06-25']).toHaveLength(2)
  })

  it('tracks selected date, current month and visible range', () => {
    const store = useAppointmentsStore()

    store.setSelectedDate(new Date(2026, 5, 25))
    store.setCurrentMonth(new Date(2026, 5, 25))
    const range = store.prepareVisibleRangeForCurrentMonth()

    expect(store.selectedDate.getDate()).toBe(25)
    expect(store.currentMonth.getDate()).toBe(1)
    expect(range.start).toContain('2026-06-01')
    expect(store.visibleDateRange).toEqual(range)
  })

  it('navigates between months', () => {
    const store = useAppointmentsStore()

    store.setCurrentMonth(new Date(2026, 5, 1))
    store.goToNextMonth()
    expect(store.currentMonth.getMonth()).toBe(6)

    store.goToPreviousMonth()
    expect(store.currentMonth.getMonth()).toBe(5)
  })

  it('loads appointments for a date range and exposes loading and error state', async () => {
    const store = useAppointmentsStore()
    const range = {
      start: '2026-06-01T00:00:00.000Z',
      end: '2026-06-30T23:59:59.999Z'
    }
    const loader = vi.fn().mockResolvedValue([appointment({ id: '1' })])

    await store.loadAppointmentsForRange({
      accountId: 'account-1',
      calendarId: 'c',
      range,
      loader
    })

    expect(loader).toHaveBeenCalledWith('account-1', range, 'c')
    expect(store.appointments).toHaveLength(1)
    expect(store.isLoading).toBeFalsy()
    expect(store.error).toBeNull()
  })

  it('loads calendars and selects all calendars for the combined month view', async () => {
    const store = useAppointmentsStore()
    const loader = vi
      .fn()
      .mockResolvedValue([
        calendar({ id: 'personal', name: 'Personal' }),
        calendar({ id: 'c', name: 'Calendar c', isDefault: true })
      ])

    await store.loadCalendarsForAccount({ accountId: 'account-1', loader })

    expect(loader).toHaveBeenCalledWith('account-1')
    expect(store.calendars).toHaveLength(2)
    expect(store.selectedCalendarId).toBe('personal')
    expect(store.selectedCalendarIds).toEqual(['personal', 'c'])
    expect(store.isLoadingCalendars).toBeFalsy()
    expect(store.calendarError).toBeNull()
  })

  it('keeps an existing calendar selection when it is still available', () => {
    const store = useAppointmentsStore()

    store.setSelectedCalendarId('c')
    store.setCalendars([calendar({ id: 'personal' }), calendar({ id: 'c' })])

    expect(store.selectedCalendarId).toBe('c')
    expect(store.selectedCalendarIds).toEqual(['c'])
  })

  it('toggles multiple selected calendars', () => {
    const store = useAppointmentsStore()

    store.setCalendars([calendar({ id: 'personal' }), calendar({ id: 'c' })])
    store.toggleSelectedCalendarId('c')

    expect(store.selectedCalendarIds).toEqual(['personal'])

    store.toggleSelectedCalendarId('personal')

    expect(store.selectedCalendarIds).toEqual([])
  })

  it('filters visible appointments and occurrences when a calendar is hidden', () => {
    const store = useAppointmentsStore()
    store.setCalendars([calendar({ id: 'personal' }), calendar({ id: 'team' })])
    store.setAppointments([
      appointment({ id: 'personal-event', calendarId: 'personal' }),
      appointment({ id: 'team-event', calendarId: 'team' })
    ])
    store.setSelectedOccurrence(
      store.visibleOccurrences.find(({ calendarId }) => calendarId === 'team')?.id || null
    )

    store.setCalendarSelected('team', false)

    expect(store.visibleAppointments.map(({ id }) => id)).toEqual(['personal-event'])
    expect(store.visibleOccurrences).toHaveLength(1)
    expect(store.getAppointmentsForDay('2026-06-25')).toHaveLength(1)
    expect(store.selectedOccurrence).toBeNull()
  })

  it('tracks the active account and selected occurrence', () => {
    const store = useAppointmentsStore()
    store.setActiveAccountId('account-1')
    store.setCalendars([calendar({ id: 'personal' })])
    store.setAppointments([appointment({ id: 'event-1', calendarId: 'personal' })])
    store.setSelectedOccurrence(store.visibleOccurrences[0].id)

    expect(store.activeAccountId).toBe('account-1')
    expect(store.selectedOccurrence?.appointmentId).toBe('event-1')
    expect(store.appointmentsFetchState).toBe('success')
    expect(store.calendarsFetchState).toBe('success')
  })

  it('stores load errors', async () => {
    const store = useAppointmentsStore()
    const error = new Error('Failed')

    await expect(
      store.loadAppointmentsForRange({
        accountId: 'account-1',
        range: { start: '2026-06-01T00:00:00.000Z', end: '2026-06-30T23:59:59.999Z' },
        loader: vi.fn().mockRejectedValue(error)
      })
    ).rejects.toThrow(error)

    expect(store.error).toBe(error)
    expect(store.isLoading).toBeFalsy()
    expect(store.appointmentsFetchState).toBe('error')
  })
})

function appointment(overrides: Partial<Appointment>): Appointment {
  return {
    id: 'appointment',
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
  }
}

function calendar(overrides: Partial<Calendar>): Calendar {
  return {
    id: 'calendar',
    name: 'Calendar',
    ...overrides
  }
}
