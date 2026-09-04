import {
  checkReadinessEndpoint,
  checkWebSocketEndpoint,
  READY_PATH,
  TIMEOUT_MS
} from '../../../src/lib/healthcheck.ts'

const PORT = 1234

type Listener = () => void

/** Minimal WebSocket double: the events are driven by the test. */
class FakeWebSocket {
  static instances: FakeWebSocket[] = []
  public url: string
  public close = vi.fn()
  private listeners = new Map<string, Set<Listener>>()

  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
  }

  addEventListener(type: string, listener: Listener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(listener)
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener)
  }

  emit(type: string): void {
    this.listeners.get(type)?.forEach((listener) => listener())
  }

  listenerCount(): number {
    return [...this.listeners.values()].reduce((sum, set) => sum + set.size, 0)
  }
}

function stubWebSocket(): typeof FakeWebSocket {
  FakeWebSocket.instances = []
  vi.stubGlobal('WebSocket', FakeWebSocket)
  return FakeWebSocket
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('checkReadinessEndpoint', () => {
  it('resolves on a successful readiness response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    await expect(checkReadinessEndpoint(PORT)).resolves.toBeUndefined()

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`http://127.0.0.1:${PORT}${READY_PATH}`)
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('throws on a non-ok readiness response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))

    await expect(checkReadinessEndpoint(PORT)).rejects.toThrow('readiness endpoint returned 503')
  })

  it('propagates a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))

    await expect(checkReadinessEndpoint(PORT)).rejects.toThrow('ECONNREFUSED')
  })
})

describe('checkWebSocketEndpoint', () => {
  it('resolves and closes the socket on open', async () => {
    const sockets = stubWebSocket()

    const pending = checkWebSocketEndpoint(PORT)
    const socket = sockets.instances[0]
    expect(socket.url).toBe(`ws://127.0.0.1:${PORT}`)

    socket.emit('open')
    await expect(pending).resolves.toBeUndefined()

    expect(socket.close).toHaveBeenCalledWith(1000, 'healthcheck')
    expect(socket.listenerCount()).toBe(0)
  })

  it('rejects on an error event', async () => {
    const sockets = stubWebSocket()

    const pending = checkWebSocketEndpoint(PORT)
    sockets.instances[0].emit('error')

    await expect(pending).rejects.toThrow('websocket endpoint is not reachable')
    expect(sockets.instances[0].listenerCount()).toBe(0)
  })

  it('rejects when the socket closes before it opened', async () => {
    const sockets = stubWebSocket()

    const pending = checkWebSocketEndpoint(PORT)
    sockets.instances[0].emit('close')

    await expect(pending).rejects.toThrow('websocket closed before handshake completed')
  })

  it('ignores the close that follows a successful open', async () => {
    const sockets = stubWebSocket()

    const pending = checkWebSocketEndpoint(PORT)
    sockets.instances[0].emit('open')
    sockets.instances[0].emit('close')

    await expect(pending).resolves.toBeUndefined()
  })

  it('rejects when the handshake times out', async () => {
    vi.useFakeTimers()
    const sockets = stubWebSocket()

    const assertion = expect(checkWebSocketEndpoint(PORT)).rejects.toThrow(
      'websocket handshake timed out'
    )
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS)

    await assertion
    expect(sockets.instances[0].close).toHaveBeenCalled()
  })

  it('does not time out after a successful open', async () => {
    vi.useFakeTimers()
    const sockets = stubWebSocket()

    const pending = checkWebSocketEndpoint(PORT)
    sockets.instances[0].emit('open')
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS * 2)

    await expect(pending).resolves.toBeUndefined()
  })
})
