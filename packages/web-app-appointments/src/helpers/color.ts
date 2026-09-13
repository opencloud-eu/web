import type { Appointment } from '../types'

const NEUTRAL_APPOINTMENT_COLOR = 'var(--oc-role-primary)'

/**
 * The Groupware API does not expose a color for every calendar, so appointments fall back to a
 * neutral accent instead of a color that would carry no meaning.
 */
export const resolveAppointmentColor = (appointment: Appointment, calendarColor?: string) => {
  return appointment.color?.trim() || calendarColor?.trim() || NEUTRAL_APPOINTMENT_COLOR
}
