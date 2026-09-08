import { SharePermissionBit } from '../share/constants'
import { buildPublicSpaceResource } from './functions'
import { PublicSpaceResource, SpaceResource } from './types'
import type { DriveItem } from '../../graph/generated'
import type { Resource } from '../resource'

// The actions a public link grants, capped at the link role by the server.
const actionToPermissionBit: Record<string, number> = {
  'libre.graph/driveItem/content/read': SharePermissionBit.Read,
  'libre.graph/driveItem/path/update': SharePermissionBit.Update,
  'libre.graph/driveItem/upload/create': SharePermissionBit.Create,
  'libre.graph/driveItem/children/create': SharePermissionBit.Create,
  'libre.graph/driveItem/standard/delete': SharePermissionBit.Delete,
  'libre.graph/driveItem/permissions/create': SharePermissionBit.Share
}

/**
 * The link role as the permission bits the callers test against. Graph reports
 * the role as the actions it allows, there is no permission number on a public
 * link item.
 */
export const publicLinkPermissionFromActions = (actions: string[] = []): number =>
  actions.reduce((bits, action) => bits | (actionToPermissionBit[action] ?? 0), 0)

/**
 * Turn the stat of a public link's root into the space the app works with. The
 * counterpart of the PROPFIND based buildPublicSpaceResource, for the graph
 * listing.
 *
 * The link's expiration and its share date came from dav properties that graph
 * has no counterpart for. Nothing reads them. The owner comes from the
 * mountpoint drive.
 */
export const buildPublicSpaceResourceFromDriveItem = ({
  driveItem,
  resource,
  space,
  drive
}: {
  driveItem: DriveItem
  resource: Resource
  space: PublicSpaceResource
  drive?: SpaceResource
}): PublicSpaceResource => {
  const actions = driveItem['@libre.graph.permissions.actions.allowedValues']

  return Object.assign(
    buildPublicSpaceResource({
      ...resource,
      id: space.id,
      driveAlias: space.driveAlias,
      webDavPath: space.webDavPath,
      publicLinkType: space.publicLinkType
    }),
    {
      publicLinkPermission: publicLinkPermissionFromActions(actions),
      // the item behind the link, which dav could not tell apart: it reported
      // "folder" for a link to a single file as well
      publicLinkItemType: driveItem.folder ? 'folder' : 'file',
      fileId: driveItem.id,
      ...(drive?.owner?.displayName && { publicLinkShareOwner: drive.owner.displayName })
    }
  )
}
