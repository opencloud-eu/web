import { parseError, parseMultiStatus } from '../../../../src/webdav/client/parsers'

function buildMultiStatus(props: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<d:multistatus xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
  <d:response>
    <d:href>/dav/spaces/1/file.txt</d:href>
    <d:propstat>
      <d:prop>${props}</d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>
</d:multistatus>`
}

describe('parseMultiStatus', () => {
  it('decodes numeric and named XML entities', () => {
    const [result] = parseMultiStatus(
      buildMultiStatus('<oc:name>new-&#39;single&#39;quotes&amp;.txt</oc:name>')
    )

    expect(result.props.name).toBe("new-'single'quotes&.txt")
  })

  it('does not parse the displayname as number', () => {
    const [result] = parseMultiStatus(buildMultiStatus('<d:displayname>2024.10</d:displayname>'))

    expect(result.props.displayname).toBe('2024.10')
  })

  it('builds a file resource', () => {
    const [result] = parseMultiStatus(
      buildMultiStatus(`
        <d:getlastmodified>Mon, 01 Jan 2024 00:00:00 GMT</d:getlastmodified>
        <d:getcontentlength>1234</d:getcontentlength>
        <d:getcontenttype>text/plain; charset=utf-8</d:getcontenttype>
        <d:getetag>"abc123"</d:getetag>
        <d:resourcetype/>`)
    )

    expect(result).toMatchObject({
      filename: '/spaces/1/file.txt',
      basename: 'file.txt',
      lastmod: 'Mon, 01 Jan 2024 00:00:00 GMT',
      size: 1234,
      type: 'file',
      etag: 'abc123',
      mime: 'text/plain',
      processing: false
    })
  })

  it('builds a folder resource with nested props', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<d:multistatus xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
  <d:response>
    <d:href>/dav/spaces/1/my%20folder/</d:href>
    <d:propstat>
      <d:prop>
        <d:resourcetype><d:collection/></d:resourcetype>
        <oc:share-types><oc:share-type>0</oc:share-type><oc:share-type>3</oc:share-type></oc:share-types>
        <oc:tags>a,b</oc:tags>
        <oc:audio><oc:album>Best of</oc:album><oc:track>4</oc:track></oc:audio>
      </d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
    <d:propstat>
      <d:prop><oc:missing/></d:prop>
      <d:status>HTTP/1.1 404 Not Found</d:status>
    </d:propstat>
  </d:response>
</d:multistatus>`

    const [result] = parseMultiStatus(xml)

    expect(result.filename).toBe('/spaces/1/my folder')
    expect(result.basename).toBe('my folder')
    expect(result.type).toBe('directory')
    expect(result.mime).toBeUndefined()
    expect(result.props['share-types']).toEqual({ 'share-type': [0, 3] })
    expect(result.props.audio).toEqual({ album: 'Best of', track: 4 })
    expect(result.props).not.toHaveProperty('missing')
  })

  it('returns all responses', () => {
    const response = (href: string) =>
      `<d:response><d:href>${href}</d:href><d:propstat><d:prop/><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>`
    const xml = `<d:multistatus xmlns:d="DAV:">${response('/dav/a')}${response('/dav/b')}</d:multistatus>`

    const result = parseMultiStatus(xml)

    expect(result.map(({ filename }) => filename)).toEqual(['/a', '/b'])
  })

  it('flags resources that are still processing', () => {
    const xml = `<d:multistatus xmlns:d="DAV:"><d:response><d:href>/dav/a</d:href><d:propstat><d:prop/><d:status>HTTP/1.1 425 TOO EARLY</d:status></d:propstat></d:response></d:multistatus>`

    const [result] = parseMultiStatus(xml)

    expect(result.processing).toBe(true)
  })

  it('returns an empty list for an empty multistatus', () => {
    expect(parseMultiStatus('<d:multistatus xmlns:d="DAV:"></d:multistatus>')).toEqual([])
  })

  it('throws without a multistatus root', () => {
    expect(() => parseMultiStatus('<d:error xmlns:d="DAV:"/>')).toThrow()
  })
})

describe('parseError', () => {
  it('extracts message and error code', () => {
    const result = parseError(`<?xml version="1.0" encoding="UTF-8"?>
<d:error xmlns:d="DAV" xmlns:s="http://sabredav.org/ns">
  <s:message>No such file</s:message>
  <s:errorcode>ERR_FILE_NOT_FOUND_IN_ROOT</s:errorcode>
</d:error>`)

    expect(result).toEqual({
      message: 'No such file',
      errorCode: 'ERR_FILE_NOT_FOUND_IN_ROOT',
      errorType: undefined
    })
  })

  it('extracts the error type of an expired guest session', () => {
    const result = parseError(`<?xml version="1.0" encoding="UTF-8"?>
<d:error xmlns:d="DAV" xmlns:s="http://sabredav.org/ns">
  <s:Exception>Sabre\\DAV\\Exception\\NotAuthenticated</s:Exception>
  <s:Message>Guest session has expired.</s:Message>
  <opencloud:details xmlns:opencloud="http://opencloud.org/ns">
    <opencloud:error_type>session_expired</opencloud:error_type>
    <opencloud:share_id>permission-id</opencloud:share_id>
  </opencloud:details>
</d:error>`)

    expect(result.errorType).toEqual('session_expired')
  })
})
