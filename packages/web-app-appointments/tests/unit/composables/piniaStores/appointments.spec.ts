import { createPinia, setActivePinia } from 'pinia'
import { useAppointmentsStore } from '../../../../src/composables/piniaStores/appointments'
import type { Appointment, Calendar } from '../../../../src/types'

describe('appointments store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('stores appointments and groups them by day', () => {
    const store = useAppointmentsStore()

    store.setAppointments([
      appointment({ id: '1', start: '2026-06-25T08:00:00.000Z' }),
      appointment({ id: '2', start: '2026-06-25T10:00:00.000Z' })
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

  it('tracks view mode and create modal state', () => {
    const store = useAppointmentsStore()

    store.setViewMode('week')
    store.openCreateModal()

    expect(store.viewMode).toBe('week')
    expect(store.isCreateModalOpen).toBeTruthy()

    store.closeCreateModal()

    expect(store.isCreateModalOpen).toBeFalsy()
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

  it('creates appointments and upserts the returned appointment', async () => {
    const store = useAppointmentsStore()
    const creator = vi.fn().mockResolvedValue(appointment({ id: 'created' }))

    store.openCreateModal()
    await store.createAppointment({
      accountId: 'account-1',
      payload: {
        calendarId: 'c',
        title: 'Planning',
        start: '2026-06-25T08:00:00.000Z',
        duration: 'PT1H',
        timeZone: 'Europe/Berlin'
      },
      creator
    })

    expect(creator).toHaveBeenCalled()
    expect(store.appointments.map(({ id }) => id)).toEqual(['created'])
    expect(store.isCreateModalOpen).toBeFalsy()
  })

  it('loads calendars and selects the default calendar', async () => {
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
    expect(store.selectedCalendarId).toBe('c')
    expect(store.selectedCalendarIds).toEqual(['c'])
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
    store.toggleSelectedCalendarId('personal')

    expect(store.selectedCalendarIds).toEqual(['c'])

    store.toggleSelectedCalendarId('c')

    expect(store.selectedCalendarIds).toEqual([])
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
  })
})

const appointment = (overrides: Partial<Appointment>): Appointment => ({
  id: 'appointment',
  title: 'Planning',
  start: '2026-06-25T08:00:00.000Z',
  end: '2026-06-25T09:00:00.000Z',
  allDay: false,
  participants: [],
  ...overrides
})

const calendar = (overrides: Partial<Calendar>): Calendar => ({
  id: 'calendar',
  name: 'Calendar',
  ...overrides
})
