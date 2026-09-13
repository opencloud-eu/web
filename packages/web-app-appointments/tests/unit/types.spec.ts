import { parseCalendarEventsResponse, parseCalendarsResponse } from '../../src/types'

describe('groupware response parsing', () => {
  describe('parseCalendarEventsResponse', () => {
    it('reads events from a JMAP query result', () => {
      const events = parseCalendarEventsResponse({
        results: [calendarEvent({ id: 'event-1' })],
        position: 0,
        total: 1
      })

      expect(events.map(({ id }) => id)).toEqual(['event-1'])
    })

    it('reads events from a JMAP get result', () => {
      const events = parseCalendarEventsResponse({
        accountId: 'account-1',
        state: 'state-1',
        list: [calendarEvent({ id: 'event-1' }), calendarEvent({ id: 'event-2' })]
      })

      expect(events.map(({ id }) => id)).toEqual(['event-1', 'event-2'])
    })

    it('reads events from a plain array', () => {
      const events = parseCalendarEventsResponse([calendarEvent({ id: 'event-1' })])

      expect(events.map(({ id }) => id)).toEqual(['event-1'])
    })

    it('reads an empty query result that omits the results property', () => {
      expect(parseCalendarEventsResponse({ position: 0, total: 0 })).toEqual([])
    })

    it('rejects a response that matches none of the known shapes', () => {
      expect(() => parseCalendarEventsResponse({ state: 'state-1' })).toThrow()
    })
  })

  describe('parseCalendarsResponse', () => {
    it('reads calendars from a JMAP get result', () => {
      const calendars = parseCalendarsResponse({
        accountId: 'account-1',
        list: [{ id: 'personal', name: 'Personal' }]
      })

      expect(calendars).toEqual([{ id: 'personal', name: 'Personal' }])
    })

    it('reads calendars from a keyed object', () => {
      const calendars = parseCalendarsResponse({
        calendars: { personal: { id: 'personal', name: 'Personal' } }
      })

      expect(calendars).toEqual([{ id: 'personal', name: 'Personal' }])
    })

    it('reads calendars from a plain array', () => {
      const calendars = parseCalendarsResponse([{ id: 'personal', name: 'Personal' }])

      expect(calendars).toEqual([{ id: 'personal', name: 'Personal' }])
    })

    it('rejects a response that matches none of the known shapes', () => {
      expect(() => parseCalendarsResponse({ state: 'state-1' })).toThrow()
    })
  })
})

const calendarEvent = ({ id }: { id: string }) => ({
  id,
  calendarIds: { c: true },
  title: 'Planning',
  start: '2026-06-25T08:00:00.000Z'
})
