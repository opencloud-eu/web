import { z } from 'zod'

/**
 * JMAP sends `null` for properties that have no value (RFC 8620), so `null` and a missing
 * property mean the same thing here.
 */
const optionalString = z
  .string()
  .nullish()
  .transform((value) => value ?? undefined)

const optionalBoolean = z
  .boolean()
  .nullish()
  .transform((value) => value ?? undefined)

export const CalendarEventParticipantSchema = z.object({
  id: optionalString,
  name: optionalString,
  email: optionalString,
  status: optionalString,
  participationStatus: optionalString,
  role: optionalString,
  roles: z.record(z.string(), z.boolean()).nullish()
})

export const CalendarEventLocationSchema = z.object({
  name: optionalString
})

export const RecurrenceRuleSchema = z.union([z.string(), z.record(z.string(), z.unknown())])

export const CalendarEventParticipantsSchema = z.union([
  z.array(CalendarEventParticipantSchema),
  z.record(z.string(), CalendarEventParticipantSchema)
])

export const CalendarEventAlertsSchema = z.union([
  z.array(z.unknown()),
  z.record(z.string(), z.unknown())
])

export const CalendarEventSchema = z.object({
  id: z.string(),
  uid: optionalString,
  calendarId: optionalString,
  calendarIds: z.record(z.string(), z.boolean()).nullish(),
  accountId: optionalString,
  title: optionalString,
  name: optionalString,
  summary: optionalString,
  description: optionalString,
  location: optionalString,
  locations: z.record(z.string(), CalendarEventLocationSchema).nullish(),
  start: z.string(),
  end: optionalString,
  duration: optionalString,
  timeZone: optionalString,
  showWithoutTime: optionalBoolean,
  allDay: optionalBoolean,
  color: optionalString,
  organizer: CalendarEventParticipantSchema.nullish(),
  participants: CalendarEventParticipantsSchema.nullish(),
  privacy: optionalString,
  visibility: optionalString,
  status: optionalString,
  freeBusyStatus: optionalString,
  recurrenceRule: optionalString,
  recurrenceRules: z.array(RecurrenceRuleSchema).nullish(),
  recurrenceId: optionalString,
  recurrenceOverrides: z.record(z.string(), z.unknown()).nullish(),
  excluded: optionalBoolean,
  alerts: CalendarEventAlertsSchema.nullish(),
  useDefaultAlerts: optionalBoolean
})

export const CalendarEventListResponseSchema = z.object({
  accountId: z.string().optional(),
  state: z.string().optional(),
  list: z.array(CalendarEventSchema),
  notFound: z.array(z.string()).optional()
})

export const CalendarEventSearchResultsSchema = z
  .object({
    results: z.array(CalendarEventSchema).optional().default([]),
    canCalculateChanges: optionalBoolean,
    position: z.number().nullish(),
    limit: z.number().nullish(),
    total: z.number().nullish()
  })
  // The Groupware API omits `results` entirely when nothing matched, so the envelope has to be
  // recognized by one of its other properties.
  .refine(
    (value) =>
      value.results.length > 0 ||
      [value.canCalculateChanges, value.position, value.limit, value.total].some(
        (property) => property !== undefined && property !== null
      ),
    { message: 'Not a calendar event query response' }
  )

export const CalendarEventsArrayResponseSchema = z.array(CalendarEventSchema)

export const CalendarSchema = z.object({
  id: optionalString,
  calendarId: optionalString,
  name: optionalString,
  title: optionalString,
  displayName: optionalString,
  color: optionalString,
  isDefault: optionalBoolean,
  isReadOnly: optionalBoolean
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

export type CalendarEvent = z.infer<typeof CalendarEventSchema>
export type CalendarEventParticipant = z.infer<typeof CalendarEventParticipantSchema>
export type CalendarEventListResponse = z.infer<typeof CalendarEventListResponseSchema>
export type RawCalendar = z.infer<typeof CalendarSchema>

export type AppointmentParticipant = {
  id?: string
  name?: string
  email?: string
  status?: string
  role?: string
}

export type AppointmentRecurrenceRule = z.infer<typeof RecurrenceRuleSchema>

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

export const parseCalendarEventsResponse = (data: unknown): CalendarEvent[] => {
  const arrayResponse = CalendarEventsArrayResponseSchema.safeParse(data)
  if (arrayResponse.success) {
    return arrayResponse.data
  }

  // JMAP `/get` envelope.
  const listResponse = CalendarEventListResponseSchema.safeParse(data)
  if (listResponse.success) {
    return listResponse.data.list
  }

  // JMAP `/query` envelope, which is what the events endpoint returns.
  return CalendarEventSearchResultsSchema.parse(data).results
}

export const parseCalendarsResponse = (data: unknown): RawCalendar[] => {
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

  return CalendarListResponseSchema.parse(data).list
}
