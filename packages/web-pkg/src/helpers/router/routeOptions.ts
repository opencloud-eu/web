import { isShareSpaceResource, Resource, SpaceResource } from '@opencloud-eu/web-client'
import { LocationQuery } from '../../composables'
import { RouteParams } from 'vue-router'
import { isUndefined } from 'lodash-es'

/**
 * Creates route options for routing into a file location:
 * - params.driveAliasAndItem
 * - query.shareId
 * - query.fileId
 *
 * Both query options are optional.
 */
export const createFileRouteOptions = (
  space: SpaceResource,
  target: { path?: string; fileId?: string | number } = {}
): { params: RouteParams; query: LocationQuery } => {
  return {
    params: {
      driveAliasAndItem: space.getDriveAliasAndItem({ path: target.path || '' } as Resource)
    },
    query: {
      ...(isShareSpaceResource(space) && { shareId: space.id }),
      ...(!isUndefined(target.fileId) && { fileId: `${target.fileId}` })
    }
  }
}
