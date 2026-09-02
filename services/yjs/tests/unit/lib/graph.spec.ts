import { DeniedReason } from '../../../src/lib/errors.ts'
import {
  parseDocumentId,
  probeFileAccess,
  validateTokenAgainstOpenCloud,
  WRITE_ACTION
} from '../../../src/lib/graph.ts'

const OC_URL = 'https://cloud.example.com'
const ACTIONS_KEY = '@libre.graph.permissions.actions.allowedValues'

function mockFetch(response: Partial<Response>): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('parseDocumentId', () => {
  it('parses a plain composite file id', () => {
    expect(parseDocumentId('storage$space!opaque')).toEqual({
      driveId: 'storage$space',
      itemId: 'storage$space!opaque'
    })
  })

  it('strips a scope prefix', () => {
    expect(parseDocumentId('text-editor::storage$space!opaque')).toEqual({
      driveId: 'storage$space',
      itemId: 'storage$space!opaque'
    })
  })

  it('strips a version suffix', () => {
    expect(parseDocumentId('storage$space!opaque:7.4.0')).toEqual({
      driveId: 'storage$space',
      itemId: 'storage$space!opaque'
    })
  })

  it('strips both a scope prefix and a version suffix', () => {
    expect(parseDocumentId('text-editor::storage$space!opaque:7.4.0')).toEqual({
      driveId: 'storage$space',
      itemId: 'storage$space!opaque'
    })
  })

  it.each([
    ['no separator', 'storage$space-opaque'],
    ['separator at the start', '!opaque'],
    ['separator at the end', 'storage$space!'],
    ['empty name', ''],
    ['scope prefix only', 'text-editor::']
  ])('throws on %s', (_name, documentName) => {
    expect(() => parseDocumentId(documentName)).toThrow(/is not a file id/)
    expect(() => parseDocumentId(documentName)).toThrow(
      expect.objectContaining({ reason: DeniedReason.MalformedDocument })
    )
  })
})

describe('validateTokenAgainstOpenCloud', () => {
  it('requests the graph me endpoint with a bearer token', async () => {
    const fetchMock = mockFetch({ ok: true, json: () => Promise.resolve({ id: 'user-1' }) } as any)

    await expect(validateTokenAgainstOpenCloud(OC_URL, 'my-token')).resolves.toEqual({
      id: 'user-1'
    })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${OC_URL}/graph/v1.0/me`)
    expect(init.headers).toEqual({ Authorization: 'Bearer my-token' })
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('throws with the status and the response body on a failure', async () => {
    mockFetch({ ok: false, status: 401, text: () => Promise.resolve('unauthorized') } as any)

    await expect(validateTokenAgainstOpenCloud(OC_URL, 'my-token')).rejects.toThrow(
      'graph /me returned 401: unauthorized'
    )
  })

  it('truncates a long response body', async () => {
    mockFetch({ ok: false, status: 500, text: () => Promise.resolve('x'.repeat(500)) } as any)

    await expect(validateTokenAgainstOpenCloud(OC_URL, 'my-token')).rejects.toThrow(
      `graph /me returned 500: ${'x'.repeat(200)}`
    )
  })

  it.each([
    [401, DeniedReason.TokenInvalid],
    [500, DeniedReason.ServerError]
  ])('refuses %s with reason %s', async (status, reason) => {
    mockFetch({ ok: false, status, text: () => Promise.resolve('nope') } as any)

    await expect(validateTokenAgainstOpenCloud(OC_URL, 'my-token')).rejects.toThrow(
      expect.objectContaining({ reason })
    )
  })

  it('throws even when the body cannot be read', async () => {
    mockFetch({ ok: false, status: 502, text: () => Promise.reject(new Error('boom')) } as any)

    await expect(validateTokenAgainstOpenCloud(OC_URL, 'my-token')).rejects.toThrow(
      'graph /me returned 502: '
    )
  })
})

describe('probeFileAccess', () => {
  function permissionsResponse(actions: unknown) {
    return {
      ok: true,
      status: 200,
      json: () => Promise.resolve({ [ACTIONS_KEY]: actions })
    } as any
  }

  it('targets the permissions endpoint with encoded ids and a $select', async () => {
    const fetchMock = mockFetch(permissionsResponse([WRITE_ACTION]))

    await probeFileAccess(OC_URL, 'my-token', 'text-editor::storage$space!opaque:7.4.0')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(
      `${OC_URL}/graph/v1beta1/drives/${encodeURIComponent('storage$space')}` +
        `/items/${encodeURIComponent('storage$space!opaque')}/permissions` +
        `?$select=${encodeURIComponent(ACTIONS_KEY)}`
    )
    expect(init.headers).toEqual({ Authorization: 'Bearer my-token' })
  })

  it('reports write access when the upload action is granted', async () => {
    mockFetch(permissionsResponse(['libre.graph/driveItem/permissions/create', WRITE_ACTION]))

    await expect(probeFileAccess(OC_URL, 'my-token', 'storage$space!opaque')).resolves.toEqual({
      canWrite: true
    })
  })

  it('reports no write access when only sibling actions are granted', async () => {
    mockFetch(
      permissionsResponse([
        'libre.graph/driveItem/permissions/create',
        'libre.graph/driveItem/children/create'
      ])
    )

    await expect(probeFileAccess(OC_URL, 'my-token', 'storage$space!opaque')).resolves.toEqual({
      canWrite: false
    })
  })

  it.each([[undefined], ['not-an-array'], [{}]])(
    'reports no write access when the action set is %s',
    async (actions) => {
      mockFetch(permissionsResponse(actions))

      await expect(probeFileAccess(OC_URL, 'my-token', 'storage$space!opaque')).resolves.toEqual({
        canWrite: false
      })
    }
  )

  it.each([
    [401, DeniedReason.TokenInvalid],
    [403, DeniedReason.AccessDenied],
    [404, DeniedReason.AccessDenied],
    [500, DeniedReason.ServerError],
    [502, DeniedReason.ServerError]
  ])('refuses %s with reason %s', async (status, reason) => {
    mockFetch({ ok: false, status, text: () => Promise.resolve('denied') } as any)

    await expect(probeFileAccess(OC_URL, 'my-token', 'storage$space!opaque')).rejects.toThrow(
      expect.objectContaining({ reason })
    )
  })

  it('includes the status and document name in the refusal message', async () => {
    mockFetch({ ok: false, status: 500, text: () => Promise.resolve('server error') } as any)

    await expect(probeFileAccess(OC_URL, 'my-token', 'storage$space!opaque')).rejects.toThrow(
      'graph permissions returned 500 for document="storage$space!opaque": server error'
    )
  })

  it('throws before calling graph when the document name is malformed', async () => {
    const fetchMock = mockFetch(permissionsResponse([]))

    await expect(probeFileAccess(OC_URL, 'my-token', 'no-separator')).rejects.toThrow(
      /is not a file id/
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
