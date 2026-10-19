import { SpaceResource } from '@opencloud-eu/web-client'
import { Graph } from '@opencloud-eu/web-client/graph'
import { SpacesStore, useAuthStore } from '../../composables'

/**
 * Gets the drive item for a given shared space.
 */
export const getSharedDriveItem = async ({
  graphClient,
  spacesStore,
  space,
  signal
}: {
  graphClient: Graph
  spacesStore: SpacesStore
  space: SpaceResource
  signal?: AbortSignal
}) => {
  if (useAuthStore().isGuestContext) {
    // guests can't access their mount points, but `sharedWithMe` lists the shared drive item
    const driveItems = await graphClient.driveItems.listSharedWithMe({}, { signal })
    return driveItems.find(({ remoteItem }) => remoteItem?.id === space.id) || null
  }

  const matchingMountPoint = await spacesStore.getMountPointForSpace({
    graphClient,
    space,
    signal
  })
  if (!matchingMountPoint) {
    return null
  }
  const { id } = matchingMountPoint
  return graphClient.driveItems.getDriveItem(id.split('!')[0], id)
}
