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
  async function findInSharedWithMe() {
    const driveItems = await graphClient.driveItems.listSharedWithMe({}, { signal })
    return driveItems.find(({ remoteItem }) => remoteItem?.id === space.id) || null
  }

  // guests can't access their mount points
  if (useAuthStore().isGuestContext) {
    return findInSharedWithMe()
  }

  const matchingMountPoint = await spacesStore.getMountPointForSpace({
    graphClient,
    space,
    signal
  })
  if (!matchingMountPoint) {
    // unsynced shares have no mount point
    return findInSharedWithMe()
  }
  const { id } = matchingMountPoint
  return graphClient.driveItems.getDriveItem(id.split('!')[0], id)
}
