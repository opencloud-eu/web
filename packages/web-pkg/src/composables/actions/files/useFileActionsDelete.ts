import { useFileActionsDeleteResources } from '../helpers'
import {
  isIncomingShareResource,
  isProjectSpaceResource,
  isSpaceResource,
  isTrashResource
} from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'
import { FileAction } from '../types'
import { computed } from 'vue'
import { useUserStore, useCapabilityStore } from '../../piniaStores'

export const useFileActionsDelete = () => {
  const userStore = useUserStore()
  const capabilityStore = useCapabilityStore()
  const { displayDialog, filesList_delete } = useFileActionsDeleteResources()

  const { $gettext } = useGettext()

  const actions = computed((): FileAction[] => [
    {
      name: 'delete',
      icon: 'delete-bin-5',
      label: () => $gettext('Delete'),
      handler: ({ resources }) => {
        filesList_delete(resources)
      },
      isVisible: ({ resources }) => {
        return resources.every(
          (r) =>
            r.canBeDeleted() &&
            !isSpaceResource(r) &&
            !isIncomingShareResource(r) &&
            !isTrashResource(r) &&
            !r.isShareRoot() // shared root folders on the search result page
        )
      },
      isDisabled: ({ resources }) => {
        return resources.length === 1 && resources[0].locked
      },
      disabledTooltip: () => $gettext("File can't be deleted because it is currently locked."),
      class: 'oc-files-actions-delete-trigger'
    },
    {
      // this menu item is ONLY for the trashbin (permanently delete a file/folder)
      name: 'delete-permanent',
      icon: 'delete-bin-5',
      label: () => $gettext('Delete'),
      handler: ({ space, resources }) => {
        displayDialog(space, resources)
      },
      isVisible: ({ space, resources }) => {
        if (!capabilityStore.filesPermanentDeletion) {
          return false
        }

        if (
          isProjectSpaceResource(space) &&
          !space.canDeleteFromTrashBin({ user: userStore.user })
        ) {
          return false
        }

        return resources.every(isTrashResource)
      },
      class: 'oc-files-actions-delete-permanent-trigger'
    }
  ])

  return {
    actions
  }
}
