import { urlJoin } from '@opencloud-eu/web-client'
import { useClientService, useConfigStore, type HttpClient } from '@opencloud-eu/web-pkg'
import { normalizeAppointments, normalizeCalendars } from '../helpers/appointment'
import { isAppointmentInRange } from '../helpers/date'
import {
  parseCalendarEventsResponse,
  parseCalendarsResponse,
  type Appointment,
  type AppointmentDateRange,
  type Calendar
} from '../types'

export type CalendarApiOptions = {
  client: HttpClient
  /** Resolved lazily so that a changed runtime config is picked up. */
  groupwareUrl: () => string
}

export type CalendarApi = {
  loadCalendars: (accountId: string, signal: AbortSignal) => Promise<Calendar[]>
  loadAppointments: (
    accountId: string,
    range: AppointmentDateRange,
    calendarIds: string[],
    signal: AbortSignal
  ) => Promise<Appointment[]>
}

export const useCalendarApi = (): CalendarApi => {
  const configStore = useConfigStore()
  const clientService = useClientService()

  return createCalendarApi({
    client: clientService.httpAuthenticated,
    groupwareUrl: () => configStore.groupwareUrl
  })
}

export const createCalendarApi = ({ client, groupwareUrl }: CalendarApiOptions): CalendarApi => {
  const loadCalendars = async (accountId: string, signal: AbortSignal) => {
    const { data } = await client.get(
      urlJoin(groupwareUrl(), 'accounts', encodeURIComponent(accountId), 'calendars'),
      { signal }
    )

    return normalizeCalendars(parseCalendarsResponse(data))
  }

  const loadEvents = async (accountId: string, calendarId: string, signal: AbortSignal) => {
    const { data } = await client.get(
      urlJoin(
        groupwareUrl(),
        'accounts',
        encodeURIComponent(accountId),
        'calendars',
        encodeURIComponent(calendarId),
        'events'
      ),
      { signal }
    )

    return normalizeAppointments(parseCalendarEventsResponse(data)).map((appointment) => ({
      ...appointment,
      calendarId: appointment.calendarId || calendarId
    }))
  }

  /**
   * MVP limitation: the Groupware API rejects every query parameter but `limit`, so the full
   * event collection of each calendar is fetched and narrowed down to the visible range here.
   */
  const loadAppointments = async (
    accountId: string,
    range: AppointmentDateRange,
    calendarIds: string[],
    signal: AbortSignal
  ) => {
    if (!calendarIds.length) {
      return []
    }

    const appointmentLists = await Promise.all(
      calendarIds.map((calendarId) => loadEvents(accountId, calendarId, signal))
    )

    return deduplicateAppointments(appointmentLists.flat()).filter((appointment) =>
      isAppointmentInRange(appointment, range)
    )
  }

  return {
    loadCalendars,
    loadAppointments
  }
}

const deduplicateAppointments = (appointments: Appointment[]) => {
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
