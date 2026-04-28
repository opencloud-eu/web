import { ActionExtension } from '@opencloud-eu/web-pkg'
import { useFileActionsEmptyTrashBin } from '../actions'
import { trashQuickActionsExtensionPoint } from '../../extensionPoints'
import { unref } from 'vue'

export const useTrashActions = (): ActionExtension[] => {
  const { actions: emptyTrashBinActions } = useFileActionsEmptyTrashBin()

  return [
    {
      id: 'com.github.opencloud-eu.web.files.quick-action.empty-trash-bin',
      extensionPointIds: [trashQuickActionsExtensionPoint.id],
      type: 'action',
      action: unref(emptyTrashBinActions)[0]
    }
  ]
}
