import { urlJoin } from '@opencloud-eu/web-client'
import type { HttpClient } from '@opencloud-eu/web-pkg'
import type {
  Appointment,
  AppointmentDateRange,
  Calendar,
  CreateAppointmentPayload
} from '../types'
import { parseAppointmentsResponse, parseCalendarsResponse } from '../types'

export type AppointmentServiceOptions = {
  client: HttpClient
  groupwareUrl: string
}

export type AppointmentService = {
  loadCalendars: (accountId: string) => Promise<Calendar[]>
  loadAppointments: (
    accountId: string,
    range: AppointmentDateRange,
    calendarId?: string | string[]
  ) => Promise<Appointment[]>
  createAppointment: (
    accountId: string,
    payload: CreateAppointmentPayload
  ) => Promise<Appointment | null>
}

export const createAppointmentService = ({
  client,
  groupwareUrl
}: AppointmentServiceOptions): AppointmentService => {
  const loadCalendars = async (accountId: string) => {
    const { data } = await client.get(
      urlJoin(groupwareUrl, 'accounts', encodeURIComponent(accountId), 'calendars')
    )

    return parseCalendarsResponse(data)
  }

  const loadAppointmentsFromCollection = async (
    accountId: string,
    range: AppointmentDateRange,
    calendarId?: string
  ): Promise<Appointment[]> => {
    const { data } = await client.get(
      urlJoin(groupwareUrl, 'accounts', encodeURIComponent(accountId), 'calendars', 'events')
    )

    return filterAppointmentsByRange(parseAppointmentsResponse(data), range, calendarId)
  }

  const loadAppointments = async (
    accountId: string,
    range: AppointmentDateRange,
    calendarId?: string | string[]
  ): Promise<Appointment[]> => {
    if (Array.isArray(calendarId)) {
      const appointmentLists: Appointment[][] = await Promise.all(
        calendarId.map((id) => loadAppointments(accountId, range, id))
      )

      return deduplicateAppointments(appointmentLists.flat())
    }

    if (!calendarId) {
      return loadAppointmentsFromCollection(accountId, range)
    }

    try {
      const { data } = await client.get(
        urlJoin(
          groupwareUrl,
          'accounts',
          encodeURIComponent(accountId),
          'calendars',
          encodeURIComponent(calendarId),
          'events'
        )
      )

      return filterAppointmentsByRange(parseAppointmentsResponse(data), range, calendarId)
    } catch (e) {
      if (!shouldFallbackToCollectionEndpoint(e)) {
        throw e
      }

      return loadAppointmentsFromCollection(accountId, range, calendarId)
    }
  }

  const createAppointment = async (accountId: string, payload: CreateAppointmentPayload) => {
    const { data } = await client.post(
      urlJoin(groupwareUrl, 'accounts', encodeURIComponent(accountId), 'events'),
      {
        '@type': 'Event',
        calendarIds: {
          [payload.calendarId]: true
        },
        isDraft: false,
        title: payload.title,
        start: payload.start,
        duration: payload.duration,
        timeZone: payload.timeZone,
        showWithoutTime: payload.allDay || false,
        description: payload.description,
        descriptionContentType: payload.description ? 'text/plain' : undefined,
        locations: payload.location
          ? {
              main: {
                '@type': 'Location',
                name: payload.location
              }
            }
          : undefined,
        freeBusyStatus: 'busy',
        privacy: 'public',
        status: 'confirmed'
      }
    )

    return parseAppointmentsResponse(data)[0] || null
  }

  return {
    loadCalendars,
    loadAppointments,
    createAppointment
  }
}

const shouldFallbackToCollectionEndpoint = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('response' in error)) {
    return false
  }

  const response = (error as { response?: { status?: number } }).response
  return [400, 404, 405].includes(response?.status || 0)
}

const filterAppointmentsByRange = (
  appointments: Appointment[],
  range: AppointmentDateRange,
  calendarId?: string
) => {
  const rangeStart = new Date(range.start).getTime()
  const rangeEnd = new Date(range.end).getTime()

  return appointments.filter((appointment) => {
    if (calendarId && appointment.calendarId && appointment.calendarId !== calendarId) {
      return false
    }

    const appointmentStart = new Date(appointment.start).getTime()
    const appointmentEnd = new Date(appointment.end).getTime()

    if (Number.isNaN(appointmentStart) || Number.isNaN(appointmentEnd)) {
      return false
    }

    return appointmentStart <= rangeEnd && appointmentEnd >= rangeStart
  })
}

const deduplicateAppointments = (appointments: Appointment[]) => {
  const seen = new Set<string>()

  return appointments.filter((appointment) => {
    const key = `${appointment.calendarId || ''}:${appointment.id}`
    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}
