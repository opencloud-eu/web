import { useRouteParam } from '../router'
import { isIncomingShareResource, Resource, SpaceResource } from '@opencloud-eu/web-client'
import {
  isMountPointSpaceResource,
  ShareTypes,
  OCM_PROVIDER_ID,
  isShareResource
} from '@opencloud-eu/web-client'
import { computed, Ref, unref } from 'vue'
import { basename } from 'path'
import { useSpacesStore } from '../piniaStores'

type GetMatchingSpaceOptions = {
  space?: Ref<SpaceResource>
}

export const useGetMatchingSpace = (options?: GetMatchingSpaceOptions) => {
  const spacesStore = useSpacesStore()
  const spaces = computed(() => spacesStore.spaces)
  const driveAliasAndItem = useRouteParam('driveAliasAndItem')

  const getInternalSpace = (storageId: string): SpaceResource => {
    return unref(options?.space) || unref(spaces).find((space) => space.id === storageId)
  }

  const getMatchingSpace = (resource: Resource): SpaceResource => {
    let storageId = resource.storageId

    if (
      unref(driveAliasAndItem)?.startsWith('public/') ||
      unref(driveAliasAndItem)?.startsWith('ocm/')
    ) {
      storageId = unref(driveAliasAndItem).split('/')[1]
    }

    const space = getInternalSpace(storageId)

    if (space && !isMountPointSpaceResource(space)) {
      return space
    }

    const driveAliasPrefix =
      (isShareResource(resource) && resource.shareTypes.includes(ShareTypes.remote.value)) ||
      resource?.id?.toString().startsWith(OCM_PROVIDER_ID)
        ? 'ocm-share'
        : 'share'

    let shareName: string
    if (resource.remoteItemPath) {
      shareName = basename(resource.remoteItemPath)
    } else if (
      unref(driveAliasAndItem)?.startsWith('share/') ||
      unref(driveAliasAndItem)?.startsWith('ocm-share/')
    ) {
      shareName = unref(driveAliasAndItem).split('/')[1]
    } else {
      shareName = resource.name
    }

    return (
      spacesStore.getSpace(resource.remoteItemId) ||
      spacesStore.createShareSpace({
        driveAliasPrefix,
        id: resource.remoteItemId,
        shareName
      })
    )
  }

  const isPersonalSpaceRoot = (resource: Resource) => {
    return (
      resource?.storageId &&
      resource?.storageId === spacesStore.personalSpace?.storageId &&
      resource?.path === '/' &&
      !isIncomingShareResource(resource)
    )
  }

  return {
    getInternalSpace,
    getMatchingSpace,
    isPersonalSpaceRoot
  }
}
