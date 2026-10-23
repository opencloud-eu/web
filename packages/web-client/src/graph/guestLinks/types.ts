import type { GraphRequestOptions } from '../types'
import type { GuestLinkSessionResponse } from '../generated'

export interface GuestLinkSession extends GuestLinkSessionResponse {
  // the `Date` response header, missing cross-origin unless the server exposes it
  serverDateTime?: string
}

export interface GraphGuestLinks {
  verifyGuestLinkToken: (
    token: string,
    requestOptions?: GraphRequestOptions
  ) => Promise<GuestLinkSession>
  verifyGuestLinkPin: (
    data: { pin: string; permissionId: string },
    requestOptions?: GraphRequestOptions
  ) => Promise<GuestLinkSession>
  renewGuestLink: (permissionId: string, requestOptions?: GraphRequestOptions) => Promise<void>
}
