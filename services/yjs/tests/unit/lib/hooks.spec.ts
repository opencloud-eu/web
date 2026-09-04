import type { MockInstance } from 'vitest'
import { createHooks, HEALTH_ENDPOINT_PATH, SEED_CAPABLE_KEY } from '../../../src/lib/hooks.ts'
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

    expect(states.get(1)).toEqual({ user: canonical, cursor: 1, [SEED_CAPABLE_KEY]: true })
    expect(states.get(2)).toEqual({ user: canonical, [SEED_CAPABLE_KEY]: true })
  })

  it('marks a read-only connection as not seed capable', async () => {
    const states = new Map<number, Record<string, any>>([[1, { [SEED_CAPABLE_KEY]: true }]])

    await getHooks().beforeHandleAwareness({ states, context: { readOnly: true, user } })

    expect(states.get(1)![SEED_CAPABLE_KEY]).toBe(false)
  })

  it('falls back to the connection context', async () => {
    const states = new Map<number, Record<string, any>>([[1, {}]])

    await getHooks().beforeHandleAwareness({
      states,
      context: undefined,
      connection: { context: { readOnly: true, user } }
    })

    expect(states.get(1)).toEqual({ user: canonical, [SEED_CAPABLE_KEY]: false })
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
    await getHooks().onDisconnect({ documentName: 'doc', clientsCount: 2 })

    expect(logSpy).toHaveBeenCalledWith('[onDisconnect] document="doc" remaining=2')
  })
})
