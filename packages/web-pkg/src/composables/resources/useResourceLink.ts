import { computed, Ref, unref } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useGetMatchingSpace } from '../spaces'
import { useFileActions } from '../actions'
import { useFolderLink } from '../folderLink'
import { useAppsStore } from '../piniaStores'

export const useResourceLink = ({ space }: { space: Ref<SpaceResource> }) => {
  const appsStore = useAppsStore()
  const { getDefaultAction } = useFileActions()
  const { getFolderLink } = useFolderLink({ space })
  const { getMatchingSpace } = useGetMatchingSpace()

  const appFolderExtensions = computed(() => {
    return new Set(
      appsStore.fileExtensions
        .filter((e) => e.type === 'folder' && e.extension)
        .map((e) => e.extension.toLowerCase())
    )
  })

  const isAppFolder = (resource: Resource) => {
    return !!resource.extension && unref(appFolderExtensions).has(resource.extension.toLowerCase())
  }

  const getResourceLink = (resource: Resource) => {
    const isFolder = resource.isFolder || resource.type === 'folder'
    // the `getDefaultAction` call down below is quite expensive, so skip it for
    // plain folders. Folders claimed by an app (e.g. `.ocnb` notebooks) still
    // need it to resolve to the app's route instead of folder navigation.
    if (isFolder && !isAppFolder(resource)) {
      return getFolderLink(resource)
    }

    let matchingSpace = unref(space)
    if (!matchingSpace) {
      matchingSpace = getMatchingSpace(resource)
    }

    const action = getDefaultAction({ resources: [resource], space: matchingSpace })
    if (!action?.route) {
      return isFolder ? getFolderLink(resource) : undefined
    }

    return action.route({ space: matchingSpace, resources: [resource] })
  }

  return { getResourceLink }
}
