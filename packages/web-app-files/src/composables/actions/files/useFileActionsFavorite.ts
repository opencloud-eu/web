import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { isProjectSpaceResource } from '@opencloud-eu/web-client'
import {
  FileAction,
  FileActionOptions,
  SpaceActionOptions,
  isLocationCommonActive,
  isLocationSpacesActive,
  useAbility,
  useCapabilityStore,
  useClientService,
  useEventBus,
  useIsFilesAppActive,
  useMessages,
  useResourcesStore,
  useRouter
} from '@opencloud-eu/web-pkg'

export const useFileActionsFavorite = () => {
  const { showErrorMessage } = useMessages()
  const capabilityStore = useCapabilityStore()
  const router = useRouter()
  const { $gettext } = useGettext()
  const clientService = useClientService()
  const isFilesAppActive = useIsFilesAppActive()
  const ability = useAbility()
  const resourcesStore = useResourcesStore()
  const eventBus = useEventBus()

  const handler = async ({ resources }: FileActionOptions) => {
    const errors: { resource: string; error: unknown }[] = []

    for (const resource of resources) {
      const newValue = !resource.starred
      try {
        if (newValue) {
          await clientService.graphAuthenticated.driveItems.followDriveItem(resource.fileId)
        } else {
          await clientService.graphAuthenticated.driveItems.unfollowDriveItem(resource.fileId)
        }

        resourcesStore.updateResourceField({ id: resource.id, field: 'starred', value: newValue })
        if (!newValue) {
          eventBus.publish('app.files.list.removeFromFavorites', resource.id)
        }
      } catch (error) {
        resourcesStore.updateResourceField({
          id: resource.id,
          field: 'starred',
          value: !newValue
        })
        errors.push({ resource: resource.name, error })
      }
    }

    if (errors.length) {
      const title =
        errors.length === 1
          ? $gettext('Failed to change favorite state of "%{file}"', {
              file: errors[0].resource
            })
          : $gettext('Failed to change favorite state of %{count} items', {
              count: errors.length.toString()
            })
      showErrorMessage({ title, errors: errors.map((e) => e.error as Error) })
    }
  }

  const actions = computed((): FileAction[] => [
    {
      name: 'favorite',
      icon: ({ resources }: SpaceActionOptions) => {
        if (resources.every((r) => r.starred)) {
          return 'star-off'
        }
        return 'star'
      },
      handler,
      label: ({ resources }) => {
        if (resources.every((r) => r.starred)) {
          return $gettext('Remove from favorites')
        }
        return $gettext('Add to favorites')
      },
      isVisible: ({ resources }) => {
        // FIXME: remove this check once the backend exposes the favorite property via graph api for spaces
        if (resources.find((r) => isProjectSpaceResource(r))) {
          return false
        }

        if (
          unref(isFilesAppActive) &&
          !isLocationSpacesActive(router, 'files-spaces-projects') &&
          !isLocationSpacesActive(router, 'files-spaces-generic') &&
          !isLocationCommonActive(router, 'files-common-favorites') &&
          !isLocationCommonActive(router, 'files-common-search')
        ) {
          return false
        }
        if (resources.length === 0) {
          return false
        }

        if (resources.length > 1 && !resources.every((r) => r.starred === resources[0].starred)) {
          return false
        }

        return capabilityStore.filesFavorites && ability.can('create', 'Favorite')
      },
      class: 'oc-files-actions-favorite-trigger'
    }
  ])

  return {
    actions
  }
}
