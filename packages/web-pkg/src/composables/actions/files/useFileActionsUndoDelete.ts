import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { Action, FileActionOptions } from '../types'
import { useExtensionRegistry, useMessages, useResourcesStore } from '../../piniaStores'
import { useFileActionsRestore } from './useFileActionsRestore'
import { storeToRefs } from 'pinia'
import { useCapabilityStore, useClientService } from '../../'
import { isPersonalSpaceResource, isProjectSpaceResource } from '@opencloud-eu/web-client'
import {
  decryptResourceInPlace,
  isItemInCurrentFolder,
  isMacOs,
  markVaultStatus,
  resolveFolderVault
} from '../../../helpers'
import { isLocationCommonActive } from '../../../router'
import { useRouter } from 'vue-router'

type UndoActionOptions = FileActionOptions & { callback?: () => void }

export const useFileActionsUndoDelete = () => {
  const { $gettext } = useGettext()
  const { showErrorMessage } = useMessages()
  const { webdav } = useClientService()
  const capabilityStore = useCapabilityStore()
  const resourcesStore = useResourcesStore()
  const { currentFolder } = storeToRefs(resourcesStore)
  const extensionRegistry = useExtensionRegistry()
  const router = useRouter()

  const { actions: restoreActions } = useFileActionsRestore({
    showSuccessMessage: false,
    onRestoreComplete: async ({ space, resources }) => {
      const isFavoritesLocation = isLocationCommonActive(router, 'files-common-favorites')

      if (isFavoritesLocation) {
        const { resources: children } = await webdav.search('is:favorite', {
          searchLimit: null
        })

        resourcesStore.upsertResources(
          children.filter(({ id }) => resources.some((s) => s.id === transformToTrashId(id)))
        )
        return
      }

      if (isItemInCurrentFolder({ resourcesStore, parentFolderId: resources[0].parentFolderId })) {
        // update local folder — vault-aware: when the current folder lives
        // in a vault, the post-restore listing comes back with encrypted
        // names and has to be decrypted before it can match the restored
        // resource ids and enter the store.
        const clearPath = unref(currentFolder).path
        const vaultEngine = resolveFolderVault(extensionRegistry, space, clearPath)
        const listPath = vaultEngine ? await vaultEngine.encryptPath(clearPath) : clearPath
        const { children } = await webdav.listFiles(space, { path: listPath })
        if (vaultEngine) {
          await Promise.all(children.map((c) => decryptResourceInPlace(vaultEngine, c)))
        }
        const restored = children.filter(({ id }) =>
          resources.some((s) => s.id === transformToTrashId(id))
        )
        markVaultStatus(extensionRegistry, space, restored)
        resourcesStore.upsertResources(restored)
      }
    }
  })

  const transformToTrashId = (id: string) => {
    // deleted files only have the "fileId" without the "storageId$driveId!" prefix
    return id.includes('!') ? id.split('!')[1] : id
  }

  const undoDeleteHandler = async ({ space, resources, callback }: UndoActionOptions) => {
    const resourcesToRestore = resources.map((res) => ({
      ...res,
      id: transformToTrashId(res.id)
    }))

    try {
      const restoreAction = unref(restoreActions)[0]
      await restoreAction.handler({ space, resources: resourcesToRestore })
      callback()
    } catch (e) {
      console.error(e)
      showErrorMessage({
        title: $gettext('Failed to restore files'),
        errors: [e]
      })
    }
  }

  const shortcutString = computed(() => {
    if (isMacOs()) {
      return $gettext('⌘ + Z')
    }
    return $gettext('Ctrl + Z')
  })

  const actions = computed<Action<UndoActionOptions>[]>(() => {
    return [
      {
        name: 'undoDelete',
        icon: 'arrow-go-back',
        shortcut: unref(shortcutString),
        isVisible: ({ space }) => {
          if (!capabilityStore.davTrashbin) {
            return false
          }
          return isProjectSpaceResource(space) || isPersonalSpaceResource(space)
        },
        label: () => $gettext('Undo'),
        handler: undoDeleteHandler
      }
    ]
  })

  return {
    actions
  }
}
