import { useUserStore } from '../piniaStores'
import {
  GraphSharePermission,
  isPersonalSpaceResource,
  Resource,
  SpaceResource
} from '@opencloud-eu/web-client'

export const useCanListVersions = () => {
  const userStore = useUserStore()

  /**
   * Checks if the versions of a resource can be listed.
   * Make sure that the graph permissions of the space are loaded before calling this function,
   * otherwise it might return false even if the user has the required permissions.
   */
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
