import {
  Resource,
  SpaceResource,
  isProjectSpaceResource,
  isShareSpaceResource
} from '@opencloud-eu/web-client'
import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'
import {
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
  useModals,
  usePasteWorker,
  useResourcesStore,
  useRouter
} from '@opencloud-eu/web-pkg'

export const useFileActionsCopy = () => {
  const router = useRouter()
  const clientService = useClientService()
  const { getMatchingSpace } = useGetMatchingSpace()
  const { getParentFolderLink } = useFolderLink()
  const { dispatchModal } = useModals()
  const { startWorker } = usePasteWorker()
  const { $gettext, $ngettext } = useGettext()
  const { resetSelection } = useResourcesStore()

  const resourcesStore = useResourcesStore()
  const { currentFolder } = storeToRefs(resourcesStore)

  const copySelectedFiles = async ({
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
    const targetFolderRef = computed(() => targetFolder)
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

    const transferData = await resourceTransfer.getTransferData(TransferType.COPY)
    if (!transferData.length) {
      return
    }

    const originalCurrentFolderId = unref(currentFolder)?.id

    startWorker(transferData, async ({ successful, failed }) => {
      resourceTransfer.showResultMessage(failed, successful, TransferType.COPY)

      if (!successful.length) {
        return
      }

      if (unref(currentFolder) && originalCurrentFolderId !== unref(currentFolder).id) {
        return
      }

      if (unref(currentFolder)?.id !== targetFolder.id) {
        return
      }

      const loadingResources: Promise<void>[] = []
      const fetchedResources: Resource[] = []

      for (const resource of successful) {
        loadingResources.push(
          (async () => {
            const copiedResource = await clientService.webdav.getFileInfo(targetSpace, resource)
            fetchedResources.push(copiedResource)
          })()
        )
      }

      await Promise.allSettled(loadingResources)

      if (isShareSpaceResource(targetSpace)) {
        fetchedResources.forEach((resource) => {
          resource.remoteItemId = targetSpace.id
        })
      }

      resourcesStore.upsertResources(fetchedResources)
    })
  }

  const onLocationPicked = async (targetResources: Resource[]) => {
    const targetFolder = targetResources[0]

    if (!targetFolder) {
      return
    }

    const targetSpace = getMatchingSpace(targetFolder)
    const resourcesToCopy = unref(resourcesStore.selectedResources)

    const resourceSpaceMapping = resourcesToCopy.reduce<
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

    resetSelection()

    const promises = Object.values(resourceSpaceMapping).map(({ space: sourceSpace, resources }) =>
      copySelectedFiles({ targetSpace, targetFolder, sourceSpace, resources })
    )
    await Promise.all(promises)
  }

  const handler = ({ resources }: FileActionOptions) => {
    if (isLocationCommonActive(router, 'files-common-search')) {
      resources = resources.filter((r) => !isProjectSpaceResource(r))
    }

    if (!resources.length) {
      return
    }

    resourcesStore.setSelection(resources.map(({ id }) => id))
    const parentFolderLink = getParentFolderLink(resources[0])

    dispatchModal({
      elementClass: 'location-picker-modal',
      title: $gettext('Copy to'),
      customComponent: LocationPickerModal,
      hideActions: true,
      customComponentAttrs: () => ({
        submitButtonTitle: $gettext('Copy here'),
        parentFolderLink,
        callbackFn: onLocationPicked
      }),
      focusTrapInitial: false
    })
  }

  const actions = computed((): FileAction[] => {
    return [
      {
        name: 'copy',
        icon: 'file-copy-2',
        handler,
        label: () => $gettext('Copy to'),
        isVisible: ({ resources }) => {
          if (
            !isLocationSpacesActive(router, 'files-spaces-generic') &&
            !isLocationPublicActive(router, 'files-public-link') &&
            !isLocationCommonActive(router, 'files-common-favorites') &&
            !isLocationCommonActive(router, 'files-common-search')
          ) {
            return false
          }
          if (isLocationSpacesActive(router, 'files-spaces-projects')) {
            return false
          }
          if (resources.length === 0) {
            return false
          }

          if (isLocationPublicActive(router, 'files-public-link')) {
            return unref(currentFolder)?.canCreate()
          }

          if (
            isLocationCommonActive(router, 'files-common-search') &&
            resources.some((r) => isProjectSpaceResource(r))
          ) {
            return false
          }

          if (!unref(resources)[0].canDownload()) {
            return false
          }
          // copy can't be restricted in authenticated context, because
          // a user always has their home dir with write access
          return true
        },
        class: 'oc-files-actions-copy-trigger'
      }
    ]
  })

  return {
    actions
  }
}
