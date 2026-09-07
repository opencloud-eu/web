import { isPublicSpaceResource, SpaceResource } from './types'
import type { DriveItemRef } from '../../graph/driveItems'

// reva's PublicStorageProviderID: every public link lives in this one mountpoint
// space, the link token is the item below it
const publicStorageProviderId = '7993447f-687f-490d-875c-ac95e89a62a4'

/**
 * The graph drive a space is addressed by. For a public link the client builds
 * it from the link token, everywhere else the space id is the drive id.
 */
export const graphDriveIdOfSpace = (space: SpaceResource): string => {
  if (isPublicSpaceResource(space)) {
    return `${publicStorageProviderId}$${publicStorageProviderId}!${space.id}`
  }
  return space.id.toString()
}

/**
 * How graph addresses an item of the space: by id where there is one, by path
 * otherwise. A root has no path to look up, it is addressed by its id, and for
 * a public link that is the mountpoint drive itself.
 */
export const graphRefOfSpace = (
  space: SpaceResource,
  { path, fileId }: { path?: string; fileId?: string }
): DriveItemRef => {
  if (fileId) {
    return { itemId: fileId }
  }
  if (!path || path === '/') {
    return { itemId: isPublicSpaceResource(space) ? graphDriveIdOfSpace(space) : space.root?.id }
  }
  return { path }
}
