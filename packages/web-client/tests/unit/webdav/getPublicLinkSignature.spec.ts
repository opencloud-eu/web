import { mock } from 'vitest-mock-extended'
import { GetPublicLinkSignatureFactory } from '../../../src/webdav/getPublicLinkSignature'
import { DAV } from '../../../src/webdav/client'
import { DavProperty } from '../../../src/webdav/constants'
import { WebDavOptions } from '../../../src/webdav/types'
import { WebDavResponseResource } from '../../../src/helpers'

describe('getPublicLinkSignature', () => {
  it('requests the signature of the public link root', async () => {
    const signatureAuth = { signature: 'sig', expiration: '2026-11-02T12:00:00Z' }
    const dav = mock<DAV>()
    dav.propfind.mockResolvedValue([
      { props: { [DavProperty.SignatureAuth]: signatureAuth } } as WebDavResponseResource
    ])
    const { getPublicLinkSignature } = GetPublicLinkSignatureFactory(dav, mock<WebDavOptions>())

    const result = await getPublicLinkSignature('token')

    expect(dav.propfind).toHaveBeenCalledWith('public-files/token', {
      depth: 0,
      properties: [DavProperty.SignatureAuth]
    })
    expect(result).toEqual(signatureAuth)
  })

  it('returns undefined if the server does not provide a signature', async () => {
    const dav = mock<DAV>()
    dav.propfind.mockResolvedValue([{ props: {} } as WebDavResponseResource])
    const { getPublicLinkSignature } = GetPublicLinkSignatureFactory(dav, mock<WebDavOptions>())

    expect(await getPublicLinkSignature('token')).toBeUndefined()
  })
})
