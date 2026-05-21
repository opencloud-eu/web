import { storeToRefs } from 'pinia'
import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  Resource,
  SpaceResource,
  isPersonalSpaceResource,
  isProjectSpaceResource,
  isShareSpaceResource
} from '@opencloud-eu/web-client'
import {
  ClipboardActions,
  FileAction,
  FileActionOptions,
  ResourceTransfer,
  TransferType,
  isLocationTrashActive,
  isMacOs,
  useClientService,
  useClipboardStore,
  useGetMatchingSpace,
  usePasteWorker,
  useResourcesStore,
  useRouter,
  useUserStore
} from '@opencloud-eu/web-pkg'

export const useFileActionsPaste = () => {
  const router = useRouter()
  const clientService = useClientService()
  const { getMatchingSpace } = useGetMatchingSpace()
  const { $gettext, $ngettext } = useGettext()
  const clipboardStore = useClipboardStore()
  const { startWorker } = usePasteWorker()
  const userStore = useUserStore()

  const resourcesStore = useResourcesStore()
  const { currentFolder } = storeToRefs(resourcesStore)

  const pasteShortcutString = computed(() => {
    if (isMacOs()) {
      return $gettext('⌘ + V')
    }
    return $gettext('Ctrl + V')
  })

  const transferType = computed(() => {
    if (clipboardStore.action === ClipboardActions.Cut) {
      return TransferType.MOVE
    }

    return TransferType.COPY
  })

  const pasteSelectedFiles = async ({
    targetSpace,
    sourceSpace,
    resources
  }: {
    targetSpace: SpaceResource
    sourceSpace: SpaceResource
    resources: Resource[]
  }) => {
    const resourceTransfer = new ResourceTransfer(
      sourceSpace,
      resources,
      targetSpace,
      unref(currentFolder),
      currentFolder,
      clientService,
      $gettext,
      $ngettext
    )

    const transferData = await resourceTransfer.getTransferData(unref(transferType))
    if (!transferData.length) {
      return
    }

    const originalCurrentFolderId = unref(currentFolder)?.id

    startWorker(transferData, async ({ successful, failed }) => {
      resourceTransfer.showResultMessage(failed, successful, unref(transferType))

      if (!successful.length) {
        return
      }

      // user has navigated to another location meanwhile -> no need to update store
      if (unref(currentFolder) && originalCurrentFolderId !== unref(currentFolder).id) {
        return
      }

      // handle store update, fetch resources first
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

      // FIXME: move to buildResource as soon as it has space context
      if (isShareSpaceResource(targetSpace)) {
        fetchedResources.forEach((r) => {
          r.remoteItemId = targetSpace.id
        })
      }

      resourcesStore.upsertResources(fetchedResources)
    })
  }

  const handler = async ({ space: targetSpace }: FileActionOptions) => {
    const resourceSpaceMapping = clipboardStore.resources.reduce<
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

    const promises = Object.values(resourceSpaceMapping).map(
      ({ space: sourceSpace, resources: resourcesToCopy }) => {
        return pasteSelectedFiles({ targetSpace, sourceSpace, resources: resourcesToCopy })
      }
    )
    await Promise.all(promises)
    clipboardStore.clearClipboard()
  }

  const isMovingIntoSameFolder = computed(() => {
    if (clipboardStore.action === ClipboardActions.Copy) {
      return false
    }

    if (!clipboardStore.resources || clipboardStore.resources.length < 1) {
      return false
    }

    return !clipboardStore.resources.some(
      (resource) => resource.parentFolderId !== unref(currentFolder)?.id
    )
  })

  const actions = computed((): FileAction[] => [
    {
      name: 'paste',
      icon: 'clipboard',
      handler,
      label: () => $gettext('Paste'),
      shortcut: unref(pasteShortcutString),
      isVisible: ({ space }) => {
        if (clipboardStore.resources.length === 0) {
          return false
        }
        if (isLocationTrashActive(router, 'files-trash-generic')) {
          return false
        }

        return (
          isProjectSpaceResource(space) ||
          isPersonalSpaceResource(space) ||
          isShareSpaceResource(space)
        )
      },
      isDisabled: ({ space }) => {
        if (!space) {
          return true
        }
        return !space.canUpload({ user: userStore.user }) || unref(isMovingIntoSameFolder)
      },
      disabledTooltip: ({ space }) => {
        if (!space || !space.canUpload({ user: userStore.user })) {
          return $gettext('You have no permission to paste files here.')
        }

        if (unref(isMovingIntoSameFolder)) {
          return $gettext('You cannot cut and paste resources into the same folder.')
        }

        return ''
      },
      class: 'oc-files-actions-copy-trigger font-bold'
    }
  ])

  return {
    actions
  }
}
