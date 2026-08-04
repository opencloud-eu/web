import {
  addMonths,
  getMonthGridDays,
  getMonthGridRange,
  groupAppointmentsByDay,
  toDateKey
} from '../../../src/helpers/date'
import type { Appointment } from '../../../src/types'

describe('calendar date helpers', () => {
  it('creates a monday based month grid range', () => {
    const range = getMonthGridRange(new Date(2026, 5, 15))

    expect(toDateKey(range.start)).toBe('2026-06-01')
    expect(toDateKey(range.end)).toBe('2026-07-05')
  })

  it('creates month grid days with today and current month state', () => {
    const days = getMonthGridDays(new Date(2026, 5, 15), new Date(2026, 5, 25))

    expect(days).toHaveLength(35)
    expect(days.find((day) => day.key === '2026-06-25')?.isToday).toBeTruthy()
    expect(days.find((day) => day.key === '2026-07-01')?.isCurrentMonth).toBeFalsy()
  })

  it('groups appointments by their start day', () => {
    const appointments = [
      appointment({ id: '1', start: '2026-06-25T08:00:00.000Z' }),
      appointment({ id: '2', start: '2026-06-25T10:00:00.000Z' }),
      appointment({ id: '3', start: '2026-06-26T10:00:00.000Z' })
    ]

    expect(groupAppointmentsByDay(appointments)['2026-06-25']).toHaveLength(2)
    expect(groupAppointmentsByDay(appointments)['2026-06-26']).toHaveLength(1)
  })

  it('groups multi-day appointments on every covered day without including an exclusive end', () => {
    const appointments = [
      appointment({
        id: 'multi-day',
        start: '2026-06-25T08:00:00.000Z',
        end: '2026-06-27T00:00:00.000Z'
      })
    ]

    const grouped = groupAppointmentsByDay(appointments)

    expect(grouped['2026-06-25']).toHaveLength(1)
    expect(grouped['2026-06-26']).toHaveLength(1)
    expect(grouped['2026-06-27']).toBeUndefined()
  })

  it('navigates months from the first of the target month', () => {
    expect(toDateKey(addMonths(new Date(2026, 5, 25), 1))).toBe('2026-07-01')
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
