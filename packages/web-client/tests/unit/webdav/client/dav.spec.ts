import { DAV, DavRequestHeaders } from '../../../../src/webdav/client/dav'
import { DavHttpError } from '../../../../src/errors'
import { DavMethod } from '../../../../src/webdav/constants'

const multiStatus = `<?xml version="1.0" encoding="UTF-8"?>
<d:multistatus xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
  <d:response>
    <d:href>/dav/spaces/1/folder/</d:href>
    <d:propstat>
      <d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>
</d:multistatus>`

describe('DAV', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('request', () => {
    it('sends method, url, body and signal to fetch', async () => {
      const { dav, fetchMock } = getDav()
      const signal = new AbortController().signal

      await dav.put('/some/file.txt', 'content', { signal, overwrite: true })

      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('https://localhost/dav/some/file.txt')
      expect(init.method).toBe(DavMethod.put)
      expect(init.body).toBe('content')
      expect(init.signal).toBe(signal)
    })
    it('encodes the path', async () => {
      const { dav, fetchMock } = getDav()

      await dav.delete('/some/fö lder#1')

      expect(fetchMock.mock.calls[0][0]).toBe('https://localhost/dav/some/f%C3%B6%20lder%231')
    })
    it('merges default, global and request headers case-insensitively', async () => {
      const { dav, fetchMock } = getDav({
        headers: () => ({ Authorization: 'Bearer token', 'content-type': 'text/plain' })
      })

      await dav.delete('/some/path', { headers: { 'x-request-id': 'my-id' } })

      const headers: Headers = fetchMock.mock.calls[0][1].headers
      expect(headers.get('Authorization')).toBe('Bearer token')
      expect(headers.get('Content-Type')).toBe('text/plain')
      expect(headers.get('X-Requested-With')).toBe('XMLHttpRequest')
      expect(headers.get('X-Request-ID')).toBe('my-id')
    })
    it('sends a fresh X-Request-ID per request', async () => {
      const { dav, fetchMock } = getDav()

      await dav.delete('/a')
      await dav.delete('/b')

      const [first, second] = fetchMock.mock.calls.map(([, init]) =>
        (init.headers as Headers).get('X-Request-ID')
      )
      expect(first).toBeTruthy()
      expect(first).not.toBe(second)
    })
    it('sends Destination and overwrite headers on copy and move', async () => {
      const { dav, fetchMock } = getDav()

      await dav.copy('/a', '/b c', { overwrite: true })
      await dav.move('/a', '/b')

      const [copyHeaders, moveHeaders] = fetchMock.mock.calls.map(
        ([, init]) => init.headers as Headers
      )
      expect(copyHeaders.get('Destination')).toBe('https://localhost/dav/b%20c')
      expect(copyHeaders.get('Overwrite')).toBe('T')
      expect(moveHeaders.get('Overwrite')).toBe('F')
    })
    it('parses a multistatus response', async () => {
      const { dav } = getDav({ response: new Response(multiStatus, { status: 207 }) })

      const body = await dav.propfind('/spaces/1/folder')

      expect(body).toHaveLength(1)
      expect(body[0]).toMatchObject({ filename: '/spaces/1/folder', type: 'directory' })
    })
    it('returns no body for other success responses', async () => {
      const { dav } = getDav()

      const result = await dav.mkcol('/folder')

      expect(result.status).toBe(201)
      expect(result.body).toBeUndefined()
    })
  })
  describe('withCredentials', () => {
    it.each([
      [true, 'include'],
      [false, undefined]
    ])('callback returning %s sets credentials to %s', async (value, expected) => {
      const { dav, fetchMock } = getDav({ withCredentials: () => value })

      await dav.delete('/some/path')

      expect(fetchMock.mock.calls[0][1].credentials).toBe(expected)
    })
    it('is not passed to requests without a callback', async () => {
      const { dav, fetchMock } = getDav()

      await dav.delete('/some/path')

      expect(fetchMock.mock.calls[0][1].credentials).toBeUndefined()
    })
  })
  describe('request errors', () => {
    it('rethrows network errors as they are', async () => {
      const networkError = new TypeError('Failed to fetch')
      const { dav, fetchMock } = getDav()
      fetchMock.mockRejectedValue(networkError)

      await expect(dav.delete('/some/path')).rejects.toBe(networkError)
    })
    it('throws a DavHttpError with the details from the response body', async () => {
      const response = new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<d:error xmlns:d="DAV" xmlns:s="http://sabredav.org/ns">
  <s:message>No such file</s:message>
  <s:errorcode>ERR_FILE_NOT_FOUND_IN_ROOT</s:errorcode>
</d:error>`,
        { status: 404 }
      )
      const { dav } = getDav({ response })

      const error = await dav.delete('/some/path').catch((e) => e)

      expect(error).toBeInstanceOf(DavHttpError)
      expect(error.message).toBe('No such file')
      expect(error.errorCode).toBe('ERR_FILE_NOT_FOUND_IN_ROOT')
      expect(error.statusCode).toBe(404)
      expect(error.response).toBe(response)
    })
  })
})

function getDav({
  withCredentials,
  headers,
  response
}: {
  withCredentials?: () => boolean
  headers?: () => DavRequestHeaders
  response?: Response
} = {}) {
  const fetchMock = vi
    .fn()
    .mockImplementation(() => Promise.resolve(response ?? new Response(null, { status: 201 })))
  vi.stubGlobal('fetch', fetchMock)
  const dav = new DAV({ baseUrl: 'https://localhost', headers, withCredentials })
  return { dav, fetchMock }
}
