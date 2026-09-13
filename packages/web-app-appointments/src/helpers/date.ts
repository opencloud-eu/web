import { formatDateFromDateTime } from '@opencloud-eu/web-pkg'
import { DateTime } from 'luxon'
import type { Appointment, AppointmentDateRange, AppointmentOccurrence } from '../types'

export type CalendarDay = {
  date: Date
  key: string
  dayOfMonth: number
  isCurrentMonth: boolean
  isToday: boolean
}

export function toDateKey(date: Date | string) {
  const normalized = typeof date === 'string' ? new Date(date) : date
  return [
    normalized.getFullYear(),
    String(normalized.getMonth() + 1).padStart(2, '0'),
    String(normalized.getDate()).padStart(2, '0')
  ].join('-')
}

export function getStartOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function getEndOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

export function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

export function getMonthGridRange(date: Date) {
  const monthStart = getStartOfMonth(date)
  const monthEnd = getEndOfMonth(date)
  const gridStart = new Date(monthStart)
  const gridEnd = new Date(monthEnd)

  const mondayOffset = (monthStart.getDay() + 6) % 7
  gridStart.setDate(monthStart.getDate() - mondayOffset)

  const sundayOffset = (7 - ((monthEnd.getDay() + 6) % 7) - 1) % 7
  gridEnd.setDate(monthEnd.getDate() + sundayOffset)
  gridEnd.setHours(23, 59, 59, 999)

  return { start: gridStart, end: gridEnd }
}

export function getMonthGridDays(currentMonth: Date, today = new Date()): CalendarDay[] {
  const { start, end } = getMonthGridRange(currentMonth)
  const days: CalendarDay[] = []
  const cursor = new Date(start)

  while (cursor <= end) {
    days.push({
      date: new Date(cursor),
      key: toDateKey(cursor),
      dayOfMonth: cursor.getDate(),
      isCurrentMonth: cursor.getMonth() === currentMonth.getMonth(),
      isToday: toDateKey(cursor) === toDateKey(today)
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  return days
}

export function createAppointmentOccurrences(appointments: Appointment[]): AppointmentOccurrence[] {
  // Recurrence rules are intentionally not expanded in the browser. Each event or expanded
  // recurrence instance returned by the Groupware API becomes one display occurrence here.
  return appointments.filter(({ excluded }) => !excluded).map(createAppointmentOccurrence)
}

export function groupAppointmentOccurrencesByDay(occurrences: AppointmentOccurrence[]) {
  const result: Record<string, AppointmentOccurrence[]> = {}

  for (const occurrence of occurrences) {
    const start = getOccurrenceDateTime(occurrence, 'start')
    const end = getOccurrenceDateTime(occurrence, 'end')
    if (!start.isValid || !end.isValid) {
      continue
    }

    const lastCoveredInstant = DateTime.fromMillis(Math.max(end.toMillis() - 1, start.toMillis()))
    let cursor = start.startOf('day')
    const lastDay = lastCoveredInstant.startOf('day')

    while (cursor <= lastDay) {
      const key = cursor.toFormat('yyyy-MM-dd')
      result[key] = result[key] || []
      result[key].push(occurrence)
      cursor = cursor.plus({ days: 1 })
    }
  }

  for (const occurrencesForDay of Object.values(result)) {
    occurrencesForDay.sort(compareOccurrences)
  }

  return result
}

export function isAppointmentInRange(appointment: Appointment, range: AppointmentDateRange) {
  const appointmentStart = getAppointmentDateTime(appointment.start, appointment).toMillis()
  const appointmentEnd = getAppointmentDateTime(appointment.end, appointment).toMillis()
  const rangeStart = DateTime.fromISO(range.start, { setZone: true }).toMillis()
  const rangeEnd = DateTime.fromISO(range.end, { setZone: true }).toMillis()

  if ([appointmentStart, appointmentEnd, rangeStart, rangeEnd].some(Number.isNaN)) {
    return false
  }

  if (appointmentStart === appointmentEnd) {
    return appointmentStart >= rangeStart && appointmentStart <= rangeEnd
  }

  return appointmentStart <= rangeEnd && appointmentEnd > rangeStart
}

export function formatOccurrenceDateTime(
  occurrence: AppointmentOccurrence,
  currentLanguage: string
) {
  const start = getOccurrenceDateTime(occurrence, 'start')
  const end = getOccurrenceDateTime(occurrence, 'end')

  if (occurrence.appointment.allDay) {
    const lastCoveredDay = DateTime.fromMillis(Math.max(end.toMillis() - 1, start.toMillis()))
    const formattedStart = formatDateFromDateTime(start, currentLanguage, DateTime.DATE_FULL)

    if (start.hasSame(lastCoveredDay, 'day')) {
      return formattedStart
    }

    return `${formattedStart} – ${formatDateFromDateTime(lastCoveredDay, currentLanguage, DateTime.DATE_FULL)}`
  }

  if (start.hasSame(end, 'day')) {
    return `${formatDateFromDateTime(start, currentLanguage, DateTime.DATE_FULL)}, ${formatDateFromDateTime(start, currentLanguage, DateTime.TIME_SIMPLE)} – ${formatDateFromDateTime(end, currentLanguage, DateTime.TIME_SIMPLE)}`
  }

  return `${formatDateFromDateTime(start, currentLanguage)} – ${formatDateFromDateTime(end, currentLanguage)}`
}

export function formatOccurrenceTimeRange(
  occurrence: AppointmentOccurrence,
  currentLanguage: string
) {
  const start = getOccurrenceDateTime(occurrence, 'start')
  const end = getOccurrenceDateTime(occurrence, 'end')

  return `${formatDateFromDateTime(start, currentLanguage, DateTime.TIME_SIMPLE)} – ${formatDateFromDateTime(end, currentLanguage, DateTime.TIME_SIMPLE)}`
}

export function formatDateForApi(date: Date) {
  return date.toISOString()
}

function createAppointmentOccurrence(appointment: Appointment): AppointmentOccurrence {
  return {
    id: [
      appointment.calendarId || '',
      appointment.id,
      appointment.recurrenceId || appointment.start
    ]
      .filter(Boolean)
      .join(':'),
    appointmentId: appointment.id,
    calendarId: appointment.calendarId,
    start: appointment.start,
    end: appointment.end,
    appointment
  }
}

function getOccurrenceDateTime(occurrence: AppointmentOccurrence, property: 'start' | 'end') {
  return getAppointmentDateTime(occurrence[property], occurrence.appointment)
}

function getAppointmentDateTime(value: string, appointment: Appointment) {
  if (appointment.allDay) {
    return DateTime.fromISO(value.slice(0, 10)).startOf('day')
  }

  const parsed = DateTime.fromISO(
    value,
    appointment.timeZone ? { zone: appointment.timeZone } : { setZone: true }
  )
  return parsed.toLocal()
}

function compareOccurrences(left: AppointmentOccurrence, right: AppointmentOccurrence) {
  if (left.appointment.allDay !== right.appointment.allDay) {
    return left.appointment.allDay ? -1 : 1
  }

  return (
    getOccurrenceDateTime(left, 'start').toMillis() -
    getOccurrenceDateTime(right, 'start').toMillis()
  )
}
