import {
  buildIncomingShareResource,
  buildOutgoingShareResource,
  isShareSpaceResource,
  ShareTypes,
  SpaceResource
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

async function getSharedWithMeDriveItem({
  sseData,
  clientService
}: Pick<SSEEventOptions, 'sseData' | 'clientService'>) {
  // FIXME: get drive item by id as soon as server supports it
  const driveItems = await clientService.graphAuthenticated.driveItems.listSharedWithMe({
    expand: new Set(['thumbnails'])
  })
  return driveItems.find(({ remoteItem }) => remoteItem?.id === sseData.itemid)
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

// resolves to undefined if the current user can't access the space anymore. fetching the single drive
// isn't enough because it ignores the membership for users who are allowed to list all spaces
async function getRemainingSpace({
  id,
  clientService
}: { id: string } & Pick<SSEEventOptions, 'clientService'>) {
  try {
    const [space] = await clientService.graphAuthenticated.drives.listMyDrives({
      filter: `id eq '${id}'`
    })
    return space
  } catch {
    return undefined
  }
}

async function upsertSpaceWithPermissions({
  space,
  spacesStore,
  clientService
}: { space: SpaceResource } & Pick<SSEEventOptions, 'spacesStore' | 'clientService'>) {
  spacesStore.upsertSpace(space)
  await spacesStore.loadGraphPermissions({
    ids: [space.id],
    graphClient: clientService.graphAuthenticated,
    useCache: false
  })
}

async function hasAccessToCurrentFolder({
  spacesStore,
  resourcesStore,
  clientService
}: Pick<SSEEventOptions, 'spacesStore' | 'resourcesStore' | 'clientService'>) {
  const { currentSpace } = spacesStore
  const { currentFolder } = resourcesStore
  if (!currentSpace || !currentFolder) {
    return false
  }

  try {
    await clientService.webdav.getFileInfo(currentSpace, { path: currentFolder.path })
    return true
  } catch {
    return false
  }
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
  await upsertSpaceWithPermissions({ space, spacesStore, clientService })

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
    await upsertSpaceWithPermissions({ space, spacesStore, clientService })
    return
  }

  const removedSpace = spacesStore.spaces.find((space) => space.id === sseData.spaceid)
  if (!removedSpace) {
    return
  }

  // the user may still have access to the space, e.g. via a group membership
  const space = await getRemainingSpace({ id: sseData.itemid, clientService })
  const isInRemovedSpace =
    isLocationSpacesActive(router, 'files-spaces-generic') &&
    removedSpace.id === resourcesStore.currentFolder?.storageId

  if (space) {
    await upsertSpaceWithPermissions({ space, spacesStore, clientService })

    if (isInRemovedSpace) {
      // the role might have changed
      eventBus.publish('app.files.list.load')
    }
    return
  }

  const { $gettext } = language

  spacesStore.removeSpace(removedSpace, { deleted: false })

  if (isInRemovedSpace) {
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
  await upsertSpaceWithPermissions({ space, spacesStore, clientService })

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
  sharesStore,
  userStore,
  authStore,
  configStore,
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
    // the user may still have access, e.g. through a group share of the same item
    if (await hasAccessToCurrentFolder({ spacesStore, resourcesStore, clientService })) {
      return
    }

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

  if (isSharedWithMeActive(router)) {
    const removedShareResource = resourcesStore.resources.find((r) => r.fileId === sseData.itemid)
    if (!removedShareResource) {
      return
    }
    // the user may still have access through another share of the same item, e.g. a group share
    const driveItem = await getSharedWithMeDriveItem({ sseData, clientService })
    if (!driveItem) {
      return resourcesStore.removeResources([removedShareResource])
    }
    // the remaining share may come with a different role
    const resource = buildIncomingShareResource({
      driveItem,
      graphRoles: sharesStore.graphRoles,
      serverUrl: configStore.serverUrl
    })
    return resourcesStore.upsertResource(resource)
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
