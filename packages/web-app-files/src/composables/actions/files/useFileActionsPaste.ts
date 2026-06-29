import { storeToRefs } from 'pinia'
import { dirname } from 'path'
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
  isLocationPublicActive,
  isMacOs,
  useClientService,
  useClipboardStore,
  useGetMatchingSpace,
  useMessages,
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
  const { showMessage } = useMessages()
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
    let resourceSpaceMapping = clipboardStore.resources.reduce<
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

    if (unref(transferType) === TransferType.MOVE && unref(currentFolder)) {
      const targetFolderPath = unref(currentFolder).path
      resourceSpaceMapping = Object.fromEntries(
        Object.entries(resourceSpaceMapping)
          .map(([spaceId, entry]) => {
            const resources = entry.resources.filter((resource) => {
              return (
                entry.space.id !== targetSpace.id || dirname(resource.path) !== targetFolderPath
              )
            })
            return [spaceId, { ...entry, resources }] as const
          })
          .filter(([, entry]) => entry.resources.length > 0)
      )

      if (Object.keys(resourceSpaceMapping).length === 0) {
        showMessage({
          title: $gettext('You cannot cut and paste resources into the same folder.')
        })
        return
      }
    }

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

        if (isLocationPublicActive(router, 'files-public-link') && unref(currentFolder)) {
          return unref(currentFolder)?.canCreate()
        }

        // copy can't be restricted in authenticated context, because
        // a user always has their home dir with write access
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
        // Block both directions: pasting *into* a vault (target folder is
        // in vault) or pasting a vault-sourced clipboard *out* would
        // produce ciphertext where the user expects cleartext (or
        // vice-versa).
        if (unref(currentFolder)?.isInVault) {
          return true
        }
        if (clipboardStore.resources.some((r) => r.isInVault)) {
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
