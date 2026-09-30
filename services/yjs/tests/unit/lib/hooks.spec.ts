import type { MockInstance } from 'vitest'
import { createHooks, HEALTH_ENDPOINT_PATH } from '../../../src/lib/hooks.ts'
import { GrantMessage } from '../../../src/lib/grants.ts'
import { DeniedReason, refuse } from '../../../src/lib/errors.ts'
import * as graph from '../../../src/lib/graph.ts'

vi.mock('../../../src/lib/graph.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/lib/graph.ts')>()),
  validateTokenAgainstOpenCloud: vi.fn(),
  probeFileAccess: vi.fn()
}))

const OC_URL = 'https://cloud.example.com'

function getHooks(lifecycle: { isReady?: boolean; isShuttingDown?: boolean } = {}) {
  return createHooks({
    opencloudUrl: OC_URL,
    lifecycle: {
      isReady: () => lifecycle.isReady ?? true,
      isShuttingDown: () => lifecycle.isShuttingDown ?? false
    }
  })
}

function getResponse() {
  return { writeHead: vi.fn(), end: vi.fn() }
}

type FakeConnection = {
  socketId: string
  readOnly: boolean
  sendStateless: ReturnType<typeof vi.fn>
}

function connection(socketId: string, readOnly = false): FakeConnection {
  return { socketId, readOnly, sendStateless: vi.fn() }
}

// Spelled out: every client version seeds with these.
const SEED_REQUEST = '_oc_seed_request'
const SEED_GRANTED = '_oc_seed_granted'
const SEED_DENIED = '_oc_seed_denied'

function statelessPayload(
  conn: FakeConnection,
  documentName = 'doc',
  payload: string = SEED_REQUEST
) {
  return { connection: conn, documentName, payload } as any
}

function disconnectPayload({
  documentName = 'doc',
  clientsCount = 0,
  socketId = 'a',
  remaining = [] as FakeConnection[]
} = {}) {
  return {
    documentName,
    clientsCount,
    socketId,
    document: { getConnections: () => remaining }
  } as any
}

let logSpy: MockInstance<typeof console.log>

beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('onRequest', () => {
  it('answers 200 when the server is ready', async () => {
    const response = getResponse()

    await expect(
      getHooks().onRequest({ request: { url: HEALTH_ENDPOINT_PATH }, response })
    ).rejects.toBeUndefined()

    expect(response.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'text/plain' })
    expect(response.end).toHaveBeenCalledWith('ok')
  })

  it('ignores the query string on the readiness path', async () => {
    const response = getResponse()

    await expect(
      getHooks().onRequest({ request: { url: `${HEALTH_ENDPOINT_PATH}?foo=bar` }, response })
    ).rejects.toBeUndefined()

    expect(response.writeHead).toHaveBeenCalledWith(200, expect.anything())
  })

  it.each([
    ['not ready yet', { isReady: false }],
    ['shutting down', { isShuttingDown: true }]
  ])('answers 503 when %s', async (_name, lifecycle) => {
    const response = getResponse()

    await expect(
      getHooks(lifecycle).onRequest({ request: { url: HEALTH_ENDPOINT_PATH }, response })
    ).rejects.toBeUndefined()

    expect(response.writeHead).toHaveBeenCalledWith(503, { 'Content-Type': 'text/plain' })
    expect(response.end).toHaveBeenCalledWith('shutting down')
  })

  it.each([['/other'], [undefined]])('falls through for url %s', async (url) => {
    const response = getResponse()

    await expect(getHooks().onRequest({ request: { url }, response })).resolves.toBeUndefined()

    expect(response.writeHead).not.toHaveBeenCalled()
  })
})

describe('onUpgrade', () => {
  it('accepts the upgrade while running', async () => {
    const socket = { destroy: vi.fn() }

    await expect(getHooks().onUpgrade({ socket })).resolves.toBeUndefined()

    expect(socket.destroy).not.toHaveBeenCalled()
  })

  it('destroys the socket while shutting down', async () => {
    const socket = { destroy: vi.fn() }

    await expect(getHooks({ isShuttingDown: true }).onUpgrade({ socket })).rejects.toBeUndefined()

    expect(socket.destroy).toHaveBeenCalled()
  })
})

describe('onAuthenticate', () => {
  const documentName = 'text-editor::storage$space!opaque:7.4.0'

  function stubGraph(user: graph.GraphUser, access: graph.FileAccess) {
    vi.mocked(graph.validateTokenAgainstOpenCloud).mockResolvedValue(user)
    vi.mocked(graph.probeFileAccess).mockResolvedValue(access)
  }

  it('rejects a missing token without calling graph', async () => {
    stubGraph({ id: 'user-1' }, { canWrite: true })

    await expect(
      getHooks().onAuthenticate({ token: '', documentName, connectionConfig: { readOnly: false } })
    ).rejects.toThrow(expect.objectContaining({ reason: DeniedReason.TokenInvalid }))
    expect(graph.validateTokenAgainstOpenCloud).not.toHaveBeenCalled()
  })

  it('rejects an over-long document name without calling graph', async () => {
    stubGraph({ id: 'user-1' }, { canWrite: true })
    const longName = `storage$space!${'x'.repeat(graph.MAX_DOCUMENT_NAME_LENGTH)}`

    await expect(
      getHooks().onAuthenticate({
        token: 'my-token',
        documentName: longName,
        connectionConfig: { readOnly: false }
      })
    ).rejects.toThrow(
      expect.objectContaining({
        reason: DeniedReason.MalformedDocument,
        message: expect.stringContaining(`documentName too long (${longName.length})`)
      })
    )
    expect(graph.validateTokenAgainstOpenCloud).not.toHaveBeenCalled()
  })

  it('accepts a document name at the length limit', async () => {
    stubGraph({ id: 'user-1' }, { canWrite: true })
    const name = 'storage$space!'.padEnd(graph.MAX_DOCUMENT_NAME_LENGTH, 'x')

    await expect(
      getHooks().onAuthenticate({
        token: 'my-token',
        documentName: name,
        connectionConfig: { readOnly: false }
      })
    ).resolves.toEqual(expect.objectContaining({ readOnly: false }))
  })

  it('grants write access and passes the token to both graph calls', async () => {
    stubGraph({ id: 'user-1', displayName: 'Alice' }, { canWrite: true })
    const connectionConfig = { readOnly: true }

    const context = await getHooks().onAuthenticate({
      token: 'my-token',
      documentName,
      connectionConfig
    })

    expect(context).toEqual({
      readOnly: false,
      user: { id: 'user-1', displayName: 'Alice', color: expect.stringMatching(/^#[0-9a-f]{6}$/) }
    })
    expect(connectionConfig.readOnly).toBe(false)
    expect(graph.validateTokenAgainstOpenCloud).toHaveBeenCalledWith(OC_URL, 'my-token')
    expect(graph.probeFileAccess).toHaveBeenCalledWith(OC_URL, 'my-token', documentName)
  })

  it('sets readOnly on the connection config when the user cannot write', async () => {
    stubGraph({ id: 'user-1', displayName: 'Alice' }, { canWrite: false })
    const connectionConfig = { readOnly: false }

    const context = await getHooks().onAuthenticate({
      token: 'my-token',
      documentName,
      connectionConfig
    })

    expect(context.readOnly).toBe(true)
    expect(connectionConfig.readOnly).toBe(true)
  })

  it('re-throws a refusal from graph unchanged', async () => {
    const refusal = refuse(DeniedReason.AccessDenied, 'nope')
    vi.mocked(graph.validateTokenAgainstOpenCloud).mockRejectedValue(refusal)

    await expect(
      getHooks().onAuthenticate({
        token: 'my-token',
        documentName,
        connectionConfig: { readOnly: false }
      })
    ).rejects.toBe(refusal)
  })

  it('wraps an unexpected graph failure as a server error', async () => {
    vi.mocked(graph.validateTokenAgainstOpenCloud).mockRejectedValue(new Error('graph is down'))

    await expect(
      getHooks().onAuthenticate({
        token: 'my-token',
        documentName,
        connectionConfig: { readOnly: false }
      })
    ).rejects.toThrow(
      expect.objectContaining({
        reason: DeniedReason.ServerError,
        message: expect.stringContaining('graph is down')
      })
    )
  })

  it('wraps a non-Error rejection as a server error', async () => {
    vi.mocked(graph.validateTokenAgainstOpenCloud).mockRejectedValue('boom')

    await expect(
      getHooks().onAuthenticate({
        token: 'my-token',
        documentName,
        connectionConfig: { readOnly: false }
      })
    ).rejects.toThrow(
      expect.objectContaining({
        reason: DeniedReason.ServerError,
        message: expect.stringContaining('boom')
      })
    )
  })

  it.each([
    [{ id: 'user-1', userPrincipalName: 'alice@example.com' }, 'user-1'],
    [{ userPrincipalName: 'alice@example.com' }, 'alice@example.com'],
    [{ mail: 'alice@example.com' }, 'alice@example.com'],
    [{}, 'unknown']
  ])('falls back to %o for the user id', async (user, expectedId) => {
    stubGraph(user, { canWrite: true })

    const context = await getHooks().onAuthenticate({
      token: 'my-token',
      documentName,
      connectionConfig: { readOnly: false }
    })

    expect(context.user.id).toBe(expectedId)
  })

  it.each([
    [{ id: 'user-1', displayName: 'Alice', userPrincipalName: 'a@example.com' }, 'Alice'],
    [{ id: 'user-1', userPrincipalName: 'a@example.com' }, 'a@example.com'],
    [{ id: 'user-1' }, 'user-1']
  ])('falls back to %o for the display name', async (user, expectedName) => {
    stubGraph(user, { canWrite: true })

    const context = await getHooks().onAuthenticate({
      token: 'my-token',
      documentName,
      connectionConfig: { readOnly: false }
    })

    expect(context.user.displayName).toBe(expectedName)
  })

  it('derives the color from the id, not the display name', async () => {
    stubGraph({ id: 'user-1', displayName: 'Alice' }, { canWrite: true })
    const first = await getHooks().onAuthenticate({
      token: 'my-token',
      documentName,
      connectionConfig: { readOnly: false }
    })

    stubGraph({ id: 'user-1', displayName: 'Bob' }, { canWrite: true })
    const second = await getHooks().onAuthenticate({
      token: 'my-token',
      documentName,
      connectionConfig: { readOnly: false }
    })

    expect(first.user.color).toBe(second.user.color)
  })
})

describe('beforeHandleAwareness', () => {
  const user = { id: 'user-1', displayName: 'Alice', color: '#abcdef' }
  const canonical = { id: 'user-1', name: 'Alice', color: '#abcdef' }

  it('overwrites a spoofed user on every state', async () => {
    const states = new Map<number, Record<string, any>>([
      [1, { user: { id: 'admin', name: 'Admin', color: '#000000' }, cursor: 1 }],
      [2, { user: undefined }]
    ])

    await getHooks().beforeHandleAwareness({ states, context: { readOnly: false, user } })

    expect(states.get(1)).toEqual({ user: canonical, cursor: 1 })
    expect(states.get(2)).toEqual({ user: canonical })
  })

  it('falls back to the connection context', async () => {
    const states = new Map<number, Record<string, any>>([[1, {}]])

    await getHooks().beforeHandleAwareness({
      states,
      context: undefined,
      connection: { context: { readOnly: true, user } }
    })

    expect(states.get(1)).toEqual({ user: canonical })
  })

  it('leaves the states untouched when no user is known', async () => {
    const states = new Map<number, Record<string, any>>([[1, { user: { id: 'admin' } }]])

    await getHooks().beforeHandleAwareness({ states, context: undefined })

    expect(states.get(1)).toEqual({ user: { id: 'admin' } })
  })

  it('handles an empty state map', async () => {
    const states = new Map<number, Record<string, any>>()

    await expect(
      getHooks().beforeHandleAwareness({ states, context: { readOnly: false, user } })
    ).resolves.toBeUndefined()
  })
})

describe('connected', () => {
  it('sends the connection its own identity', async () => {
    const conn = connection('a')
    const user = { id: 'u1', displayName: 'Alice', color: '#123456' }

    await getHooks().connected({ connection: conn, context: { readOnly: false, user } } as any)

    expect(conn.sendStateless).toHaveBeenCalledWith(
      '_oc_identity:{"id":"u1","name":"Alice","color":"#123456"}'
    )
  })

  it('falls back to the connection context', async () => {
    const user = { id: 'u1', displayName: 'Alice', color: '#123456' }
    const conn = { ...connection('a'), context: { readOnly: false, user } }

    await getHooks().connected({ connection: conn, context: undefined } as any)

    expect(conn.sendStateless).toHaveBeenCalledOnce()
  })

  it('sends nothing when no user is known', async () => {
    const conn = connection('a')

    await getHooks().connected({ connection: conn, context: {} } as any)

    expect(conn.sendStateless).not.toHaveBeenCalled()
  })
})

describe('logging hooks', () => {
  it('logs the origin on connect', async () => {
    await getHooks().onConnect({
      documentName: 'doc',
      requestHeaders: new Headers({ origin: 'https://cloud.example.com' })
    })

    expect(logSpy).toHaveBeenCalledWith(
      '[onConnect] document="doc" origin=https://cloud.example.com'
    )
  })

  it('logs a placeholder when the origin header is missing', async () => {
    await getHooks().onConnect({ documentName: 'doc', requestHeaders: new Headers() })

    expect(logSpy).toHaveBeenCalledWith('[onConnect] document="doc" origin=-')
  })

  it('logs the remaining client count on disconnect', async () => {
    await getHooks().onDisconnect(
      disconnectPayload({ documentName: 'doc', clientsCount: 2, socketId: 'other' })
    )

    expect(logSpy).toHaveBeenCalledWith('[onDisconnect] document="doc" remaining=2')
  })
})

// The server arbitrates who seeds an empty room, because peers cannot agree
// on it among themselves - Yjs never echoes an update back to its sender.
describe('seeding arbitration', () => {
  it('grants the first writer and denies the next', async () => {
    const hooks = getHooks()
    const first = connection('a')
    const second = connection('b')

    await hooks.onStateless(statelessPayload(first))
    await hooks.onStateless(statelessPayload(second))

    expect(first.sendStateless).toHaveBeenCalledWith(SEED_GRANTED)
    expect(second.sendStateless).toHaveBeenCalledWith(SEED_DENIED)
  })

  // The server rejects their writes, so a read-only grantee would leave the
  // room empty for everyone.
  it('denies a read-only connection', async () => {
    const conn = connection('a', true)

    await getHooks().onStateless(statelessPayload(conn))

    expect(conn.sendStateless).toHaveBeenCalledWith(SEED_DENIED)
  })

  it('answers the holder again with a grant', async () => {
    const hooks = getHooks()
    const conn = connection('a')

    await hooks.onStateless(statelessPayload(conn))
    await hooks.onStateless(statelessPayload(conn))

    expect(conn.sendStateless).toHaveBeenNthCalledWith(2, SEED_GRANTED)
  })

  it('grants each room separately', async () => {
    const hooks = getHooks()
    const first = connection('a')
    const second = connection('b')

    await hooks.onStateless(statelessPayload(first, 'doc-1'))
    await hooks.onStateless(statelessPayload(second, 'doc-2'))

    expect(first.sendStateless).toHaveBeenCalledWith(SEED_GRANTED)
    expect(second.sendStateless).toHaveBeenCalledWith(SEED_GRANTED)
  })

  it('ignores an unrelated stateless payload', async () => {
    const conn = connection('a')

    await getHooks().onStateless(statelessPayload(conn, 'doc', 'something-else'))

    expect(conn.sendStateless).not.toHaveBeenCalled()
  })

  // The holder may have left before seeding, and nobody else is allowed to.
  it('passes the grant on when the holder leaves', async () => {
    const hooks = getHooks()
    const holder = connection('a')
    const peer = connection('b')

    await hooks.onStateless(statelessPayload(holder))
    await hooks.onDisconnect(disconnectPayload({ socketId: 'a', remaining: [peer] }))

    expect(peer.sendStateless).toHaveBeenCalledWith(SEED_GRANTED)
  })

  it('skips read-only peers when passing the grant on', async () => {
    const hooks = getHooks()
    const holder = connection('a')
    const viewer = connection('b', true)
    const writer = connection('c')

    await hooks.onStateless(statelessPayload(holder))
    await hooks.onDisconnect(disconnectPayload({ socketId: 'a', remaining: [viewer, writer] }))

    expect(viewer.sendStateless).not.toHaveBeenCalled()
    expect(writer.sendStateless).toHaveBeenCalledWith(SEED_GRANTED)
  })

  it('passes the grant on to exactly one writer', async () => {
    const hooks = getHooks()
    const holder = connection('a')
    const first = connection('b')
    const second = connection('c')

    await hooks.onStateless(statelessPayload(holder))
    await hooks.onDisconnect(disconnectPayload({ socketId: 'a', remaining: [first, second] }))

    expect(first.sendStateless).toHaveBeenCalledWith(SEED_GRANTED)
    expect(second.sendStateless).not.toHaveBeenCalled()
    // The new holder is on record: a later request from the other writer is refused.
    await hooks.onStateless(statelessPayload(second))
    expect(second.sendStateless).toHaveBeenCalledWith(SEED_DENIED)
  })

  it('keeps the grant when someone other than the holder leaves', async () => {
    const hooks = getHooks()
    const holder = connection('a')
    const peer = connection('b')

    await hooks.onStateless(statelessPayload(holder))
    await hooks.onDisconnect(disconnectPayload({ socketId: 'b', remaining: [peer] }))

    expect(peer.sendStateless).not.toHaveBeenCalled()
  })

  it('grants again once the room is gone', async () => {
    const hooks = getHooks()
    const first = connection('a')
    const second = connection('b')

    await hooks.onStateless(statelessPayload(first))
    await hooks.afterUnloadDocument({ documentName: 'doc' } as any)
    await hooks.onStateless(statelessPayload(second))

    expect(second.sendStateless).toHaveBeenCalledWith(SEED_GRANTED)
  })

  it('answers a seed request in the format it was asked in', async () => {
    const hooks = getHooks()
    const first = connection('a')
    const second = connection('b')

    await hooks.onStateless(statelessPayload(first, 'doc', GrantMessage.Request + 'seed'))
    await hooks.onStateless(statelessPayload(second))

    expect(first.sendStateless).toHaveBeenCalledWith(GrantMessage.Granted + 'seed')
    expect(second.sendStateless).toHaveBeenCalledWith(SEED_DENIED)
  })

  it('denies a seed request in the format it was asked in', async () => {
    const hooks = getHooks()
    const first = connection('a')
    const second = connection('b')

    await hooks.onStateless(statelessPayload(first))
    await hooks.onStateless(statelessPayload(second, 'doc', GrantMessage.Request + 'seed'))

    expect(second.sendStateless).toHaveBeenCalledWith(GrantMessage.Denied + 'seed')
  })

  // The next writer may never have asked, so it may only know the old format.
  it('passes a grant asked for in the new format on in the old one', async () => {
    const hooks = getHooks()
    const holder = connection('a')
    const peer = connection('b')

    await hooks.onStateless(statelessPayload(holder, 'doc', GrantMessage.Request + 'seed'))
    await hooks.onDisconnect(disconnectPayload({ socketId: 'a', remaining: [peer] }))

    expect(peer.sendStateless).toHaveBeenCalledWith(SEED_GRANTED)
  })

  it.each(['', 'other', 'seed:x', 'recover', 'recover:', 'recover:' + 'x'.repeat(257)])(
    'ignores a request for an unknown key or a malformed argument',
    async (key) => {
      const conn = connection('a')

      await getHooks().onStateless(statelessPayload(conn, 'doc', GrantMessage.Request + key))

      expect(conn.sendStateless).not.toHaveBeenCalled()
    }
  )
})

// Every clean writer hears about an external write and asks to rewrite the
// room from the body it fetched. One at a time may, or the body lands twice.
describe('recovery arbitration', () => {
  const RECOVER = 'recover:etag-1'
  const NEWER = 'recover:etag-2'

  function request(conn: FakeConnection, key = RECOVER) {
    return statelessPayload(conn, 'doc', GrantMessage.Request + key)
  }

  function release(conn: FakeConnection, key = RECOVER) {
    return statelessPayload(conn, 'doc', GrantMessage.Release + key)
  }

  // The server's replica after a peer's update, with the etag it stamped.
  function change(etag?: string) {
    return {
      documentName: 'doc',
      document: { getMap: () => new Map(etag ? [['etag', etag]] : []) }
    } as any
  }

  it('grants the first writer and denies the next', async () => {
    const hooks = getHooks()
    const first = connection('a')
    const second = connection('b')

    await hooks.onStateless(request(first))
    await hooks.onStateless(request(second))

    expect(first.sendStateless).toHaveBeenCalledWith(GrantMessage.Granted + RECOVER)
    expect(second.sendStateless).toHaveBeenCalledWith(GrantMessage.Denied + RECOVER)
  })

  // Two back-to-back writes: both rewrites would merge into one doc.
  it('denies a writer asking for another etag while the grant is held', async () => {
    const hooks = getHooks()
    const second = connection('b')

    await hooks.onStateless(request(connection('a')))
    await hooks.onStateless(request(second, NEWER))

    expect(second.sendStateless).toHaveBeenCalledWith(GrantMessage.Denied + NEWER)
  })

  it('denies a read-only connection', async () => {
    const conn = connection('a', true)

    await getHooks().onStateless(request(conn))

    expect(conn.sendStateless).toHaveBeenCalledWith(GrantMessage.Denied + RECOVER)
  })

  it('frees the grant once the room holds the granted etag', async () => {
    const hooks = getHooks()
    const next = connection('b')

    await hooks.onStateless(request(connection('a')))
    await hooks.onChange(change('etag-0'))
    await hooks.onStateless(request(next, NEWER))
    expect(next.sendStateless).toHaveBeenLastCalledWith(GrantMessage.Denied + NEWER)

    await hooks.onChange(change('etag-1'))
    await hooks.onStateless(request(next, NEWER))
    expect(next.sendStateless).toHaveBeenLastCalledWith(GrantMessage.Granted + NEWER)
  })

  // The commit that freed the grant may still sit in the room's batch.
  it('sends the room its pending updates before a grant', async () => {
    const hooks = getHooks()
    const calls: string[] = []
    const conn = {
      ...connection('a'),
      document: { flush: vi.fn(() => calls.push('flush')) }
    }
    conn.sendStateless.mockImplementation((payload: string) => calls.push(payload))

    await hooks.onStateless(request(conn))

    expect(calls).toEqual(['flush', GrantMessage.Granted + RECOVER])
  })

  it('frees the grant when the holder releases it', async () => {
    const hooks = getHooks()
    const holder = connection('a')
    const next = connection('b')

    await hooks.onStateless(request(holder))
    await hooks.onStateless(release(holder))
    await hooks.onStateless(request(next, NEWER))

    expect(next.sendStateless).toHaveBeenCalledWith(GrantMessage.Granted + NEWER)
  })

  it('ignores a release from anyone but the holder, or for another etag', async () => {
    const hooks = getHooks()
    const holder = connection('a')
    const next = connection('b')

    await hooks.onStateless(request(holder))
    await hooks.onStateless(release(next))
    await hooks.onStateless(release(holder, NEWER))
    await hooks.onStateless(request(next, NEWER))

    expect(next.sendStateless).toHaveBeenCalledWith(GrantMessage.Denied + NEWER)
  })

  // A holder that neither rewrites nor leaves must not block the room forever.
  it('frees the grant when the lease runs out', async () => {
    vi.useFakeTimers()
    try {
      const hooks = getHooks()
      const next = connection('b')

      await hooks.onStateless(request(connection('a')))
      vi.advanceTimersByTime(30_000)
      await hooks.onStateless(request(next, NEWER))

      expect(next.sendStateless).toHaveBeenCalledWith(GrantMessage.Granted + NEWER)
    } finally {
      vi.useRealTimers()
    }
  })

  // Only the requester holds the body to recover from, so a grant handed to
  // anyone else would be one they cannot use.
  it('does not pass the grant on when the holder leaves, but grants the next request', async () => {
    const hooks = getHooks()
    const peer = connection('b')

    await hooks.onStateless(request(connection('a')))
    await hooks.onDisconnect(disconnectPayload({ socketId: 'a', remaining: [peer] }))
    expect(peer.sendStateless).not.toHaveBeenCalled()

    await hooks.onStateless(request(peer))
    expect(peer.sendStateless).toHaveBeenCalledWith(GrantMessage.Granted + RECOVER)
  })

  it('lets the holder switch to a newer etag', async () => {
    const hooks = getHooks()
    const holder = connection('a')
    const peer = connection('b')

    await hooks.onStateless(request(holder))
    await hooks.onStateless(request(holder, NEWER))
    await hooks.onStateless(request(peer))

    expect(holder.sendStateless).toHaveBeenLastCalledWith(GrantMessage.Granted + NEWER)
    expect(peer.sendStateless).toHaveBeenCalledWith(GrantMessage.Denied + RECOVER)
  })

  it('grants seeding and recovery separately', async () => {
    const hooks = getHooks()
    const seeder = connection('a')
    const recoverer = connection('b')

    await hooks.onStateless(statelessPayload(seeder))
    await hooks.onStateless(request(recoverer))

    expect(seeder.sendStateless).toHaveBeenCalledWith(SEED_GRANTED)
    expect(recoverer.sendStateless).toHaveBeenCalledWith(GrantMessage.Granted + RECOVER)
  })

  it('passes only the seed grant on when the holder leaves with both', async () => {
    const hooks = getHooks()
    const holder = connection('a')
    const peer = connection('b')

    await hooks.onStateless(statelessPayload(holder))
    await hooks.onStateless(request(holder))
    await hooks.onDisconnect(disconnectPayload({ socketId: 'a', remaining: [peer] }))

    expect(peer.sendStateless).toHaveBeenCalledOnce()
    expect(peer.sendStateless).toHaveBeenCalledWith(SEED_GRANTED)
  })
})
