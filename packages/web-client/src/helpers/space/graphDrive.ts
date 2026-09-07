import { isPublicSpaceResource, SpaceResource } from './types'

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
