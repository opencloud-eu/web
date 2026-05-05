import { unref } from 'vue'
import { ActionExtension } from '@opencloud-eu/web-pkg'
import { batchActionsExtensionPoint, contextActionsExtensionPoint } from '../../extensionPoints'
import {
  useSpaceActionsDelete,
  useSpaceActionsDeleteImage,
  useSpaceActionsDisable,
  useSpaceActionsDuplicate,
  useSpaceActionsEditReadmeContent,
  useSpaceActionsEditDescription,
  useSpaceActionsEditQuota,
  useSpaceActionsNavigateToTrash,
  useSpaceActionsRename,
  useSpaceActionsRestore,
  useSpaceActionsSetIcon,
  useSpaceActionsShowMembers,
  useSpaceActionsUploadImage
} from '../actions'

const adminSettingsSpacesContextActionsExtensionPointId =
  'app.admin-settings.spaces.context-actions'
const adminSettingsSpacesSideBarActionsExtensionPointId =
  'app.admin-settings.spaces.sidebar-actions'
const adminSettingsSpacesBatchActionsExtensionPointId = 'app.admin-settings.spaces.batch-actions'

export const useSpaceActions = (): ActionExtension[] => {
  const { actions: deleteActions } = useSpaceActionsDelete()
  const { actions: disableActions } = useSpaceActionsDisable()
  const { actions: duplicateActions } = useSpaceActionsDuplicate()
  const { actions: editReadmeContentActions } = useSpaceActionsEditReadmeContent()
  const { actions: editDescriptionActions } = useSpaceActionsEditDescription()
  const { actions: editQuotaActions } = useSpaceActionsEditQuota()
  const { actions: navigateToTrashActions } = useSpaceActionsNavigateToTrash()
  const { actions: renameActions } = useSpaceActionsRename()
  const { actions: restoreActions } = useSpaceActionsRestore()
  const { actions: setSpaceIconActions } = useSpaceActionsSetIcon()
  const { actions: uploadSpaceImage } = useSpaceActionsUploadImage()
  const { actions: deleteSpaceImageActions } = useSpaceActionsDeleteImage()
  const { actions: showMembersActions } = useSpaceActionsShowMembers()

  return [
    {
      id: 'com.github.opencloud-eu.web.files.spaces.context-action.show-members',
      extensionPointIds: [contextActionsExtensionPoint.id],
      type: 'action',
      action: {
        ...unref(showMembersActions)[0],
        category: 'secondary'
      }
    },
    {
      id: 'com.github.opencloud-eu.web.files.spaces.context-action.rename',
      extensionPointIds: [
        contextActionsExtensionPoint.id,
        adminSettingsSpacesContextActionsExtensionPointId,
        adminSettingsSpacesSideBarActionsExtensionPointId
      ],
      type: 'action',
      action: {
        ...unref(renameActions)[0],
        category: 'secondary'
      }
    },
    {
      id: 'com.github.opencloud-eu.web.files.spaces.context-action.edit-readme-content',
      extensionPointIds: [contextActionsExtensionPoint.id],
      type: 'action',
      action: {
        ...unref(editReadmeContentActions)[0],
        category: 'secondary'
      }
    },
    {
      id: 'com.github.opencloud-eu.web.files.spaces.context-action.edit-description',
      extensionPointIds: [
        contextActionsExtensionPoint.id,
        adminSettingsSpacesContextActionsExtensionPointId,
        adminSettingsSpacesSideBarActionsExtensionPointId
      ],
      type: 'action',
      action: {
        ...unref(editDescriptionActions)[0],
        category: 'secondary'
      }
    },
    {
      id: 'com.github.opencloud-eu.web.files.spaces.context-action.navigate-to-trash',
      extensionPointIds: [contextActionsExtensionPoint.id],
      type: 'action',
      action: {
        ...unref(navigateToTrashActions)[0],
        category: 'secondary'
      }
    },
    {
      id: 'com.github.opencloud-eu.web.files.spaces.context-action.upload-space-image',
      extensionPointIds: [contextActionsExtensionPoint.id],
      type: 'action',
      action: {
        ...unref(uploadSpaceImage)[0],
        category: 'secondary'
      }
    },
    {
      id: 'com.github.opencloud-eu.web.files.spaces.context-action.set-space-icon',
      extensionPointIds: [contextActionsExtensionPoint.id],
      type: 'action',
      action: {
        ...unref(setSpaceIconActions)[0],
        category: 'secondary'
      }
    },
    {
      id: 'com.github.opencloud-eu.web.files.spaces.context-action.delete-space-image',
      extensionPointIds: [contextActionsExtensionPoint.id],
      type: 'action',
      action: {
        ...unref(deleteSpaceImageActions)[0],
        category: 'secondary'
      }
    },
    {
      id: 'com.github.opencloud-eu.web.files.spaces.batch-action.duplicate',
      extensionPointIds: [
        contextActionsExtensionPoint.id,
        batchActionsExtensionPoint.id,
        adminSettingsSpacesContextActionsExtensionPointId,
        adminSettingsSpacesSideBarActionsExtensionPointId
      ],
      type: 'action',
      action: {
        ...unref(duplicateActions)[0],
        category: 'secondary'
      }
    },
    {
      id: 'com.github.opencloud-eu.web.files.spaces.batch-action.edit-quota',
      extensionPointIds: [
        contextActionsExtensionPoint.id,
        batchActionsExtensionPoint.id,
        adminSettingsSpacesContextActionsExtensionPointId,
        adminSettingsSpacesSideBarActionsExtensionPointId,
        adminSettingsSpacesBatchActionsExtensionPointId
      ],
      type: 'action',
      action: {
        ...unref(editQuotaActions)[0],
        category: 'tertiary'
      }
    },
    {
      id: 'com.github.opencloud-eu.web.files.spaces.batch-action.restore',
      extensionPointIds: [
        contextActionsExtensionPoint.id,
        batchActionsExtensionPoint.id,
        adminSettingsSpacesContextActionsExtensionPointId,
        adminSettingsSpacesSideBarActionsExtensionPointId,
        adminSettingsSpacesBatchActionsExtensionPointId
      ],
      type: 'action',
      action: {
        ...unref(restoreActions)[0],
        category: 'tertiary'
      }
    },
    {
      id: 'com.github.opencloud-eu.web.files.spaces.batch-action.delete',
      extensionPointIds: [
        contextActionsExtensionPoint.id,
        batchActionsExtensionPoint.id,
        adminSettingsSpacesContextActionsExtensionPointId,
        adminSettingsSpacesSideBarActionsExtensionPointId,
        adminSettingsSpacesBatchActionsExtensionPointId
      ],
      type: 'action',
      action: {
        ...unref(deleteActions)[0],
        category: 'tertiary'
      }
    },
    {
      id: 'com.github.opencloud-eu.web.files.spaces.batch-action.disable',
      extensionPointIds: [
        contextActionsExtensionPoint.id,
        batchActionsExtensionPoint.id,
        adminSettingsSpacesContextActionsExtensionPointId,
        adminSettingsSpacesSideBarActionsExtensionPointId,
        adminSettingsSpacesBatchActionsExtensionPointId
      ],
      type: 'action',
      action: {
        ...unref(disableActions)[0],
        category: 'tertiary'
      }
    }
  ]
}
