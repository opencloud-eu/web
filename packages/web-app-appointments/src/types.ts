import { DateTime, Duration } from 'luxon'
import { z } from 'zod'

export const AppointmentParticipantSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    status: z.string().optional(),
    participationStatus: z.string().optional(),
    role: z.string().optional(),
    roles: z.record(z.string(), z.boolean()).optional()
  })
  .passthrough()

const AppointmentLocationSchema = z
  .object({
    name: z.string().optional()
  })
  .passthrough()

const RecurrenceRuleSchema = z.union([z.string(), z.record(z.string(), z.unknown())])
const AppointmentParticipantsSchema = z.union([
  z.array(AppointmentParticipantSchema),
  z.record(z.string(), AppointmentParticipantSchema)
])
const AppointmentAlertsSchema = z.union([z.array(z.unknown()), z.record(z.string(), z.unknown())])

const AppointmentInputSchema = z.object({
  id: z.string(),
  uid: z.string().optional(),
  calendarId: z.string().optional(),
  calendarIds: z.record(z.string(), z.boolean()).optional(),
  accountId: z.string().optional(),
  title: z.string().optional(),
  name: z.string().optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  locations: z.record(z.string(), AppointmentLocationSchema).optional(),
  start: z.string(),
  end: z.string().optional(),
  duration: z.string().optional(),
  timeZone: z.string().nullable().optional(),
  showWithoutTime: z.boolean().optional(),
  allDay: z.boolean().optional(),
  color: z.string().optional(),
  organizer: AppointmentParticipantSchema.optional(),
  participants: AppointmentParticipantsSchema.optional(),
  privacy: z.string().optional(),
  visibility: z.string().optional(),
  status: z.string().optional(),
  freeBusyStatus: z.string().optional(),
  recurrenceRule: z.string().optional(),
  recurrenceRules: z.array(RecurrenceRuleSchema).optional(),
  recurrenceId: z.string().optional(),
  recurrenceOverrides: z.record(z.string(), z.unknown()).optional(),
  excluded: z.boolean().optional(),
  alerts: AppointmentAlertsSchema.optional(),
  useDefaultAlerts: z.boolean().optional()
})

export const AppointmentSchema = AppointmentInputSchema.transform(normalizeAppointment)

export const AppointmentListResponseSchema = z.object({
  accountId: z.string().optional(),
  state: z.string().optional(),
  list: z.array(AppointmentSchema).optional().default([]),
  notFound: z.array(z.string()).optional()
})

export const AppointmentSearchResultsSchema = z.object({
  results: z.array(AppointmentSchema).optional().default([]),
  canCalculateChanges: z.boolean().optional(),
  position: z.number().optional(),
  limit: z.number().optional(),
  total: z.number().optional()
})

export const AppointmentsArrayResponseSchema = z.array(AppointmentSchema)

export const CalendarSchema = z
  .object({
    id: z.string().optional(),
    calendarId: z.string().optional(),
    name: z.string().optional(),
    title: z.string().optional(),
    displayName: z.string().optional(),
    color: z.string().optional(),
    isDefault: z.boolean().optional(),
    isReadOnly: z.boolean().optional()
  })
  .transform((calendar, ctx) => {
    const id = calendar.id || calendar.calendarId
    if (!id) {
      ctx.addIssue({
        code: 'custom',
        message: 'Calendar id is required'
      })
      return z.NEVER
    }

    return {
      id,
      name: calendar.name || calendar.title || calendar.displayName || id,
      color: calendar.color,
      isDefault: calendar.isDefault,
      isReadOnly: calendar.isReadOnly
    }
  })

export const CalendarListResponseSchema = z.object({
  accountId: z.string().optional(),
  state: z.string().optional(),
  list: z.array(CalendarSchema),
  notFound: z.array(z.string()).optional()
})

export const CalendarObjectResponseSchema = z.object({
  calendars: z.record(z.string(), CalendarSchema)
})

export const CalendarsArrayResponseSchema = z.array(CalendarSchema)

export type AppointmentParticipant = {
  id?: string
  name?: string
  email?: string
  status?: string
  role?: string
}

export type AppointmentRecurrenceRule = string | Record<string, unknown>

export type Appointment = {
  id: string
  uid?: string
  calendarId?: string
  accountId?: string
  title: string
  description?: string
  location?: string
  start: string
  end: string
  timeZone?: string
  allDay: boolean
  color?: string
  organizer?: AppointmentParticipant
  participants: AppointmentParticipant[]
  privacy?: string
  status?: string
  freeBusyStatus?: string
  recurrenceRules: AppointmentRecurrenceRule[]
  recurrenceId?: string
  hasRecurrence: boolean
  hasReminder: boolean
  excluded: boolean
}

export type AppointmentOccurrence = {
  id: string
  appointmentId: string
  calendarId?: string
  start: string
  end: string
  appointment: Appointment
}

export type AppointmentListResponse = z.infer<typeof AppointmentListResponseSchema>

export type Calendar = {
  id: string
  name: string
  color?: string
  isDefault?: boolean
  isReadOnly?: boolean
}

export type AppointmentDateRange = {
  start: string
  end: string
}

export function parseAppointmentsResponse(data: unknown): Appointment[] {
  const arrayResponse = AppointmentsArrayResponseSchema.safeParse(data)
  if (arrayResponse.success) {
    return arrayResponse.data
  }

  const singleResponse = AppointmentSchema.safeParse(data)
  if (singleResponse.success) {
    return [singleResponse.data]
  }

  const searchResponse = AppointmentSearchResultsSchema.safeParse(data)
  if (searchResponse.success) {
    return searchResponse.data.results
  }

  const listResponse = AppointmentListResponseSchema.safeParse(data)
  if (listResponse.success) {
    return listResponse.data.list
  }

  return AppointmentSearchResultsSchema.parse(data).results
}

export function parseCalendarsResponse(data: unknown): Calendar[] {
  const listResponse = CalendarListResponseSchema.safeParse(data)
  if (listResponse.success) {
    return listResponse.data.list
  }

  const objectResponse = CalendarObjectResponseSchema.safeParse(data)
  if (objectResponse.success) {
    return Object.values(objectResponse.data.calendars)
  }

  const arrayResponse = CalendarsArrayResponseSchema.safeParse(data)
  if (arrayResponse.success) {
    return arrayResponse.data
  }

  const singleResponse = CalendarSchema.safeParse(data)
  if (singleResponse.success) {
    return [singleResponse.data]
  }

  return CalendarListResponseSchema.parse(data).list
}

type AppointmentInput = z.infer<typeof AppointmentInputSchema>
type AppointmentParticipantInput = z.infer<typeof AppointmentParticipantSchema>

function normalizeAppointment(event: AppointmentInput): Appointment {
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
      : participants.find(({ role }) => ['chair', 'owner', 'organizer'].includes(role || '')),
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

function normalizeParticipants(
  participants: AppointmentInput['participants']
): AppointmentParticipant[] {
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

function normalizeParticipant(participant: AppointmentParticipantInput): AppointmentParticipant {
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

function addDurationToDateString(start: string, duration?: string, timeZone?: string | null) {
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
