import {
  addMonths,
  createAppointmentOccurrences,
  getMonthGridDateRange,
  getMonthGridDays,
  groupAppointmentOccurrencesByDay,
  isAppointmentInRange,
  toDateKey
} from '../../../src/helpers/date'
import type { Appointment } from '../../../src/types'

describe('calendar date helpers', () => {
  it('creates a monday based month grid range', () => {
    const range = getMonthGridDateRange(new Date(2026, 5, 15))

    expect(range.start).toBe('2026-06-01T00:00:00.000Z')
    expect(range.end).toBe('2026-07-05T23:59:59.999Z')
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

    const grouped = groupAppointmentOccurrencesByDay(createAppointmentOccurrences(appointments))

    expect(grouped['2026-06-25']).toHaveLength(2)
    expect(grouped['2026-06-26']).toHaveLength(1)
  })

  it('groups multi-day appointments on every covered day without including an exclusive end', () => {
    const appointments = [
      appointment({
        id: 'multi-day',
        start: '2026-06-25T08:00:00.000Z',
        end: '2026-06-27T00:00:00.000Z'
      })
    ]

    const grouped = groupAppointmentOccurrencesByDay(createAppointmentOccurrences(appointments))

    expect(grouped['2026-06-25']).toHaveLength(1)
    expect(grouped['2026-06-26']).toHaveLength(1)
    expect(grouped['2026-06-27']).toBeUndefined()
  })

  it('navigates months from the first of the target month', () => {
    expect(toDateKey(addMonths(new Date(2026, 5, 25), 1))).toBe('2026-07-01')
  })

  it('creates stable backend occurrence ids and excludes cancelled recurrence instances', () => {
    const occurrences = createAppointmentOccurrences([
      appointment({ id: 'series', recurrenceId: '2026-06-25T08:00:00.000Z' }),
      appointment({ id: 'excluded', excluded: true })
    ])

    expect(occurrences).toHaveLength(1)
    expect(occurrences[0].id).toContain('series:2026-06-25T08:00:00.000Z')
  })

  it('treats appointment ends as exclusive at the visible range boundary', () => {
    const range = {
      start: '2026-06-25T00:00:00.000Z',
      end: '2026-06-25T23:59:59.999Z'
    }

    expect(
      isAppointmentInRange(
        appointment({
          start: '2026-06-24T23:00:00.000Z',
          end: range.start
        }),
        range
      )
    ).toBeFalsy()
    expect(
      isAppointmentInRange(
        appointment({
          start: range.start,
          end: '2026-06-25T01:00:00.000Z'
        }),
        range
      )
    ).toBeTruthy()
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
