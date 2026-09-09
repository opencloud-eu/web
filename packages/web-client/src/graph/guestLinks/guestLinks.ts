import { GuestLinksApiFactory } from './../generated'
import type { GraphFactoryOptions } from './../types'
import type { GraphGuestLinks } from './types'

export const GuestLinksFactory = ({
  axiosClient,
  config
}: GraphFactoryOptions): GraphGuestLinks => {
  const guestLinksApiFactory = GuestLinksApiFactory(config, config.basePath, axiosClient)

  return {
    async redeemGuestLink(token, requestOptions) {
      const { data } = await guestLinksApiFactory.redeemGuestLink({ token }, requestOptions)
      return data.permissionId
    }
  }
}
