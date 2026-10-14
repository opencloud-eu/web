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
        { pin, permissionId },
        requestOptions
      )
      return data.permissionId
    },
    async renewGuestLink({ permissionId, token }, requestOptions) {
      await guestLinksApiFactory.renewGuestLink({ permissionId, token }, requestOptions)
    }
  }
}
