import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useAbility } from '../ability'
import { useCapabilityStore, useUserStore } from '../piniaStores'
import { isProjectSpaceResource, isShareSpaceResource } from '@opencloud-eu/web-client'

export const useCanShare = () => {
  const capabilityStore = useCapabilityStore()
  const ability = useAbility()
  const userStore = useUserStore()

  const canShare = ({ space, resource }: { space: SpaceResource; resource: Resource }) => {
    if (!capabilityStore.sharingApiEnabled) {
      return false
    }

    if (isShareSpaceResource(space)) {
      return false
    }

    if (isProjectSpaceResource(space) && !space.canShare({ user: userStore.user })) {
      return false
    }

    return resource.canShare({ ability, user: userStore.user })
  }

  return { canShare }
}
