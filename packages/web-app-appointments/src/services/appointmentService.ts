import { urlJoin } from '@opencloud-eu/web-client'
import type { HttpClient } from '@opencloud-eu/web-pkg'
import type { Appointment, AppointmentDateRange, Calendar } from '../types'
import { parseAppointmentsResponse, parseCalendarsResponse } from '../types'

export type AppointmentServiceOptions = {
  client: HttpClient
  groupwareUrl: string
}

export type AppointmentService = {
  loadCalendars: (accountId: string, signal?: AbortSignal) => Promise<Calendar[]>
  loadAppointments: (
    accountId: string,
    range: AppointmentDateRange,
    calendarId?: string | string[],
    signal?: AbortSignal
  ) => Promise<Appointment[]>
}

export const createAppointmentService = ({
  client,
  groupwareUrl
}: AppointmentServiceOptions): AppointmentService => {
  const get = (url: string, signal?: AbortSignal) => {
    if (signal) {
      return client.get(url, { signal })
    }

    return client.get(url)
  }

  const loadCalendars = async (accountId: string, signal?: AbortSignal) => {
    const { data } = await get(
      urlJoin(groupwareUrl, 'accounts', encodeURIComponent(accountId), 'calendars'),
      signal
    )

    return parseCalendarsResponse(data)
  }

  const loadAppointmentsFromCollection = async (
    accountId: string,
    range: AppointmentDateRange,
    calendarId?: string,
    signal?: AbortSignal
  ): Promise<Appointment[]> => {
    const { data } = await get(
      urlJoin(groupwareUrl, 'accounts', encodeURIComponent(accountId), 'calendars', 'events'),
      signal
    )

    return filterAppointmentsByRange(parseAppointmentsResponse(data), range, calendarId)
  }

  const loadAppointments = async (
    accountId: string,
    range: AppointmentDateRange,
    calendarId?: string | string[],
    signal?: AbortSignal
  ): Promise<Appointment[]> => {
    if (Array.isArray(calendarId)) {
      const appointmentLists: Appointment[][] = await Promise.all(
        calendarId.map((id) => loadAppointments(accountId, range, id, signal))
      )

      return deduplicateAppointments(appointmentLists.flat())
    }

    if (!calendarId) {
      return loadAppointmentsFromCollection(accountId, range, undefined, signal)
    }

    try {
      const { data } = await get(
        urlJoin(
          groupwareUrl,
          'accounts',
          encodeURIComponent(accountId),
          'calendars',
          encodeURIComponent(calendarId),
          'events'
        ),
        signal
      )

      return filterAppointmentsByRange(parseAppointmentsResponse(data), range, calendarId)
    } catch (e) {
      if (!shouldFallbackToCollectionEndpoint(e)) {
        throw e
      }

      return loadAppointmentsFromCollection(accountId, range, calendarId, signal)
    }
  }

  return {
    loadCalendars,
    loadAppointments
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
