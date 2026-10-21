import {
  Resource,
  isMountPointSpaceResource,
  OCM_PROVIDER_ID,
  buildSpace
} from '@opencloud-eu/web-client'
import { computed, unref } from 'vue'
import { useClientService } from '../clientService'
import { urlJoin } from '@opencloud-eu/web-client'
import { useAuthStore, useSpacesStore } from '../piniaStores'
import { DavProperty, DavPropertyValue } from '@opencloud-eu/web-client/webdav'
import { DriveItem } from '@opencloud-eu/web-client/graph/generated'
import { useTask } from 'vue-concurrency'

export const useGetResourceContext = () => {
  const clientService = useClientService()
  const spacesStore = useSpacesStore()
  const authStore = useAuthStore()

  const spaces = computed(() => spacesStore.spaces)

  const getMatchingSpaceByFileId = (id: Resource['id']) => {
    return unref(spaces).find((space) => id.toString().startsWith(space.id.toString()))
  }
  const getMatchingMountPoint = (id: Resource['id']) => {
    return unref(spaces).find(
      (space) => isMountPointSpaceResource(space) && space.root?.remoteItem?.id === id
    )
  }

  const loadFileInfoById = (
    fileId: string,
    { signal, davProperties }: { signal?: AbortSignal; davProperties?: DavPropertyValue[] } = {}
  ) => {
    const tmpSpace = buildSpace({ id: fileId, name: '' })
    return clientService.webdav.getFileInfo(tmpSpace, { fileId }, { davProperties, signal })
  }

  // get context for a resource when only having its id. be careful, this might be very expensive!
  const resourceContextTask = useTask(function* (signal, id) {
    let path: string
    let resource: Resource

    if (authStore.isGuestContext) {
      // a guest has no mount points, so walk up to the root of one of its shares instead
      const [driveItems, fileInfo]: [DriveItem[], Resource] = yield Promise.all([
        clientService.graphAuthenticated.driveItems.listSharedWithMe({}, { signal }),
        loadFileInfoById(id, { signal })
      ])
      resource = fileInfo
      const sharePathSegments: string[] = []
      const visitedIds = new Set<string>()
      let tmpResource = resource
      const findDriveItem = (resourceId: string) =>
        driveItems.find(({ remoteItem }) => remoteItem?.id === resourceId)
      let driveItem = findDriveItem(tmpResource.id)

      while (!driveItem) {
        if (!tmpResource.parentFolderId || visitedIds.has(tmpResource.id)) {
          throw new Error('The resource is not part of a guest share')
        }
        visitedIds.add(tmpResource.id)
        sharePathSegments.unshift(tmpResource.name)
        tmpResource = yield loadFileInfoById(tmpResource.parentFolderId, {
          signal,
          davProperties: [DavProperty.FileId, DavProperty.FileParent, DavProperty.Name]
        })
        driveItem = findDriveItem(tmpResource.id)
      }

      const space =
        spacesStore.getSpace(driveItem.remoteItem.id) ||
        spacesStore.createShareSpace({
          driveAliasPrefix: 'share',
          id: driveItem.remoteItem.id,
          shareName: driveItem.name
        })
      return { space, resource, path: urlJoin(...sharePathSegments) }
    }

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
    resource = yield loadFileInfoById(id, { signal })
    const sharePathSegments = mountPoint ? [] : [unref(resource).name]
    let tmpResource = unref(resource)

    while (!mountPoint) {
      // only the properties needed to walk up the parent chain
      tmpResource = yield loadFileInfoById(tmpResource.parentFolderId, {
        signal,
        davProperties: [DavProperty.FileId, DavProperty.FileParent, DavProperty.Name]
      })
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
  const getResourceContext = async (id: string) => {
    return await resourceContextTask.perform(id)
  }

  return {
    getResourceContext
  }
}
