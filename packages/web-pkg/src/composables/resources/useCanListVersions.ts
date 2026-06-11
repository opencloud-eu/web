import { useUserStore } from '../piniaStores'
import {
  GraphSharePermission,
  isPersonalSpaceResource,
  Resource,
  SpaceResource
} from '@opencloud-eu/web-client'

export const useCanListVersions = () => {
  const userStore = useUserStore()

  const canListVersions = ({ space, resource }: { space: SpaceResource; resource: Resource }) => {
    const spaceAllowsListingVersions =
      (isPersonalSpaceResource(space) && space.isOwner(userStore.user)) ||
      space.graphPermissions?.includes(GraphSharePermission.readVersions)

    return spaceAllowsListingVersions && resource.canListVersions?.({ user: userStore.user })
  }

  return {
    canListVersions
  }
}
