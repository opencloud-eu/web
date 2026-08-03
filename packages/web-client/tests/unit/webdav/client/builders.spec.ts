import { buildPropFindBody, buildPropPatchBody } from '../../../../src/webdav/client/builders'
import { DavNamespaces, DavProperty } from '../../../../src/webdav/constants'

describe('buildPropFindBody', () => {
  it('declares the well-known namespaces', () => {
    const body = buildPropFindBody([DavProperty.FileId], { extraProps: [] })

    for (const [prefix, uri] of Object.entries(DavNamespaces)) {
      expect(body).toContain(`xmlns:${prefix}="${uri}"`)
    }
  })

  it('prefixes DAV standard props with d: and everything else with oc:', () => {
    const body = buildPropFindBody([DavProperty.ETag, DavProperty.FileId], { extraProps: [] })

    expect(body).toContain('<d:getetag/>')
    expect(body).toContain('<oc:fileid/>')
  })

  it('declares an unknown prefix from the extra props it is given', () => {
    // No app namespace is registered in this package - passing the name is enough.
    const body = buildPropFindBody([DavProperty.FileId], { extraProps: ['myapp:my-prop'] })

    expect(body).toContain('xmlns:myapp="myapp"')
    expect(body).toContain('<myapp:my-prop/>')
    expect(body).not.toContain('oc:myapp')
  })

  it('declares each distinct prefix once', () => {
    const body = buildPropFindBody([], { extraProps: ['one:a', 'one:b', 'two:c'] })

    expect(body.match(/xmlns:one=/g)).toHaveLength(1)
    expect(body).toContain('xmlns:two="two"')
  })

  it('never lets an extra prop override a well-known namespace', () => {
    const body = buildPropFindBody([], { extraProps: ['oc:something', 'd:other'] })

    expect(body).toContain(`xmlns:oc="${DavNamespaces.oc}"`)
    expect(body).toContain(`xmlns:d="${DavNamespaces.d}"`)
    expect(body).not.toContain('xmlns:oc="oc"')
    expect(body).not.toContain('xmlns:d="d"')
  })

  it('leaves an unprefixed extra prop undeclared', () => {
    const body = buildPropFindBody([], { extraProps: ['bare-prop'] })

    expect(body).toContain('<bare-prop/>')
    expect(body).not.toContain('xmlns:bare-prop')
  })
})

describe('buildPropPatchBody', () => {
  it('falls back to the oc namespace for unregistered props', () => {
    const body = buildPropPatchBody({ [DavProperty.IsFavorite]: 'true' })

    expect(body).toContain(`xmlns:oc="${DavNamespaces.oc}"`)
    expect(body).toContain('<oc:favorite>true</oc:favorite>')
  })

  it('writes an extra prop under its own declared prefix', () => {
    // The write side has to namespace names exactly like the read side, or the
    // value ends up under a key no PROPFIND can address.
    const body = buildPropPatchBody({ 'myapp:my-prop': 'dG9rZW4=' }, ['myapp:my-prop'])

    expect(body).toContain('xmlns:myapp="myapp"')
    expect(body).toContain('<myapp:my-prop>dG9rZW4=</myapp:my-prop>')
    expect(body).not.toContain('oc:myapp')
  })

  it('forces the oc namespace on a custom prop that was never listed', () => {
    const body = buildPropPatchBody({ 'my-prop': 'dG9rZW4=' })

    expect(body).toContain('<oc:my-prop>dG9rZW4=</oc:my-prop>')
  })
})
