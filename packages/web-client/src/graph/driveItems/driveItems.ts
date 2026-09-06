import { DriveItemApiFactory, DrivesRootApiFactory, MeDriveApiFactory } from './../generated'
import { urlJoin } from '../../utils'
import type { GraphFactoryOptions } from './../types'
import type { DriveItemQueryOptions, GraphDriveItems } from './types'

const odataQuery = ({ select, expand }: DriveItemQueryOptions = {}) => {
  const params = [
    ...(select?.length ? [`$select=${select.join(',')}`] : []),
    ...(expand?.length ? [`$expand=${expand.join(',')}`] : [])
  ]
  return params.length ? `?${params.join('&')}` : ''
}

export const DriveItemsFactory = ({
  axiosClient,
  config
}: GraphFactoryOptions): GraphDriveItems => {
  const driveItemApiFactory = DriveItemApiFactory(config, config.basePath, axiosClient)
  const drivesRootApiFactory = DrivesRootApiFactory(config, config.basePath, axiosClient)
  const meDriveApiFactory = MeDriveApiFactory(config, config.basePath, axiosClient)

  return {
    async getDriveItem(driveId, itemId, requestOptions) {
      const { data } = await driveItemApiFactory.getDriveItem(
        driveId,
        itemId,
        undefined,
        undefined,
        requestOptions
      )
      return data
    },

    async createDriveItem(driveId, data, requestOptions) {
      const { data: driveItem } = await drivesRootApiFactory.createDriveItem(
        driveId,
        null,
        null,
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

    async followDriveItem(itemId, requestOptions) {
      const { data } = await meDriveApiFactory.followDriveItem(itemId, requestOptions)
      return data
    },

    async unfollowDriveItem(itemId, requestOptions) {
      await meDriveApiFactory.unfollowDriveItem(itemId, requestOptions)
    },

    async listSharedByMe(options, requestOptions) {
      const { data } = await meDriveApiFactory.listSharedByMe(options?.expand, requestOptions)
      return data?.value || []
    },

    async listSharedWithMe(options, requestOptions) {
      const { data } = await meDriveApiFactory.listSharedWithMe(options?.expand, requestOptions)
      return data?.value || []
    },

    // statDriveItem stats an item by id or by graph's colon path syntax.
    // Hand-rolled for the same reason as listDriveItemChildren: the generated
    // client has no $select, no $expand and no path lookup.
    async statDriveItem(driveId, ref, options, requestOptions) {
      const suffix = ref.itemId
        ? `/items/${ref.itemId}`
        : `/root:${urlJoin(ref.path, { leadingSlash: true })}`
      const { data } = await axiosClient.get(
        `${config.basePath}/v1.0/drives/${driveId}${suffix}${odataQuery(options)}`,
        requestOptions
      )
      return data
    },

    // listDriveItemChildren lists a folder's children. Hand-rolled because the
    // generated client only covers the personal drive root.
    async listDriveItemChildren(driveId, itemId, options, requestOptions) {
      const { data } = await axiosClient.get(
        `${config.basePath}/v1.0/drives/${driveId}/items/${itemId}/children${odataQuery(options)}`,
        requestOptions
      )
      return data?.value || []
    }
  }
}
