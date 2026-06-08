import {
  Resource,
  SpaceResource,
  isShareSpaceResource,
  isProjectSpaceResource
} from '@opencloud-eu/web-client'
import { storeToRefs } from 'pinia'
import { dirname } from 'path'
import { computed, markRaw, ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  canBeMoved,
  FileAction,
  FileActionOptions,
  LocationPickerModal,
  ResourceTransfer,
  TransferType,
  isLocationCommonActive,
  isLocationPublicActive,
  isLocationSpacesActive,
  useClientService,
  useFolderLink,
  useGetMatchingSpace,
  useMessages,
  useModals,
  usePasteWorker,
  useResourcesStore,
  useRouter
} from '@opencloud-eu/web-pkg'

export const useFileActionsMove = () => {
  const router = useRouter()
  const clientService = useClientService()
  const { getMatchingSpace } = useGetMatchingSpace()
  const { $gettext, $ngettext } = useGettext()
  const { dispatchModal } = useModals()
  const { showMessage } = useMessages()
  const { startWorker } = usePasteWorker()
  const resourcesStore = useResourcesStore()
  const { currentFolder } = storeToRefs(resourcesStore)
  const { getParentFolderLink } = useFolderLink()

  const moveSelectedFiles = async ({
    targetSpace,
    targetFolder,
    sourceSpace,
    resources
  }: {
    targetSpace: SpaceResource
    targetFolder: Resource
    sourceSpace: SpaceResource
    resources: Resource[]
  }) => {
    const targetFolderRef = ref(targetFolder)
    const resourceTransfer = new ResourceTransfer(
      sourceSpace,
      resources,
      targetSpace,
      targetFolder,
      targetFolderRef,
      clientService,
      $gettext,
      $ngettext
    )

    const transferData = await resourceTransfer.getTransferData(TransferType.MOVE)
    if (!transferData.length) {
      return
    }
    // effectiveTransferType will be copy, when we want to move cross-space
    const effectiveTransferType = transferData[0].transferType
    const originalCurrentFolderId = unref(currentFolder)?.id

    startWorker(transferData, async ({ successful, failed }) => {
      resourceTransfer.showResultMessage(failed, successful, effectiveTransferType)

      if (!successful.length) {
        return
      }

      if (unref(currentFolder) && originalCurrentFolderId !== unref(currentFolder).id) {
        return
      }

      resourcesStore.resetSelection()

      const shouldRemoveResourcesFromView =
        effectiveTransferType === TransferType.MOVE &&
        !isLocationCommonActive(router, 'files-common-favorites') &&
        !isLocationCommonActive(router, 'files-common-search')

      if (shouldRemoveResourcesFromView) {
        resourcesStore.removeResources(successful)
        return
      }

      const loadingResources: Promise<void>[] = []
      const fetchedResources: Resource[] = []

      for (const resource of successful) {
        loadingResources.push(
          (async () => {
            const movedResource = await clientService.webdav.getFileInfo(targetSpace, resource)
            fetchedResources.push(movedResource)
          })()
        )
      }

      await Promise.allSettled(loadingResources)

      if (isShareSpaceResource(targetSpace)) {
        fetchedResources.forEach((resource) => {
          resource.remoteItemId = targetSpace.id
        })
      }

      const isDestinationActiveFolder = unref(currentFolder)?.id === targetFolder.id
      fetchedResources.forEach((resource) => {
        const isResourceInCurrentList = resourcesStore.resources.some(
          (existingResource) => existingResource.id === resource.id
        )

        if (!isResourceInCurrentList && !isDestinationActiveFolder) {
          return
        }

        resourcesStore.upsertResource(resource)
      })
    })
  }

  const onLocationPicked = async ({
    sourceResources,
    targetResources
  }: {
    sourceResources: Resource[]
    targetResources: Resource[]
  }) => {
    const targetFolder = targetResources[0]

    if (!targetFolder) {
      return
    }

    const targetSpace = isProjectSpaceResource(targetFolder)
      ? targetFolder
      : getMatchingSpace(targetFolder)

    const movableResources = sourceResources.filter((resource) => {
      const sourceSpace = getMatchingSpace(resource)
      return sourceSpace.id !== targetSpace.id || dirname(resource.path) !== targetFolder.path
    })

    if (!movableResources.length) {
      showMessage({
        title: $gettext('You cannot move resources into the same folder.')
      })
      return
    }

    const resourceSpaceMapping = movableResources.reduce<
      Record<string, { space: SpaceResource; resources: Resource[] }>
    >((acc, resource) => {
      if (resource.storageId in acc) {
        acc[resource.storageId].resources.push(resource)
        return acc
      }

      const sourceSpace = getMatchingSpace(resource)

      if (!(sourceSpace.id in acc)) {
        acc[sourceSpace.id] = { space: sourceSpace, resources: [] }
      }

      acc[sourceSpace.id].resources.push(resource)
      return acc
    }, {})

    const promises = Object.values(resourceSpaceMapping).map(({ space: sourceSpace, resources }) =>
      moveSelectedFiles({ targetSpace, targetFolder, sourceSpace, resources })
    )
    await Promise.all(promises)
  }

  const handler = ({ resources }: FileActionOptions) => {
    if (!resources.length) {
      return
    }

    resourcesStore.setSelection(resources.map(({ id }) => id))
    const parentFolderLink = getParentFolderLink(resources[0])

    dispatchModal({
      elementClass: 'location-picker-modal',
      title: $gettext('Move to'),
      customComponent: markRaw(LocationPickerModal),
      hideActions: true,
      customComponentAttrs: () => ({
        submitButtonTitle: $gettext('Move here'),
        parentFolderLink,
        callbackFn: (targetResources: Resource[]) =>
          onLocationPicked({ sourceResources: resources, targetResources })
      }),
      focusTrapInitial: false
    })
  }

  const actions = computed((): FileAction[] => [
    {
      name: 'move',
      icon: 'folder-transfer',
      handler,
      label: () => $gettext('Move to'),
      isVisible: ({ resources }) => {
        if (
          !isLocationSpacesActive(router, 'files-spaces-generic') &&
          !isLocationPublicActive(router, 'files-public-link') &&
          !isLocationCommonActive(router, 'files-common-favorites') &&
          !isLocationCommonActive(router, 'files-common-search')
        ) {
          return false
        }
        if (resources.length === 0) {
          return false
        }

        if (resources.length === 1 && resources[0].locked) {
          return false
        }

        // Moving a vault entry would either expose ciphertext outside the
        // vault (cross-vault move) or rename the encrypted blob in a way
        // the client can't replay against rclone-crypt's path-derived
        // encryption. Hide the action for any vault resource.
        if (resources.some((r) => r.isInVault)) {
          return false
        }

        const moveDisabled = resources.some((resource) => {
          return canBeMoved(resource, unref(currentFolder)?.path) === false
        })
        return !moveDisabled
      },
      class: 'oc-files-actions-move-trigger'
    }
  ])

  return {
    actions
  }
}
