import { SSEEventOptions } from './types'
import { isLocationSpacesActive } from '@opencloud-eu/web-pkg'
import { SpaceResource } from '@opencloud-eu/web-client'

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
  const { sseData, resourcesStore, spacesStore, clientService, router } = options
  if (sseData.initiatorid === clientService.initiatorId) {
    // If initiated by current client (browser tab), action unnecessary. Web manages its own logic, return early.
    return
  }

  let space: SpaceResource
  try {
    space = await clientService.graphAuthenticated.drives.getDrive(sseData.spaceid)
  } catch (error) {
    // members who aren't managers can't read a disabled space anymore
    if ([403, 404].includes(error?.response?.status)) {
      return onSSESpaceDeletedEvent(options)
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

export const onSSESpaceDeletedEvent = ({
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
