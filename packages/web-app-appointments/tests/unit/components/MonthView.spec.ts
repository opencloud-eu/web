import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import MonthView from '../../../src/components/MonthView.vue'
import { createAppointmentOccurrences, getMonthGridDays } from '../../../src/helpers/date'
import type { Appointment, AppointmentOccurrence } from '../../../src/types'

describe('MonthView', () => {
  it('renders month navigation, days and appointments', () => {
    const { wrapper } = getWrapper({
      occurrencesByDay: occurrencesByDay([appointment({ id: '1', title: 'Planning' })])
    })

    expect(wrapper.text()).toContain('June 2026')
    expect(wrapper.text()).toContain('Today')
    expect(wrapper.text()).toContain('Planning')
    expect(wrapper.get('[data-testid="calendar-day-cell-2026-06-25"]').attributes()).toHaveProperty(
      'data-is-today'
    )
  })

  it('renders localized weekday headers', () => {
    const { wrapper } = getWrapper()
    const headers = wrapper.findAll('[role="columnheader"]')

    expect(headers).toHaveLength(7)
    expect(headers.map((header) => header.attributes('aria-label'))).toEqual([
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday'
    ])
  })

  it('emits navigation events', async () => {
    const { wrapper } = getWrapper()

    await wrapper.get('[data-testid="calendar-today-button"]').trigger('click')
    await wrapper.get('[data-testid="calendar-previous-button"]').trigger('click')
    await wrapper.get('[data-testid="calendar-next-button"]').trigger('click')

    expect(wrapper.emitted('today')).toBeTruthy()
    expect(wrapper.emitted('previous')).toBeTruthy()
    expect(wrapper.emitted('next')).toBeTruthy()
  })

  it('emits selected date when a day is clicked', async () => {
    const { wrapper } = getWrapper()

    await wrapper.get('[data-testid="calendar-day-cell-2026-06-15"]').trigger('click')

    expect(wrapper.emitted('select-date')?.[0][0]).toEqual(new Date(2026, 5, 15))
  })

  it('makes the whole grid a single tab stop', () => {
    const { wrapper } = getWrapper({
      occurrencesByDay: occurrencesByDay([appointment({ id: '1' })])
    })
    const tabbable = wrapper
      .findAll('[role="gridcell"]')
      .filter((cell) => cell.attributes('tabindex') === '0')

    expect(wrapper.findAll('[role="gridcell"]').length).toBeGreaterThan(1)
    expect(tabbable).toHaveLength(1)
    // Today is the entry point into the grid, the appointments stay reachable via Tab.
    expect(tabbable[0].attributes('data-testid')).toBe('calendar-day-cell-2026-06-25')
    expect(
      wrapper.get('[data-testid^="calendar-appointment-"]').attributes('tabindex')
    ).toBeUndefined()
  })

  it('moves the tabbable day with the arrow keys', async () => {
    const { wrapper } = getWrapper()
    const grid = wrapper.get('[role="grid"]')

    await grid.get('[data-testid="calendar-day-cell-2026-06-25"]').trigger('keydown', {
      key: 'ArrowRight'
    })
    expect(wrapper.get('[data-testid="calendar-day-cell-2026-06-26"]').attributes('tabindex')).toBe(
      '0'
    )

    await grid.get('[data-testid="calendar-day-cell-2026-06-26"]').trigger('keydown', {
      key: 'ArrowDown'
    })
    expect(wrapper.get('[data-testid="calendar-day-cell-2026-07-03"]').attributes('tabindex')).toBe(
      '0'
    )

    await grid.get('[data-testid="calendar-day-cell-2026-07-03"]').trigger('keydown', {
      key: 'Home'
    })
    expect(wrapper.get('[data-testid="calendar-day-cell-2026-06-29"]').attributes('tabindex')).toBe(
      '0'
    )
  })

  it('does not move focus beyond the rendered grid', async () => {
    const { wrapper } = getWrapper()

    await wrapper.get('[data-testid="calendar-day-cell-2026-06-25"]').trigger('keydown', {
      key: 'Home'
    })
    await wrapper.get('[data-testid="calendar-day-cell-2026-06-22"]').trigger('keydown', {
      key: 'ArrowUp'
    })
    await wrapper.get('[data-testid="calendar-day-cell-2026-06-15"]').trigger('keydown', {
      key: 'ArrowUp'
    })
    await wrapper.get('[data-testid="calendar-day-cell-2026-06-08"]').trigger('keydown', {
      key: 'ArrowUp'
    })
    await wrapper.get('[data-testid="calendar-day-cell-2026-06-01"]').trigger('keydown', {
      key: 'ArrowUp'
    })

    expect(wrapper.get('[data-testid="calendar-day-cell-2026-06-01"]').attributes('tabindex')).toBe(
      '0'
    )
  })

  it('selects and pages the month from the keyboard', async () => {
    const { wrapper } = getWrapper()
    const cell = wrapper.get('[data-testid="calendar-day-cell-2026-06-25"]')

    await cell.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('select-date')?.[0][0]).toEqual(new Date(2026, 5, 25))

    await cell.trigger('keydown', { key: 'PageUp' })
    await cell.trigger('keydown', { key: 'PageDown' })
    expect(wrapper.emitted('previous')).toHaveLength(1)
    expect(wrapper.emitted('next')).toHaveLength(1)
  })

  it('does not select the day when an appointment inside it is clicked', async () => {
    const occurrences = occurrencesByDay([appointment({ id: '1' })])
    const { wrapper } = getWrapper({ occurrencesByDay: occurrences })

    await wrapper
      .get(`[data-testid="calendar-appointment-${occurrences['2026-06-25'][0].id}"]`)
      .trigger('click')

    expect(wrapper.emitted('select-appointment')).toHaveLength(1)
    expect(wrapper.emitted('select-date')).toBeUndefined()
  })

  it('emits the selected occurrence and renders all-day events explicitly', async () => {
    const occurrences = occurrencesByDay([appointment({ id: 'all-day', allDay: true })])
    const { wrapper } = getWrapper({ occurrencesByDay: occurrences })
    const [occurrence] = occurrences['2026-06-25']

    await wrapper.get(`[data-testid="calendar-appointment-${occurrence.id}"]`).trigger('click')

    expect(wrapper.text()).toContain('All day')
    expect(wrapper.emitted('select-appointment')?.[0]).toEqual([occurrence.id])
  })

  it('truncates the occurrences of a day and counts the hidden ones', () => {
    const { wrapper } = getWrapper({
      occurrencesByDay: occurrencesByDay([
        appointment({ id: '1', title: 'First' }),
        appointment({ id: '2', title: 'Second' }),
        appointment({ id: '3', title: 'Third' }),
        appointment({ id: '4', title: 'Fourth' }),
        appointment({ id: '5', title: 'Fifth' })
      ])
    })
    const dayCell = wrapper.get('[data-testid="calendar-day-cell-2026-06-25"]')

    expect(dayCell.findAll('[data-testid^="calendar-appointment-"]')).toHaveLength(3)
    expect(dayCell.text()).toContain('+2 more')
    expect(dayCell.text()).not.toContain('Fourth')
  })

  it('hints that the month has no appointments at all', () => {
    expect(getWrapper().wrapper.text()).toContain('No appointments in this month')
    expect(
      getWrapper({
        occurrencesByDay: occurrencesByDay([appointment({ id: '1' })])
      }).wrapper.text()
    ).not.toContain('No appointments in this month')
  })

  it('renders the loading state', () => {
    const { wrapper } = getWrapper({ isLoading: true })

    expect(wrapper.find('[data-testid="calendar-loading"]').exists()).toBeTruthy()
    expect(wrapper.find('[role="grid"]').exists()).toBeFalsy()
  })

  it('renders a generic error state without leaking the error message', () => {
    const { wrapper } = getWrapper({ error: new Error('No connection') })

    expect(wrapper.get('[data-testid="calendar-month-error"]').text()).toContain(
      'Appointments could not be loaded'
    )
    expect(wrapper.text()).not.toContain('No connection')
    expect(wrapper.find('[role="grid"]').exists()).toBeFalsy()
  })
})

const getWrapper = (props: Partial<InstanceType<typeof MonthView>['$props']> = {}) => {
  const currentMonth = new Date(2026, 5, 1)

  return {
    wrapper: mount(MonthView, {
      props: {
        days: getMonthGridDays(currentMonth, new Date(2026, 5, 25)),
        currentMonth,
        occurrencesByDay: {},
        calendarColorById: {},
        isLoading: false,
        ...props
      },
      global: {
        plugins: defaultPlugins(),
        mocks: defaultComponentMocks()
      }
    })
  }
}

const occurrencesByDay = (appointments: Appointment[]): Record<string, AppointmentOccurrence[]> => {
  return { '2026-06-25': createAppointmentOccurrences(appointments) }
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
