import { createCalendarApi } from '../../../src/composables/useCalendarApi'

const GROUPWARE_URL = 'https://example.test/groupware'

const visibleRange = {
  start: '2026-05-31T22:00:00.000Z',
  end: '2026-07-05T21:59:59.999Z'
}

describe('calendar api composable', () => {
  it('loads and normalizes calendars, forwarding the abort signal', async () => {
    const client = {
      get: vi.fn().mockResolvedValueOnce({ data: [{ id: 'c', displayName: 'Personal' }] })
    }
    const { api, signal } = getApi(client)

    const result = await api.loadCalendars('e', signal)

    expect(result).toEqual([expect.objectContaining({ id: 'c', name: 'Personal' })])
    expect(client.get).toHaveBeenCalledWith(`${GROUPWARE_URL}/accounts/e/calendars`, { signal })
  })

  it('resolves the groupware url on every request', async () => {
    const client = { get: vi.fn().mockResolvedValue({ data: [] }) }
    let groupwareUrl = 'https://first.test/groupware'
    const api = createCalendarApi({ client: client as never, groupwareUrl: () => groupwareUrl })
    const signal = new AbortController().signal

    await api.loadCalendars('e', signal)
    groupwareUrl = 'https://second.test/groupware'
    await api.loadCalendars('e', signal)

    expect(client.get).toHaveBeenNthCalledWith(
      2,
      'https://second.test/groupware/accounts/e/calendars',
      { signal }
    )
  })

  // The Groupware API does not accept a date range yet, see useCalendarApi.
  it('loads calendar events without range query params and filters them client-side', async () => {
    const client = {
      get: vi.fn().mockResolvedValueOnce({
        data: [
          calendarEvent({ id: 'event-1', start: '2026-06-25T08:00:00.000Z' }),
          calendarEvent({ id: 'event-2', start: '2026-08-25T08:00:00.000Z' })
        ]
      })
    }
    const { api, signal } = getApi(client)

    const result = await api.loadAppointments('e', visibleRange, ['c'], signal)

    expect(result.map(({ id }) => id)).toEqual(['event-1'])
    expect(client.get).toHaveBeenCalledWith(`${GROUPWARE_URL}/accounts/e/calendars/c/events`, {
      signal
    })
  })

  it('adds the requested calendar id when a calendar endpoint omits it', async () => {
    const client = {
      get: vi
        .fn()
        .mockResolvedValueOnce({ data: [calendarEvent({ id: 'event-1', calendarIds: null })] })
    }
    const { api, signal } = getApi(client)

    const [result] = await api.loadAppointments('e', visibleRange, ['personal'], signal)

    expect(result.calendarId).toBe('personal')
  })

  it('loads events from every requested calendar', async () => {
    const client = {
      get: vi
        .fn()
        .mockResolvedValueOnce({ data: [calendarEvent({ id: 'event-1' })] })
        .mockResolvedValueOnce({ data: [calendarEvent({ id: 'event-2' })] })
    }
    const { api, signal } = getApi(client)

    const result = await api.loadAppointments('e', visibleRange, ['personal', 'team'], signal)

    expect(result.map(({ id }) => id)).toEqual(['event-1', 'event-2'])
    expect(client.get).toHaveBeenNthCalledWith(
      1,
      `${GROUPWARE_URL}/accounts/e/calendars/personal/events`,
      { signal }
    )
    expect(client.get).toHaveBeenNthCalledWith(
      2,
      `${GROUPWARE_URL}/accounts/e/calendars/team/events`,
      { signal }
    )
  })

  it('deduplicates events that are returned for more than one calendar', async () => {
    const client = {
      get: vi
        .fn()
        .mockResolvedValueOnce({ data: [calendarEvent({ id: 'event-1', calendarIds: null })] })
        .mockResolvedValueOnce({ data: [calendarEvent({ id: 'event-1', calendarIds: null })] })
    }
    const { api, signal } = getApi(client)

    const result = await api.loadAppointments('e', visibleRange, ['personal', 'personal'], signal)

    expect(result).toHaveLength(1)
  })

  it('does not request anything when no calendar is given', async () => {
    const client = { get: vi.fn() }
    const { api, signal } = getApi(client)

    await expect(api.loadAppointments('e', visibleRange, [], signal)).resolves.toEqual([])
    expect(client.get).not.toHaveBeenCalled()
  })

  it('rethrows request errors', async () => {
    const client = { get: vi.fn().mockRejectedValue({ response: { status: 500 } }) }
    const { api, signal } = getApi(client)

    await expect(api.loadAppointments('e', visibleRange, ['personal'], signal)).rejects.toEqual({
      response: { status: 500 }
    })
  })
})

const getApi = (client: { get: unknown }) => {
  return {
    api: createCalendarApi({ client: client as never, groupwareUrl: () => GROUPWARE_URL }),
    signal: new AbortController().signal
  }
}

const calendarEvent = ({
  id = 'event',
  start = '2026-06-25T08:00:00.000Z',
  calendarIds = { c: true } as Record<string, boolean> | null
}) => ({
  id,
  ...(calendarIds ? { calendarIds } : {}),
  title: 'Planning',
  start,
  end: '2026-06-25T09:00:00.000Z'
})
