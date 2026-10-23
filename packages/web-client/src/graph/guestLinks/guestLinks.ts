import type { AxiosResponse } from 'axios'
import { GuestLinksApiFactory, GuestLinkSessionResponse } from './../generated'
import type { GraphFactoryOptions } from './../types'
import type { GraphGuestLinks, GuestLinkSession } from './types'

function toGuestLinkSession({
  data,
  headers
}: AxiosResponse<GuestLinkSessionResponse>): GuestLinkSession {
  return { ...data, serverDateTime: headers?.date }
}

export const GuestLinksFactory = ({
  axiosClient,
  config
}: GraphFactoryOptions): GraphGuestLinks => {
  const guestLinksApiFactory = GuestLinksApiFactory(config, config.basePath, axiosClient)

  return {
    async verifyGuestLinkToken(token, requestOptions) {
      return toGuestLinkSession(
        await guestLinksApiFactory.verifyGuestLinkToken({ token }, requestOptions)
      )
    },
    async verifyGuestLinkPin({ pin, permissionId }, requestOptions) {
      return toGuestLinkSession(
        await guestLinksApiFactory.verifyGuestLinkPin(
          // the browser sends the http-only nonce cookie, the generated client ignores this param
          '',
          { pin, permissionId },
          requestOptions
        )
      )
    },
    async renewGuestLink(permissionId, requestOptions) {
      await guestLinksApiFactory.renewGuestLink({ permissionId }, requestOptions)
    }
  }
}
