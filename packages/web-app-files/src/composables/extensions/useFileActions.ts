import { ActionExtension } from '@opencloud-eu/web-pkg'
import {
  batchActionsExtensionPoint,
  contextActionsExtensionPoint,
  quickActionsExtensionPoint
} from '../../extensionPoints'
import {
  useFileActionsCopyPermanentLink,
  useFileActionsPaste,
  useFileActionsOpenShortcut,
  useFileActionsShowDetails,
  useFileActionsShowShares,
  useFileActionsToggleHideShare
} from '../actions'
import { unref } from 'vue'

export const useFileActions = (): ActionExtension[] => {
  const { actions: openShortcutActions } = useFileActionsOpenShortcut()
  const { actions: showSharesActions } = useFileActionsShowShares()
  const { actions: permanentLinkActions } = useFileActionsCopyPermanentLink()
  const { actions: pasteActions } = useFileActionsPaste()
  const { actions: showDetailsActions } = useFileActionsShowDetails()
  const { actions: toggleHideShareActions } = useFileActionsToggleHideShare()

  return [
    {
      id: 'com.github.opencloud-eu.web.files.context-action.open-shortcut',
      extensionPointIds: [contextActionsExtensionPoint.id],
      type: 'action',
      action: {
        ...unref(openShortcutActions)[0],
        category: 'tertiary'
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
      id: 'com.github.opencloud-eu.web.files.sidebar-action.details',
      extensionPointIds: [contextActionsExtensionPoint.id],
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
