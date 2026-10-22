import {
  buildIncomingShareResource,
  buildOutgoingShareResource,
  isShareSpaceResource,
  ShareTypes
} from '@opencloud-eu/web-client'
import {
  eventBus,
  isLocationGuestActive,
  isLocationGuestLinkActive,
  isLocationSharesActive,
  isLocationSpacesActive,
  isItemInCurrentFolder
} from '@opencloud-eu/web-pkg'
import { SSEEventOptions } from './types'
import { Router } from 'vue-router'

function isSharedWithMeActive(router: Router) {
  return (
    isLocationSharesActive(router, 'files-shares-with-me') ||
    isLocationGuestActive(router, 'files-guest-shares')
  )
}

function isSpaceFolderActive(router: Router) {
  return isLocationSpacesActive(router, 'files-spaces-generic') || isLocationGuestLinkActive(router)
}

// guests have no user, the server addresses them by the user id of their share permission
function isCurrentUserAffected({
  sseData,
  authStore,
  userStore
}: Pick<SSEEventOptions, 'sseData' | 'authStore' | 'userStore'>) {
  const userId = authStore.isGuestContext ? authStore.guestEmail : userStore.user?.id
  return !!userId && !!sseData.affecteduserids?.includes(userId)
}

// a share space is identified by its shared item. other spaces may contain multiple shares,
// so matching the storage id is only an approximation (e.g. members keep access via membership)
function isCurrentSpaceAffected({
  sseData,
  spacesStore,
  resourcesStore
}: Pick<SSEEventOptions, 'sseData' | 'spacesStore' | 'resourcesStore'>) {
  const { currentSpace } = spacesStore
  if (isShareSpaceResource(currentSpace)) {
    return currentSpace.id === sseData.itemid
  }
  return resourcesStore.currentFolder?.storageId === sseData.spaceid
}

export const onSSESpaceMemberAddedEvent = async ({
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

  const space = await clientService.graphAuthenticated.drives.getDrive(sseData.itemid)
  spacesStore.upsertSpace(space)
  await spacesStore.loadGraphPermissions({
    ids: [space.id],
    graphClient: clientService.graphAuthenticated,
    useCache: false
  })

  if (!isLocationSpacesActive(router, 'files-spaces-projects')) {
    return
  }

  resourcesStore.upsertResource(space)
}

export const onSSESpaceMemberRemovedEvent = async ({
  sseData,
  resourcesStore,
  spacesStore,
  messageStore,
  clientService,
  language,
  userStore,
  authStore,
  router
}: SSEEventOptions) => {
  if (sseData.initiatorid === clientService.initiatorId) {
    // If initiated by current client (browser tab), action unnecessary. Web manages its own logic, return early.
    return
  }

  if (!isCurrentUserAffected({ sseData, authStore, userStore })) {
    const space = await clientService.graphAuthenticated.drives.getDrive(sseData.itemid)
    spacesStore.upsertSpace(space)
    await spacesStore.loadGraphPermissions({
      ids: [space.id],
      graphClient: clientService.graphAuthenticated,
      useCache: false
    })
    return
  }

  const removedSpace = spacesStore.spaces.find((space) => space.id === sseData.spaceid)
  if (!removedSpace) {
    return
  }

  const { $gettext } = language

  spacesStore.removeSpace(removedSpace, { deleted: false })

  if (
    isLocationSpacesActive(router, 'files-spaces-generic') &&
    removedSpace.id === resourcesStore.currentFolder?.storageId
  ) {
    // Fixme: Message triggers when user membership was revoked, but still is in a group membership, which is wrong
    return messageStore.showMessage({
      title: $gettext(
        'Your access to this space has been revoked. Please navigate to another location.'
      )
    })
  }

  if (isLocationSpacesActive(router, 'files-spaces-projects')) {
    return resourcesStore.removeResources([removedSpace])
  }
}

export const onSSESpaceShareUpdatedEvent = async ({
  sseData,
  resourcesStore,
  spacesStore,
  clientService,
  userStore,
  authStore,
  router
}: SSEEventOptions) => {
  if (sseData.initiatorid === clientService.initiatorId) {
    // If initiated by current client (browser tab), action unnecessary. Web manages its own logic, return early.
    return
  }

  const space = await clientService.graphAuthenticated.drives.getDrive(sseData.itemid)
  spacesStore.upsertSpace(space)
  await spacesStore.loadGraphPermissions({
    ids: [space.id],
    graphClient: clientService.graphAuthenticated,
    useCache: false
  })

  if (
    isLocationSpacesActive(router, 'files-spaces-generic') &&
    isCurrentUserAffected({ sseData, authStore, userStore }) &&
    resourcesStore.currentFolder?.storageId === sseData.spaceid
  ) {
    return eventBus.publish('app.files.list.load')
  }
}

export const onSSEShareCreatedEvent = async ({
  sseData,
  resourcesStore,
  spacesStore,
  sharesStore,
  userStore,
  authStore,
  configStore,
  clientService,
  router
}: SSEEventOptions) => {
  if (sseData.initiatorid === clientService.initiatorId) {
    // If initiated by current client (browser tab), action unnecessary. Web manages its own logic, return early.
    return
  }

  if (
    isLocationSpacesActive(router, 'files-spaces-generic') &&
    isItemInCurrentFolder({
      resourcesStore,
      parentFolderId: sseData.parentitemid
    })
  ) {
    const space = spacesStore.spaces.find((space) => space.id === sseData.spaceid)
    if (!space) {
      return
    }

    const resource = await clientService.webdav.getFileInfo(space, {
      path: '',
      fileId: sseData.itemid
    })

    resourcesStore.upsertResource(resource)
  }

  if (isSharedWithMeActive(router) && isCurrentUserAffected({ sseData, authStore, userStore })) {
    // FIXME: get drive item by id as soon as server supports it
    const driveItems = await clientService.graphAuthenticated.driveItems.listSharedWithMe({
      expand: new Set(['thumbnails'])
    })
    const driveItem = driveItems.find(({ remoteItem }) => remoteItem.id === sseData.itemid)
    if (!driveItem) {
      return
    }
    const resource = buildIncomingShareResource({
      driveItem,
      graphRoles: sharesStore.graphRoles,
      serverUrl: configStore.serverUrl
    })
    return resourcesStore.upsertResource(resource)
  }

  if (isLocationSharesActive(router, 'files-shares-with-others')) {
    // FIXME: get drive item by id as soon as server supports it
    const driveItems = await clientService.graphAuthenticated.driveItems.listSharedByMe({
      expand: new Set(['thumbnails'])
    })
    const driveItem = driveItems.find(({ id }) => id === sseData.itemid)
    if (!driveItem) {
      return
    }
    const resource = buildOutgoingShareResource({
      driveItem,
      user: userStore.user,
      serverUrl: configStore.serverUrl
    })
    return resourcesStore.upsertResource(resource)
  }
}
export const onSSEShareUpdatedEvent = async ({
  sseData,
  resourcesStore,
  spacesStore,
  sharesStore,
  clientService,
  userStore,
  authStore,
  configStore,
  router
}: SSEEventOptions) => {
  if (sseData.initiatorid === clientService.initiatorId) {
    // If initiated by current client (browser tab), action unnecessary. Web manages its own logic, return early.
    return
  }

  if (!isCurrentUserAffected({ sseData, authStore, userStore })) {
    return
  }

  // the space loader only derives the permissions of a share space if they are unset
  spacesStore.updateSpaceField({ id: sseData.itemid, field: 'graphPermissions', value: undefined })

  if (
    isSpaceFolderActive(router) &&
    isCurrentSpaceAffected({ sseData, spacesStore, resourcesStore })
  ) {
    return eventBus.publish('app.files.list.load')
  }

  if (isSharedWithMeActive(router)) {
    // FIXME: get drive item by id as soon as server supports it
    const driveItems = await clientService.graphAuthenticated.driveItems.listSharedWithMe({
      expand: new Set(['thumbnails'])
    })
    const driveItem = driveItems.find(({ remoteItem }) => remoteItem.id === sseData.itemid)
    if (!driveItem) {
      return
    }
    const resource = buildIncomingShareResource({
      driveItem,
      graphRoles: sharesStore.graphRoles,
      serverUrl: configStore.serverUrl
    })
    return resourcesStore.upsertResource(resource)
  }
}

export const onSSEShareRemovedEvent = async ({
  sseData,
  resourcesStore,
  spacesStore,
  userStore,
  authStore,
  clientService,
  messageStore,
  language,
  router
}: SSEEventOptions) => {
  if (sseData.initiatorid === clientService.initiatorId) {
    // If initiated by current client (browser tab), action unnecessary. Web manages its own logic, return early.
    return
  }
  const { $gettext } = language
  const isAffected = isCurrentUserAffected({ sseData, authStore, userStore })

  if (
    isSpaceFolderActive(router) &&
    isAffected &&
    isCurrentSpaceAffected({ sseData, spacesStore, resourcesStore })
  ) {
    // Fixme: Message triggers when user share was revoked, but still is in a group share, which is wrong
    return messageStore.showMessage({
      title: $gettext(
        'Your access to this share has been revoked. Please navigate to another location.'
      )
    })
  }

  if (
    isLocationSpacesActive(router, 'files-spaces-generic') &&
    isItemInCurrentFolder({
      resourcesStore,
      parentFolderId: sseData.parentitemid
    })
  ) {
    const space = spacesStore.spaces.find((space) => space.id === sseData.spaceid)
    if (!space) {
      return
    }

    const resource = await clientService.webdav.getFileInfo(space, {
      path: '',
      fileId: sseData.itemid
    })

    resourcesStore.upsertResource(resource)
  }

  if (isLocationSharesActive(router, 'files-shares-with-others')) {
    const space = spacesStore.spaces.find((space) => space.id === sseData.spaceid)
    if (!space) {
      return
    }

    const resource = await clientService.webdav.getFileInfo(space, {
      path: '',
      fileId: sseData.itemid
    })

    if (
      !resource.shareTypes.includes(ShareTypes.user.value) &&
      !resource.shareTypes.includes(ShareTypes.group.value)
    ) {
      return resourcesStore.removeResources([resource])
    }
  }

  if (isSharedWithMeActive(router) && isAffected) {
    const removedShareResource = resourcesStore.resources.find((r) => r.fileId === sseData.itemid)
    if (!removedShareResource) {
      return
    }
    return resourcesStore.removeResources([removedShareResource])
  }
}

export const onSSELinkCreatedEvent = async ({
  sseData,
  resourcesStore,
  spacesStore,
  userStore,
  configStore,
  clientService,
  router
}: SSEEventOptions) => {
  if (sseData.initiatorid === clientService.initiatorId) {
    // If initiated by current client (browser tab), action unnecessary. Web manages its own logic, return early.
    return
  }

  if (
    isLocationSpacesActive(router, 'files-spaces-generic') &&
    isItemInCurrentFolder({
      resourcesStore,
      parentFolderId: sseData.parentitemid
    })
  ) {
    const space = spacesStore.spaces.find((space) => space.id === sseData.spaceid)
    if (!space) {
      return
    }

    const resource = await clientService.webdav.getFileInfo(space, {
      path: '',
      fileId: sseData.itemid
    })

    resourcesStore.upsertResource(resource)
  }

  if (isLocationSharesActive(router, 'files-shares-via-link')) {
    // FIXME: get drive item by id as soon as server supports it
    const driveItems = await clientService.graphAuthenticated.driveItems.listSharedByMe({
      expand: new Set(['thumbnails'])
    })
    const driveItem = driveItems.find(({ id }) => id === sseData.itemid)
    if (!driveItem) {
      return
    }
    const resource = buildOutgoingShareResource({
      driveItem,
      user: userStore.user,
      serverUrl: configStore.serverUrl
    })
    return resourcesStore.upsertResource(resource)
  }
}

export const onSSELinkUpdatedEvent = ({ sseData, clientService }: SSEEventOptions) => {
  if (sseData.initiatorid === clientService.initiatorId) {
    // If initiated by current client (browser tab), action unnecessary. Web manages its own logic, return early.
    return
  }
}

export const onSSELinkRemovedEvent = async ({
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

  const space = spacesStore.spaces.find((space) => space.id === sseData.spaceid)
  if (!space) {
    return
  }

  const resource = await clientService.webdav.getFileInfo(space, {
    path: '',
    fileId: sseData.itemid
  })

  if (
    isLocationSpacesActive(router, 'files-spaces-generic') &&
    isItemInCurrentFolder({
      resourcesStore,
      parentFolderId: sseData.parentitemid
    })
  ) {
    resourcesStore.upsertResource(resource)
  }

  if (isLocationSharesActive(router, 'files-shares-via-link')) {
    if (!resource.shareTypes.includes(ShareTypes.link.value)) {
      return resourcesStore.removeResources([resource])
    }
  }
}
