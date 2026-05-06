import { computed } from 'vue'
import {
  isPersonalSpaceResource,
  isProjectSpaceResource,
  SpaceResource
} from '@opencloud-eu/web-client'
import {
  SpaceAction,
  createFileRouteOptions,
  createLocationTrash,
  useRouter
} from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'

export const useSpaceActionsNavigateToTrash = () => {
  const router = useRouter()
  const { $gettext } = useGettext()

  const getTrashLink = (space: SpaceResource) => {
    return createLocationTrash('files-trash-generic', {
      ...createFileRouteOptions(space, { fileId: space.fileId })
    })
  }

  const actions = computed((): SpaceAction[] => [
    {
      name: 'navigateToTrash',
      icon: 'delete-bin-5',
      label: () => $gettext('Open trash bin'),
      handler: ({ resources }) => {
        router.push(getTrashLink(resources[0]))
      },
      isVisible: ({ resources }) => {
        if (resources.length !== 1) {
          return false
        }

        if (!isProjectSpaceResource(resources[0]) && !isPersonalSpaceResource(resources[0])) {
          return false
        }

        if (resources[0].disabled) {
          return false
        }

        return true
      },
      class: 'oc-files-actions-navigate-to-trash-trigger'
    }
  ])

  return {
    actions
  }
}
