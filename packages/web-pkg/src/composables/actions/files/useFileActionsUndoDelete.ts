import { computed, Ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { FileAction, FileActionOptions } from '../types'
import { useMessages, useResourcesStore } from '../../piniaStores'
import { useFileActionsRestore } from './useFileActionsRestore'
import { storeToRefs } from 'pinia'
import { Message, useCapabilityStore, useClientService } from '../../'
import { isPersonalSpaceResource, isProjectSpaceResource } from '@opencloud-eu/web-client'
import { isMacOs } from '../../../helpers'

export const useFileActionsUndoDelete = ({
  deleteMessage
}: {
  deleteMessage?: Ref<Message | undefined>
} = {}) => {
  const { $gettext } = useGettext()
  const { showErrorMessage, removeMessage } = useMessages()
  const { webdav } = useClientService()
  const capabilityStore = useCapabilityStore()
  const resourcesStore = useResourcesStore()
  const { currentFolder } = storeToRefs(resourcesStore)

  const { actions: restoreActions } = useFileActionsRestore({
    showSuccessMessage: false,
    onRestoreComplete: async ({ space, resources }) => {
      if (unref(currentFolder)?.id === resources[0].parentFolderId) {
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

  const undoDeleteHandler = async ({ space, resources }: FileActionOptions) => {
    const resourcesToRestore = resources.map((res) => ({
      ...res,
      id: transformToTrashId(res.id)
    }))

    try {
      const restoreAction = unref(restoreActions)[0]
      await restoreAction.handler({ space, resources: resourcesToRestore })
      if (unref(deleteMessage)) {
        removeMessage(unref(deleteMessage))
      }
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

  const actions = computed<FileAction[]>(() => {
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
        handler: ({ space, resources }) => undoDeleteHandler({ space, resources })
      }
    ]
  })

  return {
    actions
  }
}
