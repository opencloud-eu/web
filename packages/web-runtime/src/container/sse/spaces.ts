import { SSEEventOptions } from './types'
import { createLocationSpaces, isLocationSpacesActive } from '@opencloud-eu/web-pkg'
import { SpaceResource } from '@opencloud-eu/web-client'

function leaveSpace(
  { sseData, resourcesStore, spacesStore, messageStore, router }: SSEEventOptions,
  getMessage: (space: SpaceResource) => string
) {
  const space = spacesStore.getSpace(sseData.spaceid)
  if (
    !space ||
    !isLocationSpacesActive(router, 'files-spaces-generic') ||
    resourcesStore.currentFolder?.storageId !== space.id
  ) {
    return
  }

  messageStore.showMessage({ title: getMessage(space) })
  return router.push(createLocationSpaces('files-spaces-projects'))
}

function removeSpace({ sseData, resourcesStore, spacesStore, router }: SSEEventOptions) {
  const space = spacesStore.getSpace(sseData.spaceid)
  if (!space) {
    return
  }

  spacesStore.removeSpace(space)

  if (!isLocationSpacesActive(router, 'files-spaces-projects')) {
    return
  }

  resourcesStore.removeResources([space])
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

  // nobody can browse a disabled space, not even its managers
  await leaveSpace(options, ({ name }) =>
    language.$gettext('Space »%{space}« has been disabled', { space: name })
  )

  let space: SpaceResource
  try {
    space = await clientService.graphAuthenticated.drives.getDrive(sseData.spaceid)
  } catch (error) {
    // members who aren't managers can't read a disabled space anymore
    if ([403, 404].includes(error?.response?.status)) {
      return removeSpace(options)
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
    return
  }

  resourcesStore.upsertResource(space)
}

export const onSSESpaceDeletedEvent = (options: SSEEventOptions) => {
  const { sseData, clientService, language } = options
  if (sseData.initiatorid === clientService.initiatorId) {
    // If initiated by current client (browser tab), action unnecessary. Web manages its own logic, return early.
    return
  }

  leaveSpace(options, ({ name }) =>
    language.$gettext('Space »%{space}« has been deleted', { space: name })
  )
  removeSpace(options)
}
