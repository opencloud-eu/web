import { storeToRefs } from 'pinia'
import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  CreateShortcutModal,
  FileAction,
  useModals,
  useResourcesStore,
  useSpacesStore
} from '@opencloud-eu/web-pkg'

export const useFileActionsCreateNewShortcut = () => {
  const { dispatchModal } = useModals()
  const { $gettext } = useGettext()

  const resourcesStore = useResourcesStore()
  const { currentFolder } = storeToRefs(resourcesStore)
  const spacesStore = useSpacesStore()
  const { currentSpace } = storeToRefs(spacesStore)

  const actions = computed((): FileAction[] => [
    {
      name: 'create-shortcut',
      icon: 'external-link',
      handler: () => {
        dispatchModal({
          title: $gettext('Create a Shortcut'),
          confirmText: $gettext('Create'),
          customComponent: CreateShortcutModal,
          customComponentAttrs: () => ({ space: unref(currentSpace) })
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
  ])

  return {
    actions
  }
}
