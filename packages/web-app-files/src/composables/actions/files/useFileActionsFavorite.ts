import { computed, unref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGettext } from 'vue3-gettext'
import {
  isIncomingShareResource,
  isProjectSpaceResource,
  isPublicSpaceResource,
  isSpaceResource,
  isTrashResource,
  Resource,
  ShareTypes
} from '@opencloud-eu/web-client'
import {
  FileAction,
  FileActionOptions,
  SpaceActionOptions,
  useAbility,
  useClientService,
  useEventBus,
  useMessages,
  useResourcesStore,
  useSpacesStore
} from '@opencloud-eu/web-pkg'

export const useFileActionsFavorite = () => {
  const { showErrorMessage } = useMessages()
  const { $gettext } = useGettext()
  const clientService = useClientService()
  const ability = useAbility()
  const resourcesStore = useResourcesStore()
  const { currentFolder } = storeToRefs(resourcesStore)
  const spacesStore = useSpacesStore()
  const eventBus = useEventBus()

  function updateStarred(resource: Resource, value: boolean) {
    resourcesStore.updateResourceField({ id: resource.id, field: 'starred', value })
    if (isSpaceResource(resource)) {
      spacesStore.updateSpaceField({ id: resource.id, field: 'starred', value })
    }
  }

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

        updateStarred(resource, newValue)
        if (!newValue) {
          eventBus.publish('app.files.list.removeFromFavorites', resource.id)
        }
      } catch (error) {
        updateStarred(resource, !newValue)
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
      isVisible: ({ space, resources }) => {
        if (resources.length === 0) {
          return false
        }

        // only project spaces can be favorites, not personal, share or public spaces
        if (
          resources.some((r) => isSpaceResource(r) && (!isProjectSpaceResource(r) || r.disabled))
        ) {
          return false
        }

        if (resources.some(isTrashResource)) {
          return false
        }

        if (isPublicSpaceResource(space)) {
          return false
        }

        // precaution: following federated shares from the share lists is unverified, hence not offered
        if (
          !unref(currentFolder) &&
          resources.some(
            (r) => isIncomingShareResource(r) && r.shareTypes?.includes(ShareTypes.remote.value)
          )
        ) {
          return false
        }

        if (resources.length > 1 && !resources.every((r) => r.starred === resources[0].starred)) {
          return false
        }

        // Favorites surface the resource name in the favorites view; for
        // a vault entry that name only makes sense while the vault is
        // unlocked. Hide the action to keep favorites consistent with the
        // rest of the UI's vault gating.
        if (resources.some((r) => r.isInVault)) {
          return false
        }

        return ability.can('create', 'Favorite')
      },
      class: 'oc-files-actions-favorite-trigger'
    }
  ])

  return {
    actions
  }
}
