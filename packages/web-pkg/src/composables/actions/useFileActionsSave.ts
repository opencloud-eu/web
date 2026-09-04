import { computed, markRaw, unref, Ref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { FileAction, FileActionOptions } from './types'
import { useModals } from '../piniaStores'
import SaveAsModal from '../../components/Modals/SaveAsModal.vue'
import { useFolderLink } from '../folderLink'

export function useFileActionsSave({
  content,
  isDirty,
  isEditor,
  isReadOnly,
  onSave
}: {
  content: Ref<unknown>
  isDirty: Ref<boolean>
  isEditor: Ref<boolean>
  isReadOnly: Ref<boolean>
  onSave: () => Promise<void>
}) {
  const { $gettext } = useGettext()
  const { dispatchModal } = useModals()
  const { getParentFolderLink } = useFolderLink()

  function saveAsHandler({ resources }: FileActionOptions) {
    dispatchModal({
      elementClass: 'save-as-modal',
      title: $gettext('Save as'),
      customComponent: markRaw(SaveAsModal),
      hideActions: true,
      customComponentAttrs: () => ({
        content: unref(content),
        parentFolderLink: getParentFolderLink(resources[0]),
        originalResource: resources[0]
      }),
      focusTrapInitial: false
    })
  }

  const saveAction = computed<FileAction>(() => ({
    name: 'save-file',
    id: 'app-save-action',
    icon: 'save',
    label: () => $gettext('Save'),
    handler: onSave,
    isVisible: () => unref(isEditor) && !unref(isReadOnly),
    isDisabled: () => !unref(isDirty)
  }))

  const saveAsAction = computed<FileAction>(() => ({
    name: 'save-as',
    icon: 'save-2',
    label: () => $gettext('Save as'),
    handler: saveAsHandler,
    isVisible: () => unref(isEditor),
    class: 'oc-files-actions-save-as-trigger'
  }))

  return {
    saveAction,
    saveAsAction
  }
}
