import { ActionExtension } from '@opencloud-eu/web-pkg'
import {
  batchActionsExtensionPoint,
  contextActionsExtensionPoint,
  quickActionsExtensionPoint,
  resourceTableActionsExtensionPoint
} from '../../extensionPoints'
import {
  useFileActionsCopyPermanentLink,
  useFileActionsCreateSpaceFromResource,
  useFileActionsFavorite,
  useFileActionsPaste,
  useFileActionsOpenShortcut,
  useSpaceActionsSetImage,
  useFileActionsRename,
  useFileActionsShowDetails,
  useFileActionsShowShares,
  useFileActionsToggleHideShare
} from '../actions'
import { unref } from 'vue'

const previewToolBarActionsExtensionPointId = 'app.preview.toolbar-actions'
const adminSettingsSpacesContextActionsExtensionPointId =
  'app.admin-settings.spaces.context-actions'

export const useFileActions = (): ActionExtension[] => {
  const { actions: openShortcutActions } = useFileActionsOpenShortcut()
  const { actions: showSharesActions } = useFileActionsShowShares()
  const { actions: permanentLinkActions } = useFileActionsCopyPermanentLink()
  const { actions: createSpaceFromResourceActions } = useFileActionsCreateSpaceFromResource()
  const { actions: pasteActions } = useFileActionsPaste()
  const { actions: renameActions } = useFileActionsRename()
  const { actions: favoriteActions } = useFileActionsFavorite()
  const { actions: setSpaceImageActions } = useSpaceActionsSetImage()
  const { actions: showDetailsActions } = useFileActionsShowDetails()
  const { actions: toggleHideShareActions } = useFileActionsToggleHideShare()

  return [
    {
      id: 'com.github.opencloud-eu.web.files.context-action.open-shortcut',
      extensionPointIds: [contextActionsExtensionPoint.id],
      type: 'action',
      action: {
        ...unref(openShortcutActions)[0],
        category: 'primary'
      }
    },
    {
      id: 'com.github.opencloud-eu.web.files.quick-action.collaborator',
      extensionPointIds: [quickActionsExtensionPoint.id, contextActionsExtensionPoint.id],
      type: 'action',
      action: {
        ...unref(showSharesActions)[0],
        category: 'secondary'
      }
    },
    {
      id: 'com.github.opencloud-eu.web.files.quick-action.quicklink',
      extensionPointIds: [quickActionsExtensionPoint.id, contextActionsExtensionPoint.id],
      type: 'action',
      action: {
        ...unref(permanentLinkActions)[0],
        category: 'secondary'
      }
    },
    {
      id: 'com.github.opencloud-eu.web.files.context-action.paste',
      extensionPointIds: [contextActionsExtensionPoint.id],
      type: 'action',
      action: {
        ...unref(pasteActions)[0],
        category: 'tertiary'
      }
    },
    {
      id: 'com.github.opencloud-eu.web.files.context-action.rename',
      extensionPointIds: [contextActionsExtensionPoint.id, resourceTableActionsExtensionPoint.id],
      type: 'action',
      action: {
        ...unref(renameActions)[0],
        category: 'tertiary'
      }
    },
    {
      id: 'com.github.opencloud-eu.web.files.context-action.create-space-from-resource',
      extensionPointIds: [contextActionsExtensionPoint.id],
      type: 'action',
      action: {
        ...unref(createSpaceFromResourceActions)[0],
        category: 'tertiary'
      }
    },
    {
      id: 'com.github.opencloud-eu.web.files.context-action.favorite',
      extensionPointIds: [
        previewToolBarActionsExtensionPointId,
        batchActionsExtensionPoint.id,
        contextActionsExtensionPoint.id
      ],
      type: 'action',
      action: {
        ...unref(favoriteActions)[0],
        category: 'quaternary'
      }
    },
    {
      id: 'com.github.opencloud-eu.web.files.context-action.set-space-image',
      extensionPointIds: [contextActionsExtensionPoint.id],
      type: 'action',
      action: {
        ...unref(setSpaceImageActions)[0],
        category: 'tertiary'
      }
    },
    {
      id: 'com.github.opencloud-eu.web.files.sidebar-action.details',
      extensionPointIds: [
        adminSettingsSpacesContextActionsExtensionPointId,
        contextActionsExtensionPoint.id
      ],
      type: 'action',
      action: {
        ...unref(showDetailsActions)[0],
        category: 'quaternary'
      }
    },
    {
      id: 'com.github.opencloud-eu.web.files.context-action.toggle-hide-share',
      extensionPointIds: [contextActionsExtensionPoint.id, batchActionsExtensionPoint.id],
      type: 'action',
      action: {
        ...unref(toggleHideShareActions)[0],
        category: 'tertiary'
      }
    }
  ]
}
