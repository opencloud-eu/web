import responses from './fixtures/groupwareApiResponses.json'
import { normalizeAppointments, normalizeCalendars } from '../../src/helpers/appointment'
import {
  createAppointmentOccurrences,
  groupAppointmentOccurrencesByDay
} from '../../src/helpers/date'
import { parseCalendarEventsResponse, parseCalendarsResponse } from '../../src/types'

/**
 * The fixture holds verbatim responses of the OpenCloud Groupware API backed by Stalwart
 * (`GET /groupware/accounts/{accountId}/calendars` and `.../calendars/{calendarId}/events`).
 */
describe('Groupware API responses', () => {
  it('reads the calendars of an account', () => {
    const calendars = normalizeCalendars(parseCalendarsResponse(responses.calendars))

    expect(calendars).toEqual([
      {
        id: 'b',
        name: 'Stalwart Calendar (alan@example.org)',
        color: undefined,
        isDefault: true,
        isReadOnly: undefined
      }
    ])
  })

  it('reads an empty event list that omits the results property', () => {
    expect(parseCalendarEventsResponse(responses.noEvents)).toEqual([])
  })

  it('normalizes a timed and an all-day event', () => {
    const appointments = normalizeAppointments(parseCalendarEventsResponse(responses.events))

    expect(appointments).toEqual([
      expect.objectContaining({
        id: 'b',
        calendarId: 'b',
        title: 'Tagesplanung',
        description: 'Review mit dem Team',
        location: 'OpenCloud Office',
        start: '2026-09-15T09:00:00',
        end: '2026-09-15T09:45:00.000+02:00',
        timeZone: 'Europe/Berlin',
        allDay: false,
        status: 'confirmed',
        privacy: 'public'
      }),
      expect.objectContaining({
        id: 'c',
        title: 'Konferenz',
        start: '2026-09-17T00:00:00',
        end: '2026-09-19T00:00:00.000+00:00',
        allDay: true
      })
    ])
  })

  it('spreads a multi-day all-day event over the days it covers', () => {
    const appointments = normalizeAppointments(parseCalendarEventsResponse(responses.events))
    const occurrencesByDay = groupAppointmentOccurrencesByDay(
      createAppointmentOccurrences(appointments)
    )

    // The two day "Konferenz" ends exclusively on the 19th, so it does not cover that day.
    expect(Object.keys(occurrencesByDay)).toEqual(['2026-09-15', '2026-09-17', '2026-09-18'])
  })
})
