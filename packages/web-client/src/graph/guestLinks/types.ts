import type { GraphRequestOptions } from '../types'

export interface GraphGuestLinks {
  redeemGuestLink: (token: string, requestOptions?: GraphRequestOptions) => Promise<string>
}
