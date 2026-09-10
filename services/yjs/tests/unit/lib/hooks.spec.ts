import type { MockInstance } from 'vitest'
import { createHooks, HEALTH_ENDPOINT_PATH } from '../../../src/lib/hooks.ts'
import { SeedMessage } from '../../../src/lib/seedGrant.ts'
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

function statelessPayload(
  conn: FakeConnection,
  documentName = 'doc',
  payload: string = SeedMessage.Request
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

    expect(first.sendStateless).toHaveBeenCalledWith(SeedMessage.Granted)
    expect(second.sendStateless).toHaveBeenCalledWith(SeedMessage.Denied)
  })

  // The server rejects their writes, so a read-only grantee would leave the
  // room empty for everyone.
  it('denies a read-only connection', async () => {
    const conn = connection('a', true)

    await getHooks().onStateless(statelessPayload(conn))

    expect(conn.sendStateless).toHaveBeenCalledWith(SeedMessage.Denied)
  })

  it('answers the holder again with a grant', async () => {
    const hooks = getHooks()
    const conn = connection('a')

    await hooks.onStateless(statelessPayload(conn))
    await hooks.onStateless(statelessPayload(conn))

    expect(conn.sendStateless).toHaveBeenNthCalledWith(2, SeedMessage.Granted)
  })

  it('grants each room separately', async () => {
    const hooks = getHooks()
    const first = connection('a')
    const second = connection('b')

    await hooks.onStateless(statelessPayload(first, 'doc-1'))
    await hooks.onStateless(statelessPayload(second, 'doc-2'))

    expect(first.sendStateless).toHaveBeenCalledWith(SeedMessage.Granted)
    expect(second.sendStateless).toHaveBeenCalledWith(SeedMessage.Granted)
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

    expect(peer.sendStateless).toHaveBeenCalledWith(SeedMessage.Granted)
  })

  it('skips read-only peers when passing the grant on', async () => {
    const hooks = getHooks()
    const holder = connection('a')
    const viewer = connection('b', true)
    const writer = connection('c')

    await hooks.onStateless(statelessPayload(holder))
    await hooks.onDisconnect(disconnectPayload({ socketId: 'a', remaining: [viewer, writer] }))

    expect(viewer.sendStateless).not.toHaveBeenCalled()
    expect(writer.sendStateless).toHaveBeenCalledWith(SeedMessage.Granted)
  })

  it('passes the grant on to exactly one writer', async () => {
    const hooks = getHooks()
    const holder = connection('a')
    const first = connection('b')
    const second = connection('c')

    await hooks.onStateless(statelessPayload(holder))
    await hooks.onDisconnect(disconnectPayload({ socketId: 'a', remaining: [first, second] }))

    expect(first.sendStateless).toHaveBeenCalledWith(SeedMessage.Granted)
    expect(second.sendStateless).not.toHaveBeenCalled()
    // The new holder is on record: a later request from the other writer is refused.
    await hooks.onStateless(statelessPayload(second))
    expect(second.sendStateless).toHaveBeenCalledWith(SeedMessage.Denied)
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

    expect(second.sendStateless).toHaveBeenCalledWith(SeedMessage.Granted)
  })
})
