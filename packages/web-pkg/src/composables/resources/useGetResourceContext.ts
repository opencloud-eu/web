import {
  Resource,
  OCM_PROVIDER_ID,
  buildSpace,
  isShareSpaceResource
} from '@opencloud-eu/web-client'
import { computed, unref } from 'vue'
import { useClientService } from '../clientService'
import { urlJoin } from '@opencloud-eu/web-client'
import { useSpacesStore } from '../piniaStores'
import { DavProperty, DavPropertyValue } from '@opencloud-eu/web-client/webdav'
import { DriveItem } from '@opencloud-eu/web-client/graph/generated'
import { useTask } from 'vue-concurrency'

export const useGetResourceContext = () => {
  const clientService = useClientService()
  const spacesStore = useSpacesStore()

  const spaces = computed(() => spacesStore.spaces)

  const getMatchingSpaceByFileId = (id: Resource['id']) => {
    // a share space id is the id of the share root, which can't be resolved like own spaces
    return unref(spaces).find(
      (space) => !isShareSpaceResource(space) && id.toString().startsWith(space.id.toString())
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
    const space = getMatchingSpaceByFileId(id)
    if (space) {
      const path: string = yield clientService.webdav.getPathForFileId(id, { signal })
      const resource: Resource = yield clientService.webdav.getFileInfo(space, { path }, { signal })
      return { space, resource, path }
    }

    // not in own spaces => it's a share. walk up the parents until the root of a received share
    // is found. `sharedWithMe` also lists shares that are not synced and therefore have no mount point.
    const [driveItems, resource]: [DriveItem[], Resource] = yield Promise.all([
      clientService.graphAuthenticated.driveItems.listSharedWithMe({}, { signal }),
      loadFileInfoById(id, { signal })
    ])
    const sharePathSegments: string[] = []
    const visitedIds = new Set<string>()
    let tmpResource = resource
    const findDriveItem = (resourceId: string) =>
      driveItems.find(({ remoteItem }) => remoteItem?.id === resourceId)
    let driveItem = findDriveItem(tmpResource.id)

    while (!driveItem) {
      if (!tmpResource.parentFolderId || visitedIds.has(tmpResource.id)) {
        throw new Error('The resource is not part of a received share')
      }
      visitedIds.add(tmpResource.id)
      sharePathSegments.unshift(tmpResource.name)
      // only the properties needed to walk up the parent chain
      tmpResource = yield loadFileInfoById(tmpResource.parentFolderId, {
        signal,
        davProperties: [DavProperty.FileId, DavProperty.FileParent, DavProperty.Name]
      })
      driveItem = findDriveItem(tmpResource.id)
    }

    const shareSpace =
      spacesStore.getSpace(driveItem.remoteItem.id) ||
      spacesStore.createShareSpace({
        driveAliasPrefix: resource.storageId?.startsWith(OCM_PROVIDER_ID) ? 'ocm-share' : 'share',
        id: driveItem.remoteItem.id,
        shareName: driveItem.name
      })
    return { space: shareSpace, resource, path: urlJoin(...sharePathSegments) }
  }).restartable()

  // get context for a resource when only having its id. be careful, this might be very expensive!
  const getResourceContext = async (id: string) => {
    return await resourceContextTask.perform(id)
  }

  return {
    getResourceContext
  }
}
