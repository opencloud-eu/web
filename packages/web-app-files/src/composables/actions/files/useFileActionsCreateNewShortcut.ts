import { computed, Ref, unref } from 'vue'
import { FileAction, useModals, useResourcesStore } from '@opencloud-eu/web-pkg'
import { CreateShortcutModal } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'
import { SpaceResource } from '@opencloud-eu/web-client'

export const useFileActionsCreateNewShortcut = ({ space }: { space?: Ref<SpaceResource> } = {}) => {
  const { dispatchModal } = useModals()
  const { $gettext } = useGettext()

  const resourcesStore = useResourcesStore()
  const { currentFolder } = storeToRefs(resourcesStore)

  const actions = computed((): FileAction[] => {
    return [
      {
        name: 'create-shortcut',
        icon: 'external-link',
        handler: () => {
          dispatchModal({
            title: $gettext('Create a Shortcut'),
            confirmText: $gettext('Create'),
            customComponent: CreateShortcutModal,
            customComponentAttrs: () => ({ space: unref(space) })
          })
        },
        label: () => {
          return $gettext('New Shortcut')
        },
        isVisible: () => {
          return unref(currentFolder)?.canCreate()
        },
        class: 'oc-files-actions-create-new-shortcut'
      }
    ]
  })

  return {
    actions
  }
}
