import {
  DriveItem,
  DriveItemApiAxiosParamCreator,
  DriveItemApiFactory,
  DrivesRootApiFactory,
  MeDriveApiFactory
} from './../generated'
import type { GraphFactoryOptions } from './../types'
import type { GraphDriveItems } from './types'

// placeholder for the item id in a colon-syntax url. it consists of unreserved
// characters only, so it survives encodeURIComponent and can be swapped for the
// path after the generated param creator has built the url.
const COLON_PATH_PLACEHOLDER = '__colon_path__'

// the server recognizes a path lookup by a literal ':/' in the encoded url and
// expects every path segment to be percent-encoded, a ':' inside a name as
// '%3A'. encodeURIComponent does exactly that. See ResolveGraphPath in
// services/graph/pkg/middleware/path_lookup.go on the server side.
const colonPathRef = (path: string) =>
  `root:/${path.split('/').filter(Boolean).map(encodeURIComponent).join('/')}`

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

    // statDriveItem stats an item by id or by path. The path form cannot go
    // through the generated operation: it percent-encodes the item id, which
    // turns the ':/' the server matches on into '%3A%2F'. So the request is
    // built by the generated param creator and only the item segment is
    // rewritten afterwards, keeping the query and headers generated.
    async statDriveItem(driveId, ref, options, requestOptions) {
      if (ref.itemId) {
        const { data } = await driveItemApiFactory.getDriveItemV1(
          driveId,
          ref.itemId,
          options?.select,
          options?.expand,
          requestOptions
        )
        return data
      }

      const { url, options: axiosOptions } = await DriveItemApiAxiosParamCreator(
        config
      ).getDriveItemV1(
        driveId,
        COLON_PATH_PLACEHOLDER,
        options?.select,
        options?.expand,
        requestOptions
      )

      const { data } = await axiosClient.request<DriveItem>({
        ...axiosOptions,
        // the path form is anchored at the drive root, so it replaces the
        // whole '/items/{item-id}' segment rather than just the id
        url: `${config.basePath}${url.replace(
          `items/${COLON_PATH_PLACEHOLDER}`,
          colonPathRef(ref.path)
        )}`
      })
      return data
    },

    async listDriveItemChildren(driveId, itemId, options, requestOptions) {
      const { data } = await driveItemApiFactory.getDriveItemChildren(
        driveId,
        itemId,
        options?.select,
        requestOptions
      )
      return data?.value || []
    }
  }
}
