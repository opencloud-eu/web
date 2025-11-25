import { isSpaceResource, SpaceResource } from '@opencloud-eu/web-client'
import { computed } from 'vue'
import { useClientService } from '../../clientService'
import { useGettext } from 'vue3-gettext'
import { SpaceAction, SpaceActionOptions } from '../types'
import {
  useCapabilityStore,
  useMessages,
  useModals,
  useResourcesStore,
  useSpacesStore,
  useUserStore
} from '../../piniaStores'
import { useLoadingService } from '../../loadingService'

export const useFileActionsEmptyTrashBin = () => {
  const { showMessage, showErrorMessage } = useMessages()
  const userStore = useUserStore()
  const capabilityStore = useCapabilityStore()
  const { $gettext } = useGettext()
  const clientService = useClientService()
  const { dispatchModal } = useModals()
  const resourcesStore = useResourcesStore()
  const spacesStore = useSpacesStore()

  const loadingService = useLoadingService()

  const emptyTrashBin = async ({ space }: { space: SpaceResource }) => {
    try {
      await clientService.webdav.clearTrashBin(space)
      showMessage({ title: $gettext('All deleted files were removed') })
      resourcesStore.clearResources()
      resourcesStore.resetSelection()
      spacesStore.updateSpaceField({ id: space.id, field: 'hasTrashedItems', value: false })
    } catch (error) {
      console.error(error)
      showErrorMessage({
        title: $gettext('Failed to empty trash bin'),
        errors: [error]
      })
    }
  }

  const handler = ({ resources }: SpaceActionOptions) => {
    dispatchModal({
      title: $gettext('Empty trash bin for »%{name}«', { name: resources[0].name }),
      confirmText: $gettext('Delete'),
      message: $gettext(
        'Are you sure you want to permanently delete the items in »%{name}«? You can’t undo this action.',
        {
          name: resources[0].name
        }
      ),
      hasInput: false,
      onConfirm: () => loadingService.addTask(() => emptyTrashBin({ space: resources[0] }))
    })
  }

  const actions = computed((): SpaceAction[] => [
    {
      name: 'empty-trash-bin',
      icon: ({ resources }: SpaceActionOptions) => {
        return resources[0]?.hasTrashedItems ? 'delete-bin-2' : 'delete-bin-7'
      },
      label: () => $gettext('Empty trash bin'),
      handler,
      isVisible: ({ resources }) => {
        if (resources.length !== 1) {
          return false
        }

        if (!capabilityStore.filesPermanentDeletion) {
          return false
        }

        if (!isSpaceResource(resources[0])) {
          return false
        }

        return resources[0].canDeleteFromTrashBin({ user: userStore.user })
      },
      isDisabled: ({ resources }) => {
        return !resources[0].hasTrashedItems
      },
      class: 'oc-files-actions-empty-trash-bin-trigger'
    }
  ])

  return {
    actions,
    // HACK: exported for unit tests:
    emptyTrashBin
  }
}
