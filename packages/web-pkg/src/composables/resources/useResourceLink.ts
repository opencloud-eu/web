import { Ref, unref } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useGetMatchingSpace } from '../spaces'
import { useFileActions } from '../actions'
import { useFolderLink } from '../folderLink'

export const useResourceLink = ({ space }: { space: Ref<SpaceResource> }) => {
  const { getDefaultAction } = useFileActions()
  const { getFolderLink } = useFolderLink({ space })
  const { getMatchingSpace } = useGetMatchingSpace()

  const getResourceLink = (resource: Resource) => {
    if (resource.isFolder || resource.type === 'folder') {
      // skip the `getDefaultAction` call down below for folders, which is quite expensive
      return getFolderLink(resource)
    }

    let matchingSpace = unref(space)
    if (!matchingSpace) {
      matchingSpace = getMatchingSpace(resource)
    }

    const action = getDefaultAction({ resources: [resource], space: matchingSpace })
    if (!action?.route) {
      return
    }

    return action.route({ space: matchingSpace, resources: [resource] })
  }

  return { getResourceLink }
}
