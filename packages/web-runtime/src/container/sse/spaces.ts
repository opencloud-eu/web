import { SSEEventOptions } from './types'
import { createLocationSpaces, isLocationSpacesActive } from '@opencloud-eu/web-pkg'
import { SpaceResource } from '@opencloud-eu/web-client'

function removeSpace(options: SSEEventOptions, getMessage: (space: SpaceResource) => string) {
  const { sseData, resourcesStore, spacesStore, router } = options
  const space = spacesStore.getSpace(sseData.spaceid)

  if (!space) {
    return
  }

  spacesStore.removeSpace(space)

  if (isLocationSpacesActive(router, 'files-spaces-projects')) {
    resourcesStore.removeResources([space])
    return
  }

  return leaveSpace(options, space, getMessage)
}

function leaveSpace(
  { resourcesStore, messageStore, router }: SSEEventOptions,
  space: SpaceResource,
  getMessage: (space: SpaceResource) => string
) {
  if (
    !isLocationSpacesActive(router, 'files-spaces-generic') ||
    resourcesStore.currentFolder?.storageId !== space.id
  ) {
    return
  }

  messageStore.showMessage({ title: getMessage(space) })
  return router.push(createLocationSpaces('files-spaces-projects'))
}

export const onSSESpaceCreatedEvent = async ({
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

  const space = await clientService.graphAuthenticated.drives.getDrive(sseData.spaceid)
  spacesStore.upsertSpace(space)

  if (!isLocationSpacesActive(router, 'files-spaces-projects')) {
    return
  }

  resourcesStore.upsertResource(space)
}

export const onSSESpaceEnabledEvent = async ({
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

  const space = await clientService.graphAuthenticated.drives.getDrive(sseData.spaceid)
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

export const onSSESpaceDisabledEvent = async (options: SSEEventOptions) => {
  const { sseData, resourcesStore, spacesStore, clientService, router, language } = options
  if (sseData.initiatorid === clientService.initiatorId) {
    // If initiated by current client (browser tab), action unnecessary. Web manages its own logic, return early.
    return
  }

  function getMessage({ name }: SpaceResource) {
    return language.$gettext('Space »%{space}« has been disabled', { space: name })
  }

  let space: SpaceResource
  try {
    space = await clientService.graphAuthenticated.drives.getDrive(sseData.spaceid)
  } catch (error) {
    // members who aren't managers can't read a disabled space anymore
    if ([403, 404].includes(error?.response?.status)) {
      return removeSpace(options, getMessage)
    }
    throw error
  }
  spacesStore.upsertSpace(space)

  await spacesStore.loadGraphPermissions({
    ids: [space.id],
    graphClient: clientService.graphAuthenticated,
    useCache: false
  })

  if (!isLocationSpacesActive(router, 'files-spaces-projects')) {
    // managers keep the space, but can't browse its content while it's disabled
    return leaveSpace(options, space, getMessage)
  }

  resourcesStore.upsertResource(space)
}

export const onSSESpaceDeletedEvent = (options: SSEEventOptions) => {
  const { sseData, clientService, language } = options
  if (sseData.initiatorid === clientService.initiatorId) {
    // If initiated by current client (browser tab), action unnecessary. Web manages its own logic, return early.
    return
  }

  return removeSpace(options, ({ name }) =>
    language.$gettext('Space »%{space}« has been deleted', { space: name })
  )
}
