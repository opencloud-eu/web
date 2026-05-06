import { ActionExtension } from '@opencloud-eu/web-pkg'
import { uploadMenuExtensionPoint } from '../../extensionPoints'
import {
  useFileActionsCreateNewFile,
  useFileActionsCreateNewFolder,
  useFileActionsCreateNewShortcut
} from '../actions'
import { unref } from 'vue'

export const useUploadActions = (): ActionExtension[] => {
  const { actions: createNewFolderActions } = useFileActionsCreateNewFolder()
  const { actions: createNewShortcutActions } = useFileActionsCreateNewShortcut()
  const { actions: createNewFileActions } = useFileActionsCreateNewFile()

  return [
    {
      id: 'com.github.opencloud-eu.web.files.upload-action.new-folder',
      extensionPointIds: [uploadMenuExtensionPoint.id],
      type: 'action',
      action: unref(createNewFolderActions)[0]
    },
    ...unref(createNewFileActions).map((action) => ({
      id: `com.github.opencloud-eu.web.files.upload-action.new-file.${action.ext || 'default'}`,
      extensionPointIds: [uploadMenuExtensionPoint.id],
      type: 'action' as const,
      action
    })),
    {
      id: 'com.github.opencloud-eu.web.files.upload-action.new-shortcut',
      extensionPointIds: [uploadMenuExtensionPoint.id],
      type: 'action',
      action: unref(createNewShortcutActions)[0]
    }
  ]
}
