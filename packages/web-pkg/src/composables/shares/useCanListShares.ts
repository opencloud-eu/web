import {
  GraphSharePermission,
  isIncomingShareResource,
  isPublicSpaceResource,
  isTrashResource,
  Resource,
  SpaceResource
} from '@opencloud-eu/web-client'
import { useCapabilityStore } from '../piniaStores'
import { isShareSpaceResource } from '@opencloud-eu/web-client'
import { useGetMatchingSpace } from '../spaces'

export const useCanListShares = () => {
  const capabilityStore = useCapabilityStore()
  const { isPersonalSpaceRoot } = useGetMatchingSpace()

  const canListShares = ({ space, resource }: { space: SpaceResource; resource: Resource }) => {
    if (!capabilityStore.sharingApiEnabled) {
      return false
    }
    if (isPublicSpaceResource(space)) {
      return false
    }
    if (isPersonalSpaceRoot(resource)) {
      return false
    }
    if (isTrashResource(resource)) {
      return false
    }
    if (isIncomingShareResource(resource)) {
      return resource.sharePermissions.includes(GraphSharePermission.readPermissions)
    }
    if (isShareSpaceResource(space)) {
      return space.graphPermissions?.includes(GraphSharePermission.readPermissions)
    }
    return true
  }

  return { canListShares }
}
