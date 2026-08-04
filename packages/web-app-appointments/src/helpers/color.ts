import type { Appointment } from '../types'

export const neutralCalendarColor = 'var(--oc-role-primary)'

export function resolveCalendarColor(color?: string) {
  return color?.trim() || neutralCalendarColor
}

export function resolveAppointmentColor(appointment: Appointment, calendarColor?: string) {
  return resolveCalendarColor(appointment.color || calendarColor)
}
