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
  it('decodes numeric and named XML entities', async () => {
    const [result] = await parseMultiStatus(
      buildMultiStatus('<oc:name>new-&#39;single&#39;quotes&amp;.txt</oc:name>')
    )

    expect(result.props.name).toBe("new-'single'quotes&.txt")
  })

  it('does not parse the displayname as number', async () => {
    const [result] = await parseMultiStatus(
      buildMultiStatus('<d:displayname>2024.10</d:displayname>')
    )

    expect(result.props.displayname).toBe('2024.10')
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
