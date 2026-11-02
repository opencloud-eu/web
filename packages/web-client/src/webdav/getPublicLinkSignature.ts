import { buildWebDavPublicPath } from '../helpers'
import { DAV } from './client'
import { DavFileInfoResponse, DavProperty } from './constants'
import { WebDavOptions } from './types'

export type PublicLinkSignature = DavFileInfoResponse['signature-auth']

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GetPublicLinkSignatureFactory = (dav: DAV, options: WebDavOptions) => {
  return {
    /**
     * Fetches a short-lived, server-generated signature for a password protected public link.
     * It authenticates plain GET requests (e.g. archive downloads) via `signature` and
     * `expiration` query params, so they don't need an Authorization header.
     */
    async getPublicLinkSignature(publicLinkToken: string): Promise<PublicLinkSignature> {
      const [root] = await dav.propfind(buildWebDavPublicPath(publicLinkToken), {
        depth: 0,
        properties: [DavProperty.SignatureAuth]
      })
      return root?.props?.[DavProperty.SignatureAuth]
    }
  }
}
