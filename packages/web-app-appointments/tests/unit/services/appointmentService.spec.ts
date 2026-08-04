import { createAppointmentService } from '../../../src/services/appointmentService'
import type { Appointment } from '../../../src/types'

describe('appointment service', () => {
  it('loads calendars for an account and forwards the abort signal', async () => {
    const client = {
      get: vi.fn().mockResolvedValueOnce({ data: [{ id: 'c', name: 'Personal' }] })
    }
    const service = createAppointmentService({
      client: client as never,
      groupwareUrl: 'https://example.test/groupware'
    })
    const controller = new AbortController()

    const result = await service.loadCalendars('e', controller.signal)

    expect(result).toEqual([expect.objectContaining({ id: 'c', name: 'Personal' })])
    expect(client.get).toHaveBeenCalledWith('https://example.test/groupware/accounts/e/calendars', {
      signal: controller.signal
    })
  })

  it('loads calendar events without range query params and filters them client-side', async () => {
    const client = {
      get: vi.fn().mockResolvedValueOnce({
        data: [
          appointment({ id: 'event-1', calendarId: 'c', start: '2026-06-25T08:00:00.000Z' }),
          appointment({ id: 'event-2', calendarId: 'c', start: '2026-08-25T08:00:00.000Z' })
        ]
      })
    }
    const service = createAppointmentService({
      client: client as never,
      groupwareUrl: 'https://example.test/groupware'
    })
    const range = {
      start: '2026-05-31T22:00:00.000Z',
      end: '2026-07-05T21:59:59.999Z'
    }

    const result = await service.loadAppointments('e', range, 'c')

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('event-1')
    expect(client.get).toHaveBeenCalledWith(
      'https://example.test/groupware/accounts/e/calendars/c/events'
    )
  })

  it('falls back to the collection events endpoint when calendar events endpoint is rejected', async () => {
    const client = {
      get: vi
        .fn()
        .mockRejectedValueOnce({ response: { status: 400 } })
        .mockResolvedValueOnce({ data: [appointment({ id: 'event-1', calendarId: 'c' })] })
    }
    const service = createAppointmentService({
      client: client as never,
      groupwareUrl: 'https://example.test/groupware'
    })
    const range = {
      start: '2026-05-31T22:00:00.000Z',
      end: '2026-07-05T21:59:59.999Z'
    }

    const result = await service.loadAppointments('e', range, 'c')

    expect(result).toHaveLength(1)
    expect(client.get).toHaveBeenNthCalledWith(
      1,
      'https://example.test/groupware/accounts/e/calendars/c/events'
    )
    expect(client.get).toHaveBeenNthCalledWith(
      2,
      'https://example.test/groupware/accounts/e/calendars/events'
    )
  })

  it('loads events from multiple selected calendars', async () => {
    const client = {
      get: vi
        .fn()
        .mockResolvedValueOnce({ data: [appointment({ id: 'event-1', calendarId: 'personal' })] })
        .mockResolvedValueOnce({ data: [appointment({ id: 'event-2', calendarId: 'team' })] })
    }
    const service = createAppointmentService({
      client: client as never,
      groupwareUrl: 'https://example.test/groupware'
    })
    const range = {
      start: '2026-05-31T22:00:00.000Z',
      end: '2026-07-05T21:59:59.999Z'
    }

    const result = await service.loadAppointments('e', range, ['personal', 'team'])

    expect(result.map(({ id }) => id)).toEqual(['event-1', 'event-2'])
    expect(client.get).toHaveBeenNthCalledWith(
      1,
      'https://example.test/groupware/accounts/e/calendars/personal/events'
    )
    expect(client.get).toHaveBeenNthCalledWith(
      2,
      'https://example.test/groupware/accounts/e/calendars/team/events'
    )
  })
})

const appointment = (overrides: Partial<Appointment>): Appointment => ({
  id: 'appointment',
  calendarId: 'c',
  title: 'Planning',
  start: '2026-06-25T08:00:00.000Z',
  end: '2026-06-25T09:00:00.000Z',
  allDay: false,
  participants: [],
  ...overrides
})
