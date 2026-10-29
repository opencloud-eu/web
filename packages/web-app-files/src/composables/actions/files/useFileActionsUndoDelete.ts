import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { Action, FileActionOptions } from '@opencloud-eu/web-pkg'
import {
  useMessages,
  useResourcesStore,
  useCapabilityStore,
  useClientService,
  isLocationCommonActive,
  isItemInCurrentFolder,
  isMacOs,
  useRouter,
  useExtensionRegistry,
  resolveVaultEngine,
  decryptVaultPath
} from '@opencloud-eu/web-pkg'
import { useFileActionsRestore } from './useFileActionsRestore'
import { storeToRefs } from 'pinia'
import { isPersonalSpaceResource, isProjectSpaceResource, Resource } from '@opencloud-eu/web-client'

type UndoActionOptions = FileActionOptions & { callback?: () => void }

export const useFileActionsUndoDelete = () => {
  const { $gettext } = useGettext()
  const { showErrorMessage } = useMessages()
  const { webdav } = useClientService()
  const capabilityStore = useCapabilityStore()
  const resourcesStore = useResourcesStore()
  const { currentFolder } = storeToRefs(resourcesStore)
  const router = useRouter()
  const extensionRegistry = useExtensionRegistry()

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
        // update local folder
        const { children } = await webdav.listFiles(space, { path: unref(currentFolder).path })
        resourcesStore.upsertResources(
          children.filter(({ id }) => resources.some((s) => s.id === transformToTrashId(id)))
        )
      }
    }
  })

  const transformToTrashId = (id: string) => {
    // deleted files only have the "fileId" without the "storageId$driveId!" prefix
    return id.includes('!') ? id.split('!')[1] : id
  }

  const undoDeleteHandler = async ({ space, resources, callback }: UndoActionOptions) => {
    try {
      // resources carry server (encrypted) vault paths. restore expects cleartext for unlocked
      // vaults and re-encrypts them, so only decrypt if the vault is unlocked by now.
      const resourcesToRestore = await Promise.all(
        resources.map(async (res) => {
          const resource = { ...res, id: transformToTrashId(res.id) } as Resource
          const engine = await resolveVaultEngine(extensionRegistry, space, resource.path)
          if (engine) {
            resource.path = await decryptVaultPath(engine, resource.path)
          }
          return resource
        })
      )

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
