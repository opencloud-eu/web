import { SpaceResource } from '@opencloud-eu/web-client'

/**
 * Whether a `driveAliasAndItem` addresses the given space, i.e. its drive alias
 * matches on a full segment boundary (`project/test` matches `project/test/sub`
 * but not `project/testing`).
 */
function matchesDriveAlias(space: SpaceResource, driveAliasAndItem: string): boolean {
  if (!space.driveAlias) {
    return false
  }
  const itemSegments = driveAliasAndItem.split('/')
  const aliasSegments = space.driveAlias.split('/')
  if (itemSegments.length < aliasSegments.length) {
    return false
  }
  return itemSegments.slice(0, aliasSegments.length).join('/') === space.driveAlias
}

/**
 * Space a `driveAliasAndItem` points at, matched by drive alias only.
 *
 * Drive aliases are NOT unique: two spaces called `test` both end up as
 * `project/test`. Prefer `getSpaceForDriveAliasAndItem` because of that.
 */
export function getSpaceByDriveAliasAndItem(
  spaces: SpaceResource[],
  driveAliasAndItem: string
): SpaceResource | undefined {
  return spaces.find((s) => matchesDriveAlias(s, driveAliasAndItem))
}

/**
 * Space a route addresses, from its `driveAliasAndItem` param and its `fileId`
 * query. The file id wins because it is unique, whereas a drive alias is shared
 * by every space of the same name.
 */
export function getSpaceForDriveAliasAndItem(
  spaces: SpaceResource[],
  driveAliasAndItem: string,
  fileId?: string
): SpaceResource | undefined {
  if (fileId) {
    const spaceByFileId = spaces.find((s) => s.fileId && fileId.startsWith(`${s.fileId}`))
    if (spaceByFileId) {
      return spaceByFileId
    }
  }
  return getSpaceByDriveAliasAndItem(spaces, driveAliasAndItem)
}
