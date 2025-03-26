import { DriveItem } from '@opencloud-eu/web-client/graph/generated'
import { SharesStore, SpacesStore, UserStore } from '../../composables/piniaStores'
import { SpaceMember, SpaceResource } from '@opencloud-eu/web-client'

/**
 * Since shared spaces are only virtual, they and their permissions can't be fetched from the server.
 * Hence the permissions for the current user may need to be set manually via the corresponding drive item.
 */
export const setCurrentUserShareSpacePermissions = ({
  sharesStore,
  spacesStore,
  userStore,
  space,
  sharedDriveItem
}: {
  sharesStore: SharesStore
  spacesStore: SpacesStore
  userStore: UserStore
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

  const uniquePermissions = [...new Set(allPermissions)]
  const spaceMember: SpaceMember = {
    grantedTo: { user: { id: userStore.user.id, displayName: userStore.user.displayName } },
    permissions: uniquePermissions,
    roleId: ''
  }
  spacesStore.updateSpaceField({
    id: space.id,
    field: 'members',
    value: { [userStore.user.id]: spaceMember }
  })
}
