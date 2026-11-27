import { ActionExtension } from '@opencloud-eu/web-pkg'
import { quickCreateExtensionPoint, uploadMenuExtensionPoint } from '../../extensionPoints'
import {
  useFileActionsCreateNewFile,
  useFileActionsCreateNewFolder,
  useFileActionsCreateNewShortcut
} from '../actions'
import { computed, ComputedRef, unref } from 'vue'

export const useUploadActions = (): ComputedRef<ActionExtension[]> => {
  const { actions: createNewFolderActions } = useFileActionsCreateNewFolder()
  const { actions: createNewShortcutActions } = useFileActionsCreateNewShortcut()
  const { actions: createNewFileActions, quickCreateActions } = useFileActionsCreateNewFile()

  // computed: apps may register file extensions after files app setup
  return computed<ActionExtension[]>(() => [
    {
      id: 'com.github.opencloud-eu.web.files.upload-action.new-folder',
      extensionPointIds: [uploadMenuExtensionPoint.id],
      type: 'action',
      action: unref(createNewFolderActions)[0]
    },
    ...unref(createNewFileActions).map((action): ActionExtension => ({
      id: `com.github.opencloud-eu.web.files.upload-action.new-file.${action.ext || 'default'}`,
      extensionPointIds: [uploadMenuExtensionPoint.id],
      type: 'action',
      action
    })),
    {
      id: 'com.github.opencloud-eu.web.files.upload-action.new-shortcut',
      extensionPointIds: [uploadMenuExtensionPoint.id],
      type: 'action',
      action: unref(createNewShortcutActions)[0]
    },
    ...unref(quickCreateActions).map((action): ActionExtension => ({
      id: `com.github.opencloud-eu.web.files.quick-create.new-file.${action.ext || 'default'}`,
      extensionPointIds: [quickCreateExtensionPoint.id],
      type: 'action',
      action
    }))
  ])
}
