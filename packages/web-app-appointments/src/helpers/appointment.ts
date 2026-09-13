import { DateTime, Duration } from 'luxon'
import type {
  Appointment,
  AppointmentParticipant,
  AppointmentRecurrenceRule,
  Calendar,
  CalendarEvent,
  CalendarEventParticipant,
  RawCalendar
} from '../types'

const ORGANIZER_ROLES = ['chair', 'owner', 'organizer']

export const normalizeAppointments = (events: CalendarEvent[]): Appointment[] => {
  return events.map(normalizeAppointment)
}

export const normalizeAppointment = (event: CalendarEvent): Appointment => {
  const calendarId =
    event.calendarId ||
    Object.entries(event.calendarIds || {}).find(([, isMember]) => isMember)?.[0]
  const participants = normalizeParticipants(event.participants)
  const recurrenceRules: AppointmentRecurrenceRule[] = [
    ...(event.recurrenceRule ? [event.recurrenceRule] : []),
    ...(event.recurrenceRules || [])
  ]

  return {
    id: event.id,
    uid: event.uid,
    calendarId,
    accountId: event.accountId,
    title: event.title || event.name || event.summary || '',
    description: event.description,
    location: event.location || Object.values(event.locations || {})[0]?.name,
    start: event.start,
    end: event.end || addDurationToDateString(event.start, event.duration, event.timeZone),
    timeZone: event.timeZone || undefined,
    allDay: event.allDay || event.showWithoutTime || false,
    color: event.color,
    organizer: event.organizer
      ? normalizeParticipant(event.organizer)
      : participants.find(({ role }) => ORGANIZER_ROLES.includes(role || '')),
    participants,
    privacy: event.privacy || event.visibility,
    status: event.status,
    freeBusyStatus: event.freeBusyStatus,
    recurrenceRules,
    recurrenceId: event.recurrenceId,
    hasRecurrence: Boolean(
      recurrenceRules.length ||
      event.recurrenceId ||
      Object.keys(event.recurrenceOverrides || {}).length
    ),
    hasReminder: Boolean(
      event.useDefaultAlerts ||
      (Array.isArray(event.alerts) ? event.alerts.length : Object.keys(event.alerts || {}).length)
    ),
    excluded: event.excluded || false
  }
}

export const normalizeCalendars = (calendars: RawCalendar[]): Calendar[] => {
  return calendars.map(normalizeCalendar)
}

export const normalizeCalendar = (calendar: RawCalendar): Calendar => {
  const id = calendar.id || calendar.calendarId
  if (!id) {
    throw new Error('Groupware API returned a calendar without an id')
  }

  return {
    id,
    name: calendar.name || calendar.title || calendar.displayName || id,
    color: calendar.color,
    isDefault: calendar.isDefault,
    isReadOnly: calendar.isReadOnly
  }
}

const normalizeParticipants = (
  participants: CalendarEvent['participants']
): AppointmentParticipant[] => {
  if (!participants) {
    return []
  }

  if (Array.isArray(participants)) {
    return participants.map(normalizeParticipant)
  }

  return Object.entries(participants).map(([id, participant]) =>
    normalizeParticipant({ ...participant, id })
  )
}

const normalizeParticipant = (participant: CalendarEventParticipant): AppointmentParticipant => {
  return {
    id: participant.id,
    name: participant.name,
    email: participant.email,
    status: participant.status || participant.participationStatus,
    role:
      participant.role ||
      Object.entries(participant.roles || {}).find(([, enabled]) => enabled)?.[0]
  }
}

const addDurationToDateString = (start: string, duration?: string, timeZone?: string | null) => {
  if (!duration) {
    return start
  }

  const startDate = DateTime.fromISO(start, timeZone ? { zone: timeZone } : { setZone: true })
  const parsedDuration = Duration.fromISO(duration)
  if (!startDate.isValid || !parsedDuration.isValid) {
    return start
  }

  return startDate.plus(parsedDuration).toISO() || start
}
