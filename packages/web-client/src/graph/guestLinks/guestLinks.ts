import { GuestLinksApiFactory } from './../generated'
import type { GraphFactoryOptions } from './../types'
import type { GraphGuestLinks } from './types'

export const GuestLinksFactory = ({
  axiosClient,
  config
}: GraphFactoryOptions): GraphGuestLinks => {
  const guestLinksApiFactory = GuestLinksApiFactory(config, config.basePath, axiosClient)

  return {
    async verifyGuestLinkToken(token, requestOptions) {
      const { data } = await guestLinksApiFactory.verifyGuestLinkToken({ token }, requestOptions)
      return data.permissionId
    },
    async verifyGuestLinkPin({ pin, permissionId }, requestOptions) {
      const { data } = await guestLinksApiFactory.verifyGuestLinkPin(
        // the browser sends the http-only nonce cookie, the generated client ignores this param
        '',
        { pin, permissionId },
        requestOptions
      )
      return data.permissionId
    },
    async renewGuestLink(permissionId, requestOptions) {
      await guestLinksApiFactory.renewGuestLink({ permissionId }, requestOptions)
    }
  }
}
