import { urlJoin } from '@opencloud-eu/web-client'
import { useClientService, useConfigStore, type HttpClient } from '@opencloud-eu/web-pkg'
import { isAppointmentInRange } from '../helpers/date'
import {
  parseAppointmentsResponse,
  parseCalendarsResponse,
  type Appointment,
  type AppointmentDateRange,
  type Calendar
} from '../types'

export type CalendarApiOptions = {
  client: HttpClient
  groupwareUrl: string
}

export type CalendarApi = {
  loadCalendars: (accountId: string, signal?: AbortSignal) => Promise<Calendar[]>
  loadAppointments: (
    accountId: string,
    range: AppointmentDateRange,
    calendarId?: string | string[],
    signal?: AbortSignal
  ) => Promise<Appointment[]>
}

export function useCalendarApi() {
  const configStore = useConfigStore()
  const clientService = useClientService()

  return createCalendarApi({
    client: clientService.httpAuthenticated,
    groupwareUrl: configStore.groupwareUrl
  })
}

export function createCalendarApi({ client, groupwareUrl }: CalendarApiOptions): CalendarApi {
  function get(url: string, signal?: AbortSignal) {
    if (signal) {
      return client.get(url, { signal })
    }

    return client.get(url)
  }

  async function loadCalendars(accountId: string, signal?: AbortSignal) {
    const { data } = await get(
      urlJoin(groupwareUrl, 'accounts', encodeURIComponent(accountId), 'calendars'),
      signal
    )

    return parseCalendarsResponse(data)
  }

  async function loadAppointmentsFromCollection(
    accountId: string,
    range: AppointmentDateRange,
    calendarId?: string,
    signal?: AbortSignal
  ): Promise<Appointment[]> {
    const { data } = await get(
      urlJoin(groupwareUrl, 'accounts', encodeURIComponent(accountId), 'calendars', 'events'),
      signal
    )

    return filterAppointments(parseAppointmentsResponse(data), range, calendarId)
  }

  async function loadAppointments(
    accountId: string,
    range: AppointmentDateRange,
    calendarId?: string | string[],
    signal?: AbortSignal
  ): Promise<Appointment[]> {
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

      const appointments = parseAppointmentsResponse(data).map((appointment) => ({
        ...appointment,
        calendarId: appointment.calendarId || calendarId
      }))
      return filterAppointments(appointments, range, calendarId)
    } catch (error) {
      if (!shouldFallbackToCollectionEndpoint(error)) {
        throw error
      }

      return loadAppointmentsFromCollection(accountId, range, calendarId, signal)
    }
  }

  return {
    loadCalendars,
    loadAppointments
  }
}

function shouldFallbackToCollectionEndpoint(error: unknown) {
  if (!error || typeof error !== 'object' || !('response' in error)) {
    return false
  }

  const response = (error as { response?: { status?: number } }).response
  return [400, 404, 405].includes(response?.status || 0)
}

function filterAppointments(
  appointments: Appointment[],
  range: AppointmentDateRange,
  calendarId?: string
) {
  return appointments.filter((appointment) => {
    if (calendarId && appointment.calendarId !== calendarId) {
      return false
    }

    return isAppointmentInRange(appointment, range)
  })
}

function deduplicateAppointments(appointments: Appointment[]) {
  const seen = new Set<string>()

  return appointments.filter((appointment) => {
    const key = `${appointment.calendarId || ''}:${appointment.id}:${appointment.recurrenceId || appointment.start}`
    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}
