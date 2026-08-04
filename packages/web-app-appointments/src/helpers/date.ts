import type { Appointment } from '../types'

export type CalendarDay = {
  date: Date
  key: string
  dayOfMonth: number
  isCurrentMonth: boolean
  isToday: boolean
}

export const toDateKey = (date: Date | string) => {
  const normalized = typeof date === 'string' ? new Date(date) : date
  return [
    normalized.getFullYear(),
    String(normalized.getMonth() + 1).padStart(2, '0'),
    String(normalized.getDate()).padStart(2, '0')
  ].join('-')
}

export const getStartOfMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export const getEndOfMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

export const addMonths = (date: Date, amount: number) => {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

export const getMonthGridRange = (date: Date) => {
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

export const getMonthGridDays = (currentMonth: Date, today = new Date()): CalendarDay[] => {
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

export const groupAppointmentsByDay = (appointments: Appointment[]) => {
  const result: Record<string, Appointment[]> = {}

  for (const appointment of appointments) {
    const start = new Date(appointment.start)
    const end = new Date(appointment.end)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      continue
    }

    const lastCoveredInstant = new Date(Math.max(end.getTime() - 1, start.getTime()))
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const lastDay = new Date(
      lastCoveredInstant.getFullYear(),
      lastCoveredInstant.getMonth(),
      lastCoveredInstant.getDate()
    )

    while (cursor <= lastDay) {
      const key = toDateKey(cursor)
      result[key] = result[key] || []
      result[key].push(appointment)
      cursor.setDate(cursor.getDate() + 1)
    }
  }

  for (const appointmentsForDay of Object.values(result)) {
    appointmentsForDay.sort((left, right) => {
      if (left.allDay !== right.allDay) {
        return left.allDay ? -1 : 1
      }

      return new Date(left.start).getTime() - new Date(right.start).getTime()
    })
  }

  return result
}

export const formatDateForApi = (date: Date) => {
  return date.toISOString()
}
