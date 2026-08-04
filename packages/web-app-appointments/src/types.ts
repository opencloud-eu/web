import { z } from 'zod'
import { DateTime, Duration } from 'luxon'

export const AppointmentParticipantSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  status: z.string().optional(),
  role: z.string().optional()
})

const AppointmentLocationSchema = z
  .object({
    name: z.string().optional()
  })
  .passthrough()

export const AppointmentSchema = z
  .object({
    id: z.string(),
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
    timeZone: z.string().optional(),
    showWithoutTime: z.boolean().optional(),
    allDay: z.boolean().optional(),
    color: z.string().optional(),
    organizer: AppointmentParticipantSchema.optional(),
    participants: z.array(AppointmentParticipantSchema).optional(),
    recurrenceRule: z.unknown().optional()
  })
  .transform((event) => {
    const calendarId = event.calendarId || Object.keys(event.calendarIds || {})[0]
    const end = event.end || addDurationToDateString(event.start, event.duration, event.timeZone)
    const location = event.location || Object.values(event.locations || {})[0]?.name

    return {
      id: event.id,
      calendarId,
      accountId: event.accountId,
      title: event.title || event.name || event.summary || '',
      description: event.description,
      location,
      start: event.start,
      end,
      allDay: event.allDay || event.showWithoutTime || false,
      color: event.color,
      organizer: event.organizer,
      recurrenceRule: typeof event.recurrenceRule === 'string' ? event.recurrenceRule : undefined,
      participants: event.participants || []
    }
  })

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

export type Appointment = {
  id: string
  calendarId?: string
  accountId?: string
  title: string
  description?: string
  location?: string
  start: string
  end: string
  allDay: boolean
  color?: string
  organizer?: z.infer<typeof AppointmentParticipantSchema>
  recurrenceRule?: string
  participants: z.infer<typeof AppointmentParticipantSchema>[]
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

export const parseAppointmentsResponse = (data: unknown): Appointment[] => {
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

const addDurationToDateString = (start: string, duration?: string, timeZone?: string) => {
  if (!duration) {
    return start
  }

  const startDate = DateTime.fromISO(start, timeZone ? { zone: timeZone } : undefined)
  const parsedDuration = Duration.fromISO(duration)
  if (!startDate.isValid || !parsedDuration.isValid) {
    return start
  }

  return startDate.plus(parsedDuration).toUTC().toISO() || start
}

export const parseCalendarsResponse = (data: unknown): Calendar[] => {
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
