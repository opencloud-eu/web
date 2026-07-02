import { parseAppointmentsResponse } from '../../src/types'

describe('appointment response parsing', () => {
  it('normalizes JMAP calendar events', () => {
    const appointments = parseAppointmentsResponse({
      results: [
        {
          id: 'event-1',
          calendarIds: { c: true },
          title: 'Planning',
          start: '2026-06-25T08:00:00.000Z',
          duration: 'PT1H',
          showWithoutTime: false
        }
      ]
    })

    expect(appointments).toEqual([
      expect.objectContaining({
        id: 'event-1',
        calendarId: 'c',
        title: 'Planning',
        start: '2026-06-25T08:00:00.000Z',
        end: '2026-06-25T09:00:00.000Z'
      })
    ])
  })

  it('accepts empty search result responses without a results field', () => {
    expect(
      parseAppointmentsResponse({
        canCalculateChanges: true,
        total: 0
      })
    ).toEqual([])
  })

  it('normalizes calendar events created in Stalwart', () => {
    const appointments = parseAppointmentsResponse({
      results: [
        stalwartEvent({ id: 'n', title: 'Tagesplanung', start: '2026-06-25T09:00:00' }),
        stalwartEvent({ id: 'o', title: 'Projektabstimmung', start: '2026-06-26T10:30:00' }),
        stalwartEvent({ id: 'p', title: 'Kunden-Check-in', start: '2026-06-27T14:00:00' }),
        stalwartEvent({ id: 'q', title: 'Review-Termin', start: '2026-06-28T11:00:00' }),
        stalwartEvent({
          id: 'r',
          title: 'Wochenstart Vorbereitung',
          start: '2026-06-29T09:30:00'
        })
      ],
      position: 0,
      total: 5
    })

    expect(appointments.map(({ id }) => id)).toEqual(['n', 'o', 'p', 'q', 'r'])
    expect(appointments[0]).toEqual(
      expect.objectContaining({
        calendarId: 'c',
        title: 'Tagesplanung',
        start: '2026-06-25T09:00:00'
      })
    )
  })
})

const stalwartEvent = ({ id, title, start }: { id: string; title: string; start: string }) => ({
  id,
  calendarIds: { c: true },
  isOrigin: true,
  uid: `${id}-uid`,
  prodId: 'GroupwareAssistant',
  title,
  description: 'Test appointment',
  descriptionContentType: 'text/plain',
  locations: {
    main: {
      name: 'OpenCloud Office'
    }
  },
  freeBusyStatus: 'busy',
  privacy: 'public',
  timeZone: 'Europe/Berlin',
  start,
  duration: 'PT45M',
  status: 'confirmed'
})
