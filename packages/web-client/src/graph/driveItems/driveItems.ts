import { DriveItemApiFactory, DrivesRootApiFactory, MeDriveApiFactory } from './../generated'
import type { GraphFactoryOptions } from './../types'
import type { GraphDriveItems } from './types'

export const DriveItemsFactory = ({
  axiosClient,
  config
}: GraphFactoryOptions): GraphDriveItems => {
  const driveItemApiFactory = DriveItemApiFactory(config, config.basePath, axiosClient)
  const drivesRootApiFactory = DrivesRootApiFactory(config, config.basePath, axiosClient)
  const meDriveApiFactory = MeDriveApiFactory(config, config.basePath, axiosClient)

  return {
    async getDriveItem(driveId, itemId, requestOptions) {
      const { data } = await driveItemApiFactory.getDriveItem(driveId, itemId, requestOptions)
      return data
    },

    async createDriveItem(driveId, data, requestOptions) {
      const { data: driveItem } = await drivesRootApiFactory.createDriveItem(
        driveId,
        data,
        requestOptions
      )
      return driveItem
    },

    async updateDriveItem(driveId, itemId, data, requestOptions) {
      const { data: driveItem } = await driveItemApiFactory.updateDriveItem(
        driveId,
        itemId,
        data,
        requestOptions
      )
      return driveItem
    },

    async deleteDriveItem(driveId, itemId, requestOptions) {
      await driveItemApiFactory.deleteDriveItem(driveId, itemId, requestOptions)
    },

    async listSharedByMe(options, requestOptions) {
      const { data } = await meDriveApiFactory.listSharedByMe(options?.expand, requestOptions)
      return data?.value || []
    },

    async listSharedWithMe(options, requestOptions) {
      const { data } = await meDriveApiFactory.listSharedWithMe(options?.expand, requestOptions)
      return data?.value || []
    }
  }
}
