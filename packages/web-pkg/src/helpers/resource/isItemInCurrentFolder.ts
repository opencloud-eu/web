import { extractNodeId } from '@opencloud-eu/web-client'
import { ResourcesStore } from '../../composables'

export const isItemInCurrentFolder = ({
  resourcesStore,
  parentFolderId
}: {
  resourcesStore: ResourcesStore
  parentFolderId: string
}) => {
  const currentFolder = resourcesStore.currentFolder
  if (!currentFolder || !currentFolder.id) {
    return false
  }

  // the root of an incoming share has the share jail id, the items in it reference the id of the shared resource
  if (currentFolder.fileId && currentFolder.fileId === parentFolderId) {
    return true
  }

  if (!extractNodeId(currentFolder.id)) {
    // if we don't have a nodeId here, we have a space (root) as current folder and can only check against the storageId
    const spaceNodeId = currentFolder.id.split('$')[1]
    if (`${currentFolder.id}!${spaceNodeId}` !== parentFolderId) {
      return false
    }
  } else {
    if (currentFolder.id !== parentFolderId) {
      return false
    }
  }

  return true
}
