import {
  createFileRouteOptions,
  ImageDimension,
  isItemInCurrentFolder,
  isLocationCommonActive
} from '@opencloud-eu/web-pkg'
import {
  buildSpace,
  isShareSpaceResource,
  Resource,
  SpaceResource,
  urlJoin
} from '@opencloud-eu/web-client'
import { DavProperty } from '@opencloud-eu/web-client/webdav'
import { dirname } from 'path'
import { SSEEventOptions } from './types'

/**
 * Returns the space with the given id. Share recipients don't know the space a shared
 * resource lives in, so if it is the space of the current folder, the current space
 * (e.g. the share) is used to access the resource instead.
 */
const getEventSpace = (
  { spacesStore, resourcesStore }: Pick<SSEEventOptions, 'spacesStore' | 'resourcesStore'>,
  spaceId: string
) => {
  const space = spacesStore.spaces.find((s) => s.id === spaceId)
  if (space) {
    return space
  }

  if (spaceId && resourcesStore.currentFolder?.storageId === spaceId) {
    return spacesStore.currentSpace
  }
}

/**
 * Loads the resource with the given id. Within shares the path of a file id can't be resolved
 * relative to the share, so the resource is looked up by its id first and then loaded via its
 * path in the current folder. Resources outside the current folder are returned as looked up
 * by their id, without a path.
 */
const loadEventResource = async (
  { clientService, resourcesStore }: Pick<SSEEventOptions, 'clientService' | 'resourcesStore'>,
  space: SpaceResource,
  fileId: string
): Promise<Resource> => {
  if (!isShareSpaceResource(space)) {
    return clientService.webdav.getFileInfo(space, { path: '', fileId })
  }

  const resource = await clientService.webdav.getFileInfo(
    buildSpace({ id: fileId, name: '' }),
    { fileId },
    { davProperties: [DavProperty.FileId, DavProperty.FileParent, DavProperty.Name] }
  )

  const currentFolder = resourcesStore.currentFolder
  let parentPath: string
  if (isItemInCurrentFolder({ resourcesStore, parentFolderId: resource.parentFolderId })) {
    parentPath = currentFolder.path
  } else if (currentFolder?.id === resource.id) {
    parentPath = dirname(currentFolder.path)
  } else {
    return resource
  }

  return clientService.webdav.getFileInfo(space, { path: urlJoin(parentPath, resource.name) })
}

export const onSSEItemRenamedEvent = async ({
  sseData,
  resourcesStore,
  spacesStore,
  clientService,
  router
}: SSEEventOptions) => {
  if (sseData.initiatorid === clientService.initiatorId) {
    // If initiated by current client (browser tab), action unnecessary. Web manages its own logic, return early.
    return
  }

  const currentFolder = resourcesStore.currentFolder
  const resourceIsCurrentFolder = currentFolder?.id === sseData.itemid
  const resource = resourceIsCurrentFolder
    ? currentFolder
    : resourcesStore.resources.find((f) => f.id === sseData.itemid)

  if (!resource) {
    return
  }
  const space = getEventSpace({ spacesStore, resourcesStore }, resource.storageId)

  if (!space) {
    return
  }

  const updatedResource = await loadEventResource(
    { clientService, resourcesStore },
    space,
    sseData.itemid
  )

  if (resourceIsCurrentFolder) {
    resourcesStore.setCurrentFolder(updatedResource)
    return router.push(
      createFileRouteOptions(space, {
        path: updatedResource.path,
        fileId: updatedResource.fileId
      })
    )
  }

  resourcesStore.upsertResource(updatedResource)
}

export const onSSEFileLockingEvent = async ({
  sseData,
  resourcesStore,
  spacesStore,
  clientService
}: SSEEventOptions) => {
  const resource = resourcesStore.resources.find((f) => f.id === sseData.itemid)
  const space = getEventSpace({ spacesStore, resourcesStore }, resource?.storageId)

  if (!resource || !space) {
    return
  }

  const updatedResource = await loadEventResource(
    { clientService, resourcesStore },
    space,
    sseData.itemid
  )

  resourcesStore.upsertResource(updatedResource)
}

export const onSSEProcessingFinishedEvent = async ({
  sseData,
  resourcesStore,
  spacesStore,
  clientService,
  resourceQueue,
  previewService
}: SSEEventOptions) => {
  if (!isItemInCurrentFolder({ resourcesStore, parentFolderId: sseData.parentitemid })) {
    return false
  }
  const resource = resourcesStore.resources.find((f) => f.id === sseData.itemid)
  const space = getEventSpace({ spacesStore, resourcesStore }, sseData.spaceid)
  if (!space) {
    return
  }

  /**
   * If resource is not loaded, it suggests an upload is in progress.
   */
  if (!resource) {
    if (sseData.initiatorid === clientService.initiatorId) {
      /**
       * If the upload is initiated by the current client,
       * there's no necessity to retrieve the resources again.
       */
      return
    }

    return resourceQueue.add(async () => {
      const resource = await loadEventResource(
        { clientService, resourcesStore },
        space,
        sseData.itemid
      )

      // check again for the current folder in case the user has navigated away in the meantime
      if (isItemInCurrentFolder({ resourcesStore, parentFolderId: sseData.parentitemid })) {
        resourcesStore.upsertResource(resource)
      }
    })
  }

  /**
   * Resource not changed, don't fetch more data
   */
  if (resource.etag === sseData.etag) {
    return resourcesStore.updateResourceField({
      id: sseData.itemid,
      field: 'processing',
      value: false
    })
  }

  const updatedResource = await loadEventResource(
    { clientService, resourcesStore },
    space,
    sseData.itemid
  )
  resourcesStore.upsertResource(updatedResource)

  const preview = await previewService.loadPreview({
    resource,
    space,
    dimensions: ImageDimension.Thumbnail
  })

  if (preview) {
    resourcesStore.updateResourceField({
      id: sseData.itemid,
      field: 'thumbnail',
      value: preview
    })
  }
}

export const onSSEItemTrashedEvent = ({
  sseData,
  language,
  messageStore,
  resourcesStore,
  clientService
}: SSEEventOptions) => {
  if (sseData.initiatorid === clientService.initiatorId) {
    // If initiated by current client (browser tab), action unnecessary. Web manages its own logic, return early.
    return
  }
  const { $gettext } = language

  const currentFolder = resourcesStore.currentFolder
  const resourceIsCurrentFolder = currentFolder?.id === sseData.itemid

  if (resourceIsCurrentFolder) {
    return messageStore.showMessage({
      title: $gettext(
        'The folder you were accessing has been removed. Please navigate to another location.'
      )
    })
  }

  const resource = resourcesStore.resources.find((f) => f.id === sseData.itemid)

  if (!resource) {
    return
  }

  resourcesStore.removeResources([resource])
}

export const onSSEItemRestoredEvent = async ({
  sseData,
  resourcesStore,
  spacesStore,
  clientService
}: SSEEventOptions) => {
  if (sseData.initiatorid === clientService.initiatorId) {
    // If initiated by current client (browser tab), action unnecessary. Web manages its own logic, return early.
    return
  }

  const space = getEventSpace({ spacesStore, resourcesStore }, sseData.spaceid)
  if (!space) {
    return
  }

  const resource = await loadEventResource({ clientService, resourcesStore }, space, sseData.itemid)

  if (!resource) {
    return
  }

  if (!isItemInCurrentFolder({ resourcesStore, parentFolderId: resource.parentFolderId })) {
    return false
  }

  resourcesStore.upsertResource(resource)
}

export const onSSEItemMovedEvent = async ({
  sseData,
  resourcesStore,
  spacesStore,
  clientService
}: SSEEventOptions) => {
  if (sseData.initiatorid === clientService.initiatorId) {
    // If initiated by current client (browser tab), action unnecessary. Web manages its own logic, return early.
    return
  }

  const space = getEventSpace({ spacesStore, resourcesStore }, sseData.spaceid)
  if (!space) {
    return
  }

  const resource = await loadEventResource({ clientService, resourcesStore }, space, sseData.itemid)

  if (!resource) {
    return
  }

  if (!isItemInCurrentFolder({ resourcesStore, parentFolderId: resource.parentFolderId })) {
    return resourcesStore.removeResources([resource])
  }

  resourcesStore.upsertResource(resource)
}

/**
 * The FileTouched event is triggered when a new empty file, such as a new text file,
 * is about to be created on the server. This event is necessary because the
 * post-processing event won't be triggered in this case.
 */
export const onSSEFileTouchedEvent = async ({
  sseData,
  resourcesStore,
  spacesStore,
  clientService
}: SSEEventOptions) => {
  if (sseData.initiatorid === clientService.initiatorId) {
    // If initiated by current client (browser tab), action unnecessary. Web manages its own logic, return early.
    return
  }

  const space = getEventSpace({ spacesStore, resourcesStore }, sseData.spaceid)
  if (!space) {
    return
  }

  const resource = await loadEventResource({ clientService, resourcesStore }, space, sseData.itemid)

  if (!resource) {
    return
  }

  if (!isItemInCurrentFolder({ resourcesStore, parentFolderId: resource.parentFolderId })) {
    return false
  }

  resourcesStore.upsertResource(resource)
}

export const onSSEFolderCreatedEvent = async ({
  sseData,
  resourcesStore,
  spacesStore,
  clientService
}: SSEEventOptions) => {
  if (sseData.initiatorid === clientService.initiatorId) {
    // If initiated by current client (browser tab), action unnecessary. Web manages its own logic, return early.
    return
  }

  const space = getEventSpace({ spacesStore, resourcesStore }, sseData.spaceid)
  if (!space) {
    return
  }

  const resource = await loadEventResource({ clientService, resourcesStore }, space, sseData.itemid)

  if (!resource) {
    return
  }

  if (!isItemInCurrentFolder({ resourcesStore, parentFolderId: resource.parentFolderId })) {
    return false
  }

  resourcesStore.upsertResource(resource)
}

/**
 * Favorites are user specific, hence the favorite state of the resources currently
 * loaded only ever needs to be updated for the user receiving the event. While on the
 * favorites view the resource additionally needs to be added to or removed from the list.
 */
async function applyFavoriteState(
  { sseData, resourcesStore, spacesStore, clientService, router }: SSEEventOptions,
  starred: boolean
) {
  if (sseData.initiatorid === clientService.initiatorId) {
    // If initiated by current client (browser tab), action unnecessary. Web manages its own logic, return early.
    return
  }

  if (isLocationCommonActive(router, 'files-common-favorites')) {
    if (!starred) {
      const resource = resourcesStore.resources.find((r) => r.id === sseData.itemid)

      if (!resource) {
        return
      }

      return resourcesStore.removeResources([resource])
    }

    const space = spacesStore.spaces.find((space) => space.id === sseData.spaceid)
    if (!space) {
      return
    }

    const resource = await clientService.webdav.getFileInfo(space, {
      path: '',
      fileId: sseData.itemid
    })

    if (!resource) {
      return
    }

    return resourcesStore.upsertResource(resource)
  }

  const currentFolder = resourcesStore.currentFolder
  if (currentFolder?.id === sseData.itemid) {
    resourcesStore.setCurrentFolder({ ...currentFolder, starred })
  }

  resourcesStore.updateResourceField({ id: sseData.itemid, field: 'starred', value: starred })
}

export const onSSEItemFavoriteAddedEvent = (options: SSEEventOptions) => {
  return applyFavoriteState(options, true)
}

export const onSSEItemFavoriteRemovedEvent = (options: SSEEventOptions) => {
  return applyFavoriteState(options, false)
}
