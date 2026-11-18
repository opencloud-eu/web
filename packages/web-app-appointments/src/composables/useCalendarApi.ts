import { urlJoin } from '@opencloud-eu/web-client'
import { useClientService, useConfigStore, type HttpClient } from '@opencloud-eu/web-pkg'
import { normalizeAppointments, normalizeCalendars } from '../helpers/appointment'
import {
  parseCalendarEventsPage,
  parseCalendarsResponse,
  type Appointment,
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

  const loadEventPage = async (
    accountId: string,
    calendarId: string,
    signal: AbortSignal,
    limit?: number
  ) => {
    const { data } = await client.get(
      urlJoin(
        groupwareUrl(),
        'accounts',
        encodeURIComponent(accountId),
        'calendars',
        encodeURIComponent(calendarId),
        'events'
      ),
      limit === undefined ? { signal } : { signal, params: { limit } }
    )

    return parseCalendarEventsPage(data)
  }

  const loadEvents = async (accountId: string, calendarId: string, signal: AbortSignal) => {
    let page = await loadEventPage(accountId, calendarId, signal)

    if (page.total !== undefined && page.events.length < page.total) {
      page = await loadEventPage(accountId, calendarId, signal, page.total)
    }

    // The server may cap the limit. Showing the events we got beats showing none at all.
    if (page.total !== undefined && page.events.length < page.total) {
      console.warn(
        `Groupware API returned ${page.events.length} of ${page.total} events for calendar ${calendarId}`
      )
    }

    return normalizeAppointments(page.events).map((appointment) => ({
      ...appointment,
      calendarId: appointment.calendarId || calendarId,
      calendarIds: appointment.calendarIds.includes(calendarId)
        ? appointment.calendarIds
        : [...appointment.calendarIds, calendarId]
    }))
  }

  /**
   * MVP limitation: the Groupware API rejects every query parameter but `limit`, so the full
   * event collection of each calendar is fetched. The store narrows it down to the visible range.
   */
  const loadAppointments = async (
    accountId: string,
    calendarIds: string[],
    signal: AbortSignal
  ) => {
    if (!calendarIds.length) {
      return []
    }

    const appointmentLists = await Promise.all(
      calendarIds.map((calendarId) => loadEvents(accountId, calendarId, signal))
    )

    return deduplicateAppointments(appointmentLists.flat())
  }

  return {
    loadCalendars,
    loadAppointments
  }
}

const deduplicateAppointments = (appointments: Appointment[]) => {
  const appointmentsById = new Map<string, Appointment>()

  for (const appointment of appointments) {
    const key = `${appointment.id}:${appointment.recurrenceId || appointment.start}`
    const existingAppointment = appointmentsById.get(key)

    if (!existingAppointment) {
      appointmentsById.set(key, appointment)
      continue
    }

    appointmentsById.set(key, {
      ...existingAppointment,
      calendarIds: [...new Set([...existingAppointment.calendarIds, ...appointment.calendarIds])]
    })
  }

  return [...appointmentsById.values()]
}
