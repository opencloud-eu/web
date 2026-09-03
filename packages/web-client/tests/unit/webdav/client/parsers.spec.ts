// @ts-expect-error - vite raw import
import recordedResponse from '../../../__fixtures__/propfind-custom-namespaces.xml?raw'
import { buildPropFindBody, parseMultiStatus } from '../../../../src/webdav/client'
import { buildResource } from '../../../../src/helpers/resource'
import { DavProperty } from '../../../../src/webdav/constants'

const PROJECT_NS = 'https://apps.example/project'
const REVIEW_NS = 'https://apps.example/review'

/**
 * A response as the server sends it: standard properties carry a prefix, while
 * properties in a namespace the server has no prefix for are serialised with an
 * inline default xmlns. Both spellings have to end up under the same key.
 */
const multiStatus = (props: string) => `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
  <d:response>
    <d:href>/dav/spaces/1$2/file.txt</d:href>
    <d:propstat>
      <d:prop>
        <oc:fileid>1$2!3</oc:fileid>
        <d:getcontentlength>1234</d:getcontentlength>
        <d:getcontenttype>text/plain</d:getcontenttype>
        <d:getlastmodified>Mon, 01 Sep 2026 10:00:00 GMT</d:getlastmodified>
        <oc:name>2024.10</oc:name>
        ${props}
      </d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>
</d:multistatus>`

describe('parseMultiStatus', () => {
  it('keeps the well-known props addressable by their bare name', async () => {
    const [resource] = await parseMultiStatus(multiStatus(''))

    expect(resource.props[DavProperty.FileId]).toBe('1$2!3')
    expect(resource.props[DavProperty.MimeType]).toBe('text/plain')
    expect(resource.size).toBe(1234)
    expect(resource.type).toBe('file')
    // The displayname parser has to survive passing our own parser context,
    // otherwise a name like this is read as the number 2024.1.
    expect(resource.props[DavProperty.Name]).toBe('2024.10')
  })

  it('keys a custom prop by its namespace', async () => {
    const [resource] = await parseMultiStatus(
      multiStatus(`<color xmlns="${PROJECT_NS}">red</color>`)
    )

    expect(resource.props[`{${PROJECT_NS}}color`]).toBe('red')
  })

  it('keys a prefix-serialised custom prop the same way', async () => {
    // Same property, but sent with a prefix instead of an inline xmlns. A
    // consumer must not have to care which one the server picked.
    const xml = `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:" xmlns:p="${PROJECT_NS}">
  <d:response>
    <d:href>/dav/spaces/1$2/file.txt</d:href>
    <d:propstat>
      <d:prop><p:color>red</p:color></d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>
</d:multistatus>`
    const [resource] = await parseMultiStatus(xml)

    expect(resource.props[`{${PROJECT_NS}}color`]).toBe('red')
  })
})

describe('two apps using one property name', () => {
  const registered = [`{${PROJECT_NS}}color`, `{${REVIEW_NS}}color`]

  it('asks for both properties under their own namespace', () => {
    const body = buildPropFindBody([DavProperty.FileId], { extraProps: registered })

    expect(body).toContain(`xmlns:ns0="${PROJECT_NS}"`)
    expect(body).toContain(`xmlns:ns1="${REVIEW_NS}"`)
    expect(body).toContain('<ns0:color/>')
    expect(body).toContain('<ns1:color/>')
  })

  it('hands each app its own value back', async () => {
    const [response] = await parseMultiStatus(
      multiStatus(
        `<color xmlns="${PROJECT_NS}">red</color>
         <color xmlns="${REVIEW_NS}">approved</color>`
      )
    )
    const resource = buildResource(response, registered)

    // Before Clark notation both of these collapsed onto a single `color` key
    // and were merged into an array, which is why apps had to agree on
    // globally unique property names.
    expect(resource.extraProps[`{${PROJECT_NS}}color`]).toBe('red')
    expect(resource.extraProps[`{${REVIEW_NS}}color`]).toBe('approved')
  })

  it('reads both back from a recorded server response', async () => {
    // Recorded from OpenCloud 7.2.0: two PROPPATCHed properties, same local
    // name, different namespaces. The server has no prefix registered for
    // either, so it serialises both with an inline default xmlns.
    const [response] = await parseMultiStatus(recordedResponse)
    const resource = buildResource(response, registered)

    expect(resource.extraProps[`{${PROJECT_NS}}color`]).toBe('red')
    expect(resource.extraProps[`{${REVIEW_NS}}color`]).toBe('approved')
    expect(resource.name).toBe('clark-test')
  })

  it('leaves the resource itself intact', async () => {
    const [response] = await parseMultiStatus(
      multiStatus(
        `<color xmlns="${PROJECT_NS}">red</color>
         <color xmlns="${REVIEW_NS}">approved</color>`
      )
    )
    const resource = buildResource(response, registered)

    expect(resource.fileId).toBe('1$2!3')
    expect(resource.mimeType).toBe('text/plain')
    expect(resource.name).toBe('2024.10')
  })
})
