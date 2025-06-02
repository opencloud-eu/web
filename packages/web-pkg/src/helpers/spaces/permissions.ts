import { DriveItem } from '@opencloud-eu/web-client/graph/generated'
import { SharesStore, SpacesStore } from '../../composables/piniaStores'
import { SpaceResource } from '@opencloud-eu/web-client'

/**
 * Since shared spaces are only virtual, they and their permissions can't be fetched from the server.
 * Hence the permissions for the current user may need to be set manually via the corresponding drive item.
 */
export const setCurrentUserShareSpacePermissions = ({
  sharesStore,
  spacesStore,
  space,
  sharedDriveItem
}: {
  sharesStore: SharesStore
  spacesStore: SpacesStore
  space: SpaceResource
  sharedDriveItem: DriveItem
}) => {
  const permissions = sharedDriveItem?.remoteItem?.permissions || []
  if (!permissions.length) {
    return
  }

  const allPermissions: string[] = []
  permissions.forEach((permission) => {
    if (permission['@libre.graph.permissions.actions']) {
      allPermissions.push(...permission['@libre.graph.permissions.actions'])
      return
    }
    const role = sharesStore.graphRoles[permission.roles[0]]
    if (!role) {
      return
    }
    const permissions = role.rolePermissions.flatMap((p) => p.allowedResourceActions)
    allPermissions.push(...permissions)
  })

  spacesStore.updateSpaceField({
    id: space.id,
    field: 'graphPermissions',
    value: [...new Set(allPermissions)]
  })
}
