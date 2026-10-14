import type { GraphRequestOptions } from '../types'

export interface GraphGuestLinks {
  verifyGuestLinkToken: (token: string, requestOptions?: GraphRequestOptions) => Promise<string>
  verifyGuestLinkPin: (
    data: { pin: string; permissionId: string },
    requestOptions?: GraphRequestOptions
  ) => Promise<string>
  renewGuestLink: (
    data: { permissionId: string; token?: string },
    requestOptions?: GraphRequestOptions
  ) => Promise<void>
}
