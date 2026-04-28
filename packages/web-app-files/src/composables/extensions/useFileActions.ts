import {
  ActionExtension,
  useFileActionsCopyPermanentLink,
  useFileActionsOpenShortcut,
  useFileActionsShowShares
} from '@opencloud-eu/web-pkg'
import {
  contextActionsExtensionPoint,
  quickActionsExtensionPoint,
  batchActionsExtensionPoint,
  uploadMenuExtensionPoint
} from '../../extensionPoints'
import { unref } from 'vue'
import {
  useFileActionsCopy,
  useFileActionsMove,
  useFileActionsDownloadArchive,
  useFileActionsEnableSync,
  useFileActionsDisableSync,
  useFileActionsToggleHideShare,
  useFileActionsCreateSpaceFromResource,
  useFileActionsPaste,
  useFileActionsCreateNewFile,
  useFileActionsCreateNewFolder,
  useFileActionsCreateNewShortcut,
  useFileActionsCreateLink,
  useFileActionsEmptyTrashBin,
  useFileActionsOpenWithDefault,
  useFileActionsSetImage,
  useFileActionsShowActions,
  useFileActionsRename,
  useFileActionsDelete,
  useFileActionsFavorite,
  useFileActionsDownloadFile,
  useFileActionsShowDetails,
  useFileActionsRestore
} from '../actions'

export const useFileActions = (): ActionExtension[] => {
  const { actions: openShortcutActions } = useFileActionsOpenShortcut()
  const { actions: showSharesActions } = useFileActionsShowShares()
  const { actions: permanentLinkActions } = useFileActionsCopyPermanentLink()
  const { actions: copyActions } = useFileActionsCopy()
  const { actions: moveActions } = useFileActionsMove()
  const { actions: downloadActions } = useFileActionsDownloadFile()
  const { actions: downloadArchiveActions } = useFileActionsDownloadArchive()
  const { actions: enableSyncActions } = useFileActionsEnableSync()
  const { actions: disableSyncActions } = useFileActionsDisableSync()
  const { actions: toggleHideShareActions } = useFileActionsToggleHideShare()
  const { actions: createSpaceFromResourceActions } = useFileActionsCreateSpaceFromResource()
  const { actions: pasteActions } = useFileActionsPaste()
  const { actions: createNewFileActions } = useFileActionsCreateNewFile()
  const { actions: createNewFolderActions } = useFileActionsCreateNewFolder()
  const { actions: createNewShortcutActions } = useFileActionsCreateNewShortcut()
  const { actions: createLinkActions } = useFileActionsCreateLink()
  const { actions: emptyTrashBinActions } = useFileActionsEmptyTrashBin()
  const { actions: openWithDefaultActions } = useFileActionsOpenWithDefault()
  const { actions: setImageActions } = useFileActionsSetImage()
  const { actions: showActionsActions } = useFileActionsShowActions()
  const { actions: showDetailsActions } = useFileActionsShowDetails()
  const { actions: renameActions } = useFileActionsRename()
  const { actions: deleteActions } = useFileActionsDelete()
  const { actions: favoriteActions } = useFileActionsFavorite()
  const { actions: restoreActions } = useFileActionsRestore()

  return [
    {
      id: 'com.github.opencloud-eu.web.files.action.copy',
      extensionPointIds: [contextActionsExtensionPoint.id, batchActionsExtensionPoint.id],
      type: 'action',
      action: unref(copyActions)[0]
    },
    {
      id: 'com.github.opencloud-eu.web.files.action.move',
      extensionPointIds: [contextActionsExtensionPoint.id, batchActionsExtensionPoint.id],
      type: 'action',
      action: unref(moveActions)[0]
    },
    {
      id: 'com.github.opencloud-eu.web.files.action.download-archive',
      extensionPointIds: [contextActionsExtensionPoint.id, batchActionsExtensionPoint.id],
      type: 'action',
      action: unref(downloadArchiveActions)[0]
    },
    {
      id: 'com.github.opencloud-eu.web.files.action.enable-sync',
      extensionPointIds: [contextActionsExtensionPoint.id, batchActionsExtensionPoint.id],
      type: 'action',
      action: unref(enableSyncActions)[0]
    },
    {
      id: 'com.github.opencloud-eu.web.files.action.disable-sync',
      extensionPointIds: [contextActionsExtensionPoint.id, batchActionsExtensionPoint.id],
      type: 'action',
      action: unref(disableSyncActions)[0]
    },
    {
      id: 'com.github.opencloud-eu.web.files.action.toggle-hide-share',
      extensionPointIds: [contextActionsExtensionPoint.id, batchActionsExtensionPoint.id],
      type: 'action',
      action: unref(toggleHideShareActions)[0]
    },
    {
      id: 'com.github.opencloud-eu.web.files.action.create-space-from-resource',
      extensionPointIds: [contextActionsExtensionPoint.id],
      type: 'action',
      action: unref(createSpaceFromResourceActions)[0]
    },
    {
      id: 'com.github.opencloud-eu.web.files.action.paste',
      extensionPointIds: [contextActionsExtensionPoint.id],
      type: 'action',
      action: unref(pasteActions)[0]
    },
    {
      id: 'com.github.opencloud-eu.web.files.action.download',
      extensionPointIds: [contextActionsExtensionPoint.id],
      type: 'action',
      action: unref(downloadActions)[0]
    },
    {
      id: 'com.github.opencloud-eu.web.files.action.delete',
      extensionPointIds: [contextActionsExtensionPoint.id, batchActionsExtensionPoint.id],
      type: 'action',
      action: unref(deleteActions)[0]
    },
    {
      id: 'com.github.opencloud-eu.web.files.action.favorite',
      extensionPointIds: [contextActionsExtensionPoint.id, batchActionsExtensionPoint.id],
      type: 'action',
      action: unref(favoriteActions)[0]
    },
    {
      id: 'com.github.opencloud-eu.web.files.context-action.restore',
      extensionPointIds: [contextActionsExtensionPoint.id, batchActionsExtensionPoint.id],
      type: 'action',
      action: unref(restoreActions)[0]
    },
    {
      id: 'com.github.opencloud-eu.web.files.context-action.delete-permanent',
      extensionPointIds: [contextActionsExtensionPoint.id, batchActionsExtensionPoint.id],
      type: 'action',
      action: unref(deleteActions)[1]
    },
    {
      id: 'com.github.opencloud-eu.web.files.action.create-new-file',
      extensionPointIds: [uploadMenuExtensionPoint.id],
      type: 'action',
      action: unref(createNewFileActions)[0]
    },
    {
      id: 'com.github.opencloud-eu.web.files.action.create-new-folder',
      extensionPointIds: [uploadMenuExtensionPoint.id],
      type: 'action',
      action: unref(createNewFolderActions)[0]
    },
    {
      id: 'com.github.opencloud-eu.web.files.action.create-new-shortcut',
      extensionPointIds: [uploadMenuExtensionPoint.id],
      type: 'action',
      action: unref(createNewShortcutActions)[0]
    },
    {
      id: 'com.github.opencloud-eu.web.files.action.create-link',
      extensionPointIds: [quickActionsExtensionPoint.id],
      type: 'action',
      action: unref(createLinkActions)[0]
    },
    {
      id: 'com.github.opencloud-eu.web.files.action.empty-trash-bin',
      extensionPointIds: [contextActionsExtensionPoint.id],
      type: 'action',
      action: unref(emptyTrashBinActions)[0]
    },
    {
      id: 'com.github.opencloud-eu.web.files.action.show-details',
      extensionPointIds: [contextActionsExtensionPoint.id],
      type: 'action',
      action: unref(showDetailsActions)[0]
    },
    {
      id: 'com.github.opencloud-eu.web.files.action.open-with-default',
      extensionPointIds: [contextActionsExtensionPoint.id],
      type: 'action',
      action: unref(openWithDefaultActions)[0]
    },
    {
      id: 'com.github.opencloud-eu.web.files.action.rename',
      extensionPointIds: [contextActionsExtensionPoint.id],
      type: 'action',
      action: unref(renameActions)[0]
    },
    {
      id: 'com.github.opencloud-eu.web.files.action.set-image',
      extensionPointIds: [contextActionsExtensionPoint.id],
      type: 'action',
      action: unref(setImageActions)[0]
    },
    {
      id: 'com.github.opencloud-eu.web.files.action.show-actions',
      extensionPointIds: [quickActionsExtensionPoint.id],
      type: 'action',
      action: unref(showActionsActions)[0]
    },
    {
      id: 'com.github.opencloud-eu.web.files.context-action.open-shortcut',
      extensionPointIds: [contextActionsExtensionPoint.id],
      type: 'action',
      action: unref(openShortcutActions)[0]
    },
    {
      id: 'com.github.opencloud-eu.web.files.quick-action.collaborator',
      extensionPointIds: [quickActionsExtensionPoint.id],
      type: 'action',
      action: unref(showSharesActions)[0]
    },
    {
      id: 'com.github.opencloud-eu.web.files.quick-action.quicklink',
      extensionPointIds: [quickActionsExtensionPoint.id],
      type: 'action',
      action: unref(permanentLinkActions)[0]
    }
  ]
}
