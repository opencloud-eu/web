import { unref } from 'vue'
import { ActionExtension } from '@opencloud-eu/web-pkg'
import { batchActionsExtensionPoint, contextActionsExtensionPoint } from '../../extensionPoints'
import {
  useSpaceActionsDelete,
  useSpaceActionsDisable,
  useSpaceActionsDuplicate,
  useSpaceActionsEditDescription,
  useSpaceActionsEditQuota,
  useSpaceActionsRename,
  useSpaceActionsRestore
} from '../actions'

export const useSpaceActions = (): ActionExtension[] => {
  const { actions: deleteActions } = useSpaceActionsDelete()
  const { actions: disableActions } = useSpaceActionsDisable()
  const { actions: duplicateActions } = useSpaceActionsDuplicate()
  const { actions: editDescriptionActions } = useSpaceActionsEditDescription()
  const { actions: editQuotaActions } = useSpaceActionsEditQuota()
  const { actions: renameActions } = useSpaceActionsRename()
  const { actions: restoreActions } = useSpaceActionsRestore()

  return [
    {
      id: 'com.github.opencloud-eu.web.files.spaces.context-action.rename',
      extensionPointIds: [contextActionsExtensionPoint.id],
      type: 'action',
      action: {
        ...unref(renameActions)[0],
        category: 'primary'
      }
    },
    {
      id: 'com.github.opencloud-eu.web.files.spaces.context-action.edit-description',
      extensionPointIds: [contextActionsExtensionPoint.id],
      type: 'action',
      action: {
        ...unref(editDescriptionActions)[0],
        category: 'primary'
      }
    },
    {
      id: 'com.github.opencloud-eu.web.files.spaces.batch-action.duplicate',
      extensionPointIds: [batchActionsExtensionPoint.id],
      type: 'action',
      action: {
        ...unref(duplicateActions)[0],
        category: 'actions'
      }
    },
    {
      id: 'com.github.opencloud-eu.web.files.spaces.batch-action.edit-quota',
      extensionPointIds: [contextActionsExtensionPoint.id, batchActionsExtensionPoint.id],
      type: 'action',
      action: {
        ...unref(editQuotaActions)[0],
        category: 'secondary'
      }
    },
    {
      id: 'com.github.opencloud-eu.web.files.spaces.batch-action.restore',
      extensionPointIds: [contextActionsExtensionPoint.id, batchActionsExtensionPoint.id],
      type: 'action',
      action: {
        ...unref(restoreActions)[0],
        category: 'secondary'
      }
    },
    {
      id: 'com.github.opencloud-eu.web.files.spaces.batch-action.delete',
      extensionPointIds: [contextActionsExtensionPoint.id, batchActionsExtensionPoint.id],
      type: 'action',
      action: {
        ...unref(deleteActions)[0],
        category: 'secondary'
      }
    },
    {
      id: 'com.github.opencloud-eu.web.files.spaces.batch-action.disable',
      extensionPointIds: [contextActionsExtensionPoint.id, batchActionsExtensionPoint.id],
      type: 'action',
      action: {
        ...unref(disableActions)[0],
        category: 'secondary'
      }
    }
  ]
}
