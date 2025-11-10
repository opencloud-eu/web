import {
  Resource,
  isMountPointSpaceResource,
  OCM_PROVIDER_ID,
  buildSpace
} from '@opencloud-eu/web-client'
import { computed, unref } from 'vue'
import { useClientService } from '../clientService'
import { urlJoin } from '@opencloud-eu/web-client'
import { useSpacesStore } from '../piniaStores'
import { DavProperty } from '@opencloud-eu/web-client/webdav'
import { useTask } from 'vue-concurrency'

export const useGetResourceContext = () => {
  const clientService = useClientService()
  const spacesStore = useSpacesStore()

  const spaces = computed(() => spacesStore.spaces)

  const getMatchingSpaceByFileId = (id: Resource['id']) => {
    return unref(spaces).find((space) => id.toString().startsWith(space.id.toString()))
  }
  const getMatchingMountPoint = (id: Resource['id']) => {
    return unref(spaces).find(
      (space) => isMountPointSpaceResource(space) && space.root?.remoteItem?.id === id
    )
  }

  const loadFileInfoById = (fileId: string, signal?: AbortSignal) => {
    const davProperties = [
      DavProperty.FileId,
      DavProperty.FileParent,
      DavProperty.Name,
      DavProperty.ResourceType
    ]

    const tmpSpace = buildSpace({ id: fileId, name: '' })
    return clientService.webdav.getFileInfo(tmpSpace, { fileId }, { davProperties, signal })
  }

  // get context for a resource when only having its id. be careful, this might be very expensive!
  const resourceContextTask = useTask(function* (signal, id) {
    let path: string
    let resource: Resource
    let space = getMatchingSpaceByFileId(id)

    if (space) {
      path = yield clientService.webdav.getPathForFileId(id, { signal })
      resource = yield clientService.webdav.getFileInfo(space, { path }, { signal })
      return { space, resource, path }
    }

    // no matching space found => the file doesn't lie in own spaces => it's a share.
    // do PROPFINDs on parents until root of accepted share is found in `mountpoint` spaces
    yield spacesStore.loadMountPoints({ graphClient: clientService.graphAuthenticated, signal })

    let mountPoint = getMatchingMountPoint(id)
    resource = yield loadFileInfoById(id, signal)
    const sharePathSegments = mountPoint ? [] : [unref(resource).name]
    let tmpResource = unref(resource)

    while (!mountPoint) {
      tmpResource = yield loadFileInfoById(tmpResource.parentFolderId, signal)
      mountPoint = getMatchingMountPoint(tmpResource.id)
      if (!mountPoint) {
        sharePathSegments.unshift(tmpResource.name)
      }
    }

    space =
      spacesStore.getSpace(mountPoint.root?.remoteItem?.id) ||
      spacesStore.createShareSpace({
        driveAliasPrefix: resource.storageId?.startsWith(OCM_PROVIDER_ID) ? 'ocm-share' : 'share',
        id: mountPoint.root?.remoteItem?.id,
        shareName: mountPoint.name
      })

    path = urlJoin(...sharePathSegments)
    return { space, resource, path }
  }).restartable()

  // get context for a resource when only having its id. be careful, this might be very expensive!
  const getResourceContext = (id: string) => {
    return resourceContextTask.perform(id)
  }

  return {
    getResourceContext
  }
}
