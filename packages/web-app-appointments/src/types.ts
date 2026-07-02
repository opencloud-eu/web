import { z } from 'zod'
import { DateTime, Duration } from 'luxon'

export const AppointmentParticipantSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  status: z.string().optional(),
  role: z.string().optional()
})

export const AppointmentSchema = z.object({
  id: z.string(),
  calendarId: z.string().optional(),
  accountId: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  location: z.string().optional(),
  start: z.string(),
  end: z.string(),
  allDay: z.boolean().optional().default(false),
  color: z.string().optional(),
  organizer: AppointmentParticipantSchema.optional(),
  participants: z.array(AppointmentParticipantSchema).optional().default([]),
  recurrenceRule: z.string().optional()
})

export const JmapCalendarEventSchema = z
  .object({
    id: z.string(),
    calendarId: z.string().optional(),
    calendarIds: z.record(z.string(), z.boolean()).optional(),
    title: z.string().optional(),
    name: z.string().optional(),
    summary: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    start: z.string(),
    end: z.string().optional(),
    duration: z.string().optional(),
    showWithoutTime: z.boolean().optional(),
    allDay: z.boolean().optional(),
    color: z.string().optional(),
    recurrenceRule: z.unknown().optional()
  })
  .transform((event) => {
    const calendarId = event.calendarId || Object.keys(event.calendarIds || {})[0]
    const end = event.end || addDurationToDateString(event.start, event.duration)

    return {
      id: event.id,
      calendarId,
      title: event.title || event.name || event.summary || '',
      description: event.description,
      location: event.location,
      start: event.start,
      end,
      allDay: event.allDay || event.showWithoutTime || false,
      color: event.color,
      recurrenceRule: typeof event.recurrenceRule === 'string' ? event.recurrenceRule : undefined,
      participants: [] as AppointmentParticipant[]
    }
  })

export const AppointmentListResponseSchema = z.object({
  accountId: z.string().optional(),
  state: z.string().optional(),
  list: z
    .array(z.union([AppointmentSchema, JmapCalendarEventSchema]))
    .optional()
    .default([]),
  notFound: z.array(z.string()).optional()
})

export const AppointmentSearchResultsSchema = z.object({
  results: z
    .array(z.union([AppointmentSchema, JmapCalendarEventSchema]))
    .optional()
    .default([]),
  canCalculateChanges: z.boolean().optional(),
  position: z.number().optional(),
  limit: z.number().optional(),
  total: z.number().optional()
})

export const AppointmentsArrayResponseSchema = z.array(
  z.union([AppointmentSchema, JmapCalendarEventSchema])
)

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

export type Appointment = z.infer<typeof AppointmentSchema>
export type AppointmentParticipant = z.infer<typeof AppointmentParticipantSchema>
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

export type CalendarViewMode = 'day' | '3-day' | 'week' | 'month' | 'agenda'

export type CreateAppointmentPayload = {
  calendarId: string
  title: string
  start: string
  duration: string
  timeZone: string
  description?: string
  location?: string
  allDay?: boolean
}

export const parseAppointmentsResponse = (data: unknown): Appointment[] => {
  const arrayResponse = AppointmentsArrayResponseSchema.safeParse(data)
  if (arrayResponse.success) {
    return arrayResponse.data
  }

  const singleResponse = z.union([AppointmentSchema, JmapCalendarEventSchema]).safeParse(data)
  if (singleResponse.success) {
    return [singleResponse.data as Appointment]
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

const addDurationToDateString = (start: string, duration?: string) => {
  if (!duration) {
    return start
  }

  const startDate = DateTime.fromISO(start)
  const parsedDuration = Duration.fromISO(duration)
  if (!startDate.isValid || !parsedDuration.isValid) {
    return start
  }

  return startDate.plus(parsedDuration).toUTC().toISO()
}

export const parseCalendarsResponse = (data: unknown): Calendar[] => {
  const listResponse = CalendarListResponseSchema.safeParse(data)
  if (listResponse.success) {
    return listResponse.data.list as Calendar[]
  }

  const objectResponse = CalendarObjectResponseSchema.safeParse(data)
  if (objectResponse.success) {
    return Object.values(objectResponse.data.calendars) as Calendar[]
  }

  const arrayResponse = CalendarsArrayResponseSchema.safeParse(data)
  if (arrayResponse.success) {
    return arrayResponse.data as Calendar[]
  }

  const singleResponse = CalendarSchema.safeParse(data)
  if (singleResponse.success) {
    return [singleResponse.data as Calendar]
  }

  return CalendarListResponseSchema.parse(data).list as Calendar[]
}
