import { cloneStateObject } from '../../../helpers/store'
import { isSameResource } from '../../../helpers/resource'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { isLocationSpacesActive } from '../../../router'
import { dirname } from 'path'
import { createFileRouteOptions } from '../../../helpers'
import { computed, unref } from 'vue'
import { queryItemAsString } from '../../appDefaults'
import { useGetMatchingSpace } from '../../spaces'
import { useRouteQuery } from '../../router'
import { useClientService } from '../../clientService'
import { useRouter } from '../../router'
import { useGettext } from 'vue3-gettext'
import { ref } from 'vue'
import {
  useMessages,
  useModals,
  useSpacesStore,
  useConfigStore,
  useResourcesStore,
  Message
} from '../../piniaStores'
import { storeToRefs } from 'pinia'
import { useDeleteWorker } from '../../webWorkers'
import { useEventBus } from '../../eventBus'
import { useFileActionsUndoDelete } from '../files'
import { Key, Modifier, useKeyboardActions } from '../../keyboardActions'

export const useFileActionsDeleteResources = () => {
  const configStore = useConfigStore()
  const { showMessage, showErrorMessage } = useMessages()
  const router = useRouter()
  const language = useGettext()
  const { getMatchingSpace } = useGetMatchingSpace()
  const { $gettext, $ngettext } = language
  const clientService = useClientService()
  const { dispatchModal } = useModals()
  const spacesStore = useSpacesStore()
  const eventBus = useEventBus()
  const { bindKeyAction, removeKeyAction } = useKeyboardActions()
  const { startWorker } = useDeleteWorker({
    concurrentRequests: configStore.options.concurrentRequests.resourceBatchActions
  })

  const successMessage = ref<Message>()
  const { actions: undoActions } = useFileActionsUndoDelete({ deleteMessage: successMessage })

  const resourcesStore = useResourcesStore()
  const { currentFolder } = storeToRefs(resourcesStore)

  const resourcesToDelete = ref<Resource[]>([])

  const currentPageQuery = useRouteQuery('page', '1')
  const currentPage = computed(() => {
    return parseInt(queryItemAsString(unref(currentPageQuery)))
  })

  const itemsPerPageQuery = useRouteQuery('items-per-page', '1')
  const itemsPerPage = computed(() => {
    return parseInt(queryItemAsString(unref(itemsPerPageQuery)))
  })

  const resources = computed(() => {
    return cloneStateObject<Resource[]>(unref(resourcesToDelete))
  })

  const showSuccessMessage = ({
    space,
    filesToDelete,
    deletedFiles
  }: {
    space: SpaceResource
    filesToDelete: Resource[]
    deletedFiles: Resource[]
  }) => {
    const title =
      deletedFiles.length === 1 && filesToDelete.length === 1
        ? $gettext('"%{item}" was moved to trash bin', { item: deletedFiles[0].name })
        : $ngettext(
            '%{itemCount} item was moved to trash bin',
            '%{itemCount} items were moved to trash bin',
            deletedFiles.length,
            { itemCount: deletedFiles.length.toString() },
            true
          )

    const messageTimeout = 7 // in seconds
    const undoAction = unref(undoActions)[0]
    const undoAvailable = undoAction.isVisible({ space, resources: deletedFiles })

    if (undoAvailable) {
      const keyActionId = bindKeyAction({ primary: Key.Z, modifier: Modifier.Ctrl }, () => {
        removeKeyAction(keyActionId)
        return undoAction.handler({ space, resources: deletedFiles })
      })
      setTimeout(() => removeKeyAction(keyActionId), messageTimeout * 1000)
    }

    successMessage.value = showMessage({
      title,
      timeout: messageTimeout,
      actions: [undoAction],
      actionOptions: { space, resources: deletedFiles }
    })
  }

  const dialogTitle = computed(() => {
    const currentResources = unref(resources)
    const isFolder = currentResources[0].type === 'folder'
    let title: string = null

    if (currentResources.length === 1) {
      if (isFolder) {
        title = $gettext(
          'Permanently delete folder »%{name}«',
          {
            name: currentResources[0].name
          },
          true
        )
      } else {
        title = $gettext(
          'Permanently delete file »%{name}«',
          {
            name: currentResources[0].name
          },
          true
        )
      }
      return title
    }

    return $ngettext(
      'Permanently delete selected resource?',
      'Permanently delete %{amount} selected resources?',
      currentResources.length,
      { amount: currentResources.length.toString() },
      false
    )
  })

  const dialogMessage = computed(() => {
    const currentResources = unref(resources)
    const isFolder = currentResources[0].type === 'folder'

    if (currentResources.length === 1) {
      if (isFolder) {
        return $gettext(
          'Are you sure you want to delete this folder? All its content will be permanently removed. This action cannot be undone.'
        )
      }
      return $gettext(
        'Are you sure you want to delete this file? All its content will be permanently removed. This action cannot be undone.'
      )
    }

    return $gettext(
      'Are you sure you want to delete all selected resources? All their content will be permanently removed. This action cannot be undone.'
    )
  })

  const trashbin_delete = (space: SpaceResource) => {
    const originalRoute = unref(router.currentRoute)

    startWorker(
      { topic: 'trashBinDelete', space, resources: unref(resources) },
      ({ successful, failed }) => {
        if (successful.length) {
          const title =
            successful.length === 1 && unref(resources).length === 1
              ? $gettext('"%{item}" was deleted successfully', { item: successful[0].name })
              : $ngettext(
                  '%{itemCount} item was deleted successfully',
                  '%{itemCount} items were deleted successfully',
                  successful.length,
                  { itemCount: successful.length.toString() },
                  true
                )

          showMessage({ title })
        }

        failed.forEach(({ resource }) => {
          const title = $gettext('Failed to delete "%{item}"', { item: resource.name })
          showErrorMessage({ title, errors: [new Error()] })
        })

        // user hasn't navigated to another location meanwhile
        if (
          originalRoute.name === unref(router.currentRoute).name &&
          originalRoute.query?.fileId === unref(router.currentRoute).query?.fileId
        ) {
          resourcesStore.removeResources(successful)
          resourcesStore.resetSelection()
        }
      }
    )
  }

  const filesList_delete = (resources: Resource[]) => {
    resourcesToDelete.value = [...resources]
    resourcesStore.addResourcesIntoDeleteQueue(unref(resourcesToDelete).map(({ id }) => id))
    unref(resourcesToDelete).forEach(({ id }) => resourcesStore.removeSelection(id))

    const resourceSpaceMapping = unref(resources).reduce<
      Record<string, { space: SpaceResource; resources: Resource[] }>
    >((acc, resource) => {
      if (resource.storageId in acc) {
        acc[resource.storageId].resources.push(resource)
        return acc
      }

      const matchingSpace = getMatchingSpace(resource)

      if (!(matchingSpace.id in acc)) {
        acc[matchingSpace.id] = { space: matchingSpace, resources: [] }
      }

      acc[matchingSpace.id].resources.push(resource)
      return acc
    }, {})

    const originalCurrentFolderId = unref(currentFolder)?.id

    return Object.values(resourceSpaceMapping).map(
      ({ space: spaceForDeletion, resources: resourcesForDeletion }) => {
        startWorker(
          { topic: 'fileListDelete', space: spaceForDeletion, resources: resourcesForDeletion },
          async ({ successful, failed }) => {
            if (successful.length) {
              showSuccessMessage({
                space: spaceForDeletion,
                filesToDelete: resourcesForDeletion,
                deletedFiles: successful
              })
              eventBus.publish('runtime.resource.deleted', successful)
            }

            resourcesStore.removeResourcesFromDeleteQueue(failed.map(({ resource }) => resource.id))
            resourcesStore.removeResourcesFromDeleteQueue(successful.map(({ id }) => id))

            failed.forEach(({ error, resource }) => {
              let title = $gettext('Failed to delete "%{resource}"', { resource: resource.name })
              if (error.statusCode === 423) {
                title = $gettext('Failed to delete "%{resource}" - the file is locked', {
                  resource: resource.name
                })
              }

              showErrorMessage({ title, errors: [error] })
            })

            // user hasn't navigated to another location meanwhile
            if (originalCurrentFolderId === unref(currentFolder)?.id) {
              resourcesStore.removeResources(successful)

              const activeFilesCount = resourcesStore.activeResources.length
              const pageCount = Math.ceil(unref(activeFilesCount) / unref(itemsPerPage))
              if (unref(currentPage) > 1 && unref(currentPage) > pageCount) {
                // reset pagination to avoid empty lists (happens when deleting all items on the last page)
                currentPageQuery.value = pageCount.toString()
              }
            }

            // Load quota
            if (
              isLocationSpacesActive(router, 'files-spaces-generic') &&
              !['public', 'share'].includes(spaceForDeletion?.driveType)
            ) {
              const graphClient = clientService.graphAuthenticated
              const updatedSpace = await graphClient.drives.getDrive(unref(resources)[0].storageId)
              spacesStore.updateSpaceField({
                id: updatedSpace.id,
                field: 'spaceQuota',
                value: updatedSpace.spaceQuota
              })
            }

            if (
              unref(resourcesToDelete).length &&
              isSameResource(unref(resourcesToDelete)[0], unref(currentFolder))
            ) {
              // current folder is being deleted
              return router.push(
                createFileRouteOptions(spaceForDeletion, {
                  path: dirname(unref(resourcesToDelete)[0].path),
                  fileId: unref(resourcesToDelete)[0].parentFolderId
                })
              )
            }
          }
        )
      }
    )
  }

  const displayDialog = (space: SpaceResource, resources: Resource[]) => {
    resourcesToDelete.value = [...resources]

    dispatchModal({
      title: unref(dialogTitle),
      message: unref(dialogMessage),
      confirmText: $gettext('Delete'),
      onConfirm: () => trashbin_delete(space)
    })
  }

  return {
    displayDialog,
    filesList_delete
  }
}
