import { formatDateFromDateTime } from '@opencloud-eu/web-pkg'
import { DateTime } from 'luxon'
import type { Appointment, AppointmentDateRange, AppointmentOccurrence } from '../types'

const DATE_KEY_FORMAT = 'yyyy-MM-dd'

export type CalendarDay = {
  date: Date
  key: string
  dayOfMonth: number
  isCurrentMonth: boolean
  isToday: boolean
}

export const toDateKey = (date: Date) => {
  return DateTime.fromJSDate(date).toFormat(DATE_KEY_FORMAT)
}

export const getStartOfMonth = (date: Date) => {
  return DateTime.fromJSDate(date).startOf('month').toJSDate()
}

export const addMonths = (date: Date, amount: number) => {
  return DateTime.fromJSDate(date).startOf('month').plus({ months: amount }).toJSDate()
}

export const getMonthGridDays = (currentMonth: Date, today = new Date()): CalendarDay[] => {
  const { start, end } = getMonthGridRange(currentMonth)
  const monthStart = DateTime.fromJSDate(currentMonth).startOf('month')
  const todayKey = toDateKey(today)
  const days: CalendarDay[] = []

  for (let cursor = start; cursor <= end; cursor = cursor.plus({ days: 1 })) {
    const key = cursor.toFormat(DATE_KEY_FORMAT)
    days.push({
      date: cursor.toJSDate(),
      key,
      dayOfMonth: cursor.day,
      isCurrentMonth: cursor.hasSame(monthStart, 'month'),
      isToday: key === todayKey
    })
  }

  return days
}

/**
 * The range covered by the rendered month grid, including the leading and trailing
 * days of the adjacent months. Used to decide which appointments are visible.
 */
export const getMonthGridDateRange = (currentMonth: Date): AppointmentDateRange => {
  const { start, end } = getMonthGridRange(currentMonth)

  return {
    start: start.toJSDate().toISOString(),
    end: end.toJSDate().toISOString()
  }
}

export const createAppointmentOccurrences = (appointments: Appointment[]) => {
  // Recurrence rules are intentionally not expanded in the browser. Each event or expanded
  // recurrence instance returned by the Groupware API becomes one display occurrence here.
  return appointments.filter(({ excluded }) => !excluded).map(createAppointmentOccurrence)
}

export const groupAppointmentOccurrencesByDay = (occurrences: AppointmentOccurrence[]) => {
  const result: Record<string, AppointmentOccurrence[]> = {}

  for (const occurrence of occurrences) {
    const start = getOccurrenceDateTime(occurrence, 'start')
    const end = getOccurrenceDateTime(occurrence, 'end')
    if (!start.isValid || !end.isValid) {
      continue
    }

    const lastDay = getLastCoveredInstant(start, end).startOf('day')

    for (let cursor = start.startOf('day'); cursor <= lastDay; cursor = cursor.plus({ days: 1 })) {
      const key = cursor.toFormat(DATE_KEY_FORMAT)
      result[key] = result[key] || []
      result[key].push(occurrence)
    }
  }

  for (const occurrencesForDay of Object.values(result)) {
    occurrencesForDay.sort(compareOccurrences)
  }

  return result
}

export const isAppointmentInRange = (appointment: Appointment, range: AppointmentDateRange) => {
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

export const formatOccurrenceDateTime = (
  occurrence: AppointmentOccurrence,
  currentLanguage: string
) => {
  const start = getOccurrenceDateTime(occurrence, 'start')
  const end = getOccurrenceDateTime(occurrence, 'end')

  if (occurrence.appointment.allDay) {
    const lastCoveredDay = getLastCoveredInstant(start, end)
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

export const formatOccurrenceTimeRange = (
  occurrence: AppointmentOccurrence,
  currentLanguage: string
) => {
  const start = getOccurrenceDateTime(occurrence, 'start')
  const end = getOccurrenceDateTime(occurrence, 'end')

  return `${formatDateFromDateTime(start, currentLanguage, DateTime.TIME_SIMPLE)} – ${formatDateFromDateTime(end, currentLanguage, DateTime.TIME_SIMPLE)}`
}

const getMonthGridRange = (currentMonth: Date) => {
  const monthStart = DateTime.fromJSDate(currentMonth).startOf('month')

  return {
    start: monthStart.startOf('week'),
    end: monthStart.endOf('month').endOf('week')
  }
}

const createAppointmentOccurrence = (appointment: Appointment): AppointmentOccurrence => {
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

/**
 * The end of an appointment is exclusive, so an appointment ending at midnight does not
 * cover the following day.
 */
const getLastCoveredInstant = (start: DateTime, end: DateTime) => {
  return DateTime.fromMillis(Math.max(end.toMillis() - 1, start.toMillis()))
}

const getOccurrenceDateTime = (occurrence: AppointmentOccurrence, property: 'start' | 'end') => {
  return getAppointmentDateTime(occurrence[property], occurrence.appointment)
}

const getAppointmentDateTime = (value: string, appointment: Appointment) => {
  if (appointment.allDay) {
    return DateTime.fromISO(value.slice(0, 10)).startOf('day')
  }

  return DateTime.fromISO(
    value,
    appointment.timeZone ? { zone: appointment.timeZone } : { setZone: true }
  ).toLocal()
}

const compareOccurrences = (left: AppointmentOccurrence, right: AppointmentOccurrence) => {
  if (left.appointment.allDay !== right.appointment.allDay) {
    return left.appointment.allDay ? -1 : 1
  }

  return (
    getOccurrenceDateTime(left, 'start').toMillis() -
    getOccurrenceDateTime(right, 'start').toMillis()
  )
}
