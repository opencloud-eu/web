import { normalizeAppointment, normalizeCalendar } from '../../../src/helpers/appointment'
import type { CalendarEvent, RawCalendar } from '../../../src/types'

describe('appointment normalization', () => {
  it('derives the calendar id, title and end from a JMAP calendar event', () => {
    const appointment = normalizeAppointment({
      id: 'event-1',
      calendarIds: { c: true },
      title: 'Planning',
      start: '2026-06-25T08:00:00.000Z',
      duration: 'PT1H',
      showWithoutTime: false
    })

    expect(appointment).toEqual(
      expect.objectContaining({
        id: 'event-1',
        calendarId: 'c',
        title: 'Planning',
        start: '2026-06-25T08:00:00.000Z',
        end: '2026-06-25T09:00:00.000Z',
        allDay: false
      })
    )
  })

  it('keeps an explicit end date', () => {
    const appointment = normalizeAppointment({
      id: 'event-with-end',
      calendarIds: { personal: true },
      title: 'Planning',
      start: '2026-06-25T08:00:00.000Z',
      end: '2026-06-25T09:00:00.000Z'
    })

    expect(appointment.calendarId).toBe('personal')
    expect(appointment.end).toBe('2026-06-25T09:00:00.000Z')
  })

  it('normalizes calendar events created in Stalwart', () => {
    const appointment = normalizeAppointment(
      stalwartEvent({ id: 'n', title: 'Tagesplanung', start: '2026-06-25T09:00:00' })
    )

    expect(appointment).toEqual(
      expect.objectContaining({
        calendarId: 'c',
        title: 'Tagesplanung',
        start: '2026-06-25T09:00:00',
        end: '2026-06-25T09:45:00.000+02:00',
        location: 'OpenCloud Office',
        privacy: 'public',
        status: 'confirmed'
      })
    )
  })

  it('normalizes participant, reminder and recurrence metadata for read-only details', () => {
    const appointment = normalizeAppointment({
      ...stalwartEvent({ id: 'metadata', title: 'Team sync', start: '2026-06-25T09:00:00' }),
      participants: {
        ada: {
          name: 'Ada',
          email: 'ada@example.test',
          participationStatus: 'accepted',
          roles: { attendee: true }
        }
      },
      recurrenceRules: [{ '@type': 'RecurrenceRule', frequency: 'weekly' }],
      alerts: { reminder: { action: 'display' } }
    })

    expect(appointment.participants).toEqual([
      expect.objectContaining({
        id: 'ada',
        name: 'Ada',
        status: 'accepted',
        role: 'attendee'
      })
    ])
    expect(appointment.hasRecurrence).toBeTruthy()
    expect(appointment.hasReminder).toBeTruthy()
  })

  it('falls back to the first participant with an organizer role', () => {
    const appointment = normalizeAppointment({
      id: 'event-1',
      start: '2026-06-25T09:00:00.000Z',
      participants: [
        { name: 'Ada', roles: { attendee: true } },
        { name: 'Grace', roles: { chair: true } }
      ]
    })

    expect(appointment.organizer?.name).toBe('Grace')
  })
})

describe('calendar normalization', () => {
  it('falls back to alternative id and name properties', () => {
    expect(normalizeCalendar({ calendarId: 'team', displayName: 'Team' })).toEqual({
      id: 'team',
      name: 'Team',
      color: undefined,
      isDefault: undefined,
      isReadOnly: undefined
    })
  })

  it('falls back to the id when no name is given', () => {
    expect(normalizeCalendar({ id: 'personal' }).name).toBe('personal')
  })

  it('throws when the calendar has no id at all', () => {
    expect(() => normalizeCalendar({ name: 'Nameless' } as RawCalendar)).toThrow(
      'Groupware API returned a calendar without an id'
    )
  })
})

const stalwartEvent = ({
  id,
  title,
  start
}: {
  id: string
  title: string
  start: string
}): CalendarEvent => ({
  id,
  calendarIds: { c: true },
  uid: `${id}-uid`,
  title,
  description: 'Test appointment',
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
