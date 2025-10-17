import {
  ActionExtension,
  ExtensionPoint,
  FolderViewExtension,
  SidebarPanelExtension
} from '@opencloud-eu/web-pkg'
import { computed } from 'vue'

export const uploadMenuExtensionPoint: ExtensionPoint<ActionExtension> = {
  id: 'app.files.upload-menu',
  extensionType: 'action',
  multiple: true
}
export const quickActionsExtensionPoint: ExtensionPoint<ActionExtension> = {
  id: 'app.files.quick-actions',
  extensionType: 'action',
  multiple: true
}
export const trashQuickActionsExtensionPoint: ExtensionPoint<ActionExtension> = {
  id: 'app.files.trash-quick-actions',
  extensionType: 'action',
  multiple: true
}
export const batchActionsExtensionPoint: ExtensionPoint<ActionExtension> = {
  id: 'global.files.batch-actions',
  extensionType: 'action',
  multiple: true
}
export const contextActionsExtensionPoint: ExtensionPoint<ActionExtension> = {
  id: 'global.files.context-actions',
  extensionType: 'action',
  multiple: true
}
export const defaultActionsExtensionPoint: ExtensionPoint<ActionExtension> = {
  id: 'global.files.default-actions',
  extensionType: 'action',
  multiple: true
}
export const fileSideBarExtensionPoint: ExtensionPoint<SidebarPanelExtension<any, any, any>> = {
  id: 'global.files.sidebar',
  extensionType: 'sidebarPanel',
  multiple: true
}
export const folderViewsFolderExtensionPoint: ExtensionPoint<FolderViewExtension> = {
  id: 'app.files.folder-views.folder',
  extensionType: 'folderView'
}
export const folderViewsFavoritesExtensionPoint: ExtensionPoint<FolderViewExtension> = {
  id: 'app.files.folder-views.favorites',
  extensionType: 'folderView'
}
export const folderViewsProjectSpacesExtensionPoint: ExtensionPoint<FolderViewExtension> = {
  id: 'app.files.folder-views.project-spaces',
  extensionType: 'folderView'
}

export const folderViewsTrashExtensionPoint: ExtensionPoint<FolderViewExtension> = {
  id: 'app.files.folder-views.trash',
  extensionType: 'folderView'
}

export const folderViewsTrashOverviewExtensionPoint: ExtensionPoint<FolderViewExtension> = {
  id: 'app.files.folder-views.trash-overview',
  extensionType: 'folderView'
}

export const folderViewsSharedViaLinkExtensionPoint: ExtensionPoint<FolderViewExtension> = {
  id: 'app.files.folder-views.shared-via-link',
  extensionType: 'folderView'
}

export const folderViewsSharedWithOthersExtensionPoint: ExtensionPoint<FolderViewExtension> = {
  id: 'app.files.folder-views.shared-with-others',
  extensionType: 'folderView'
}

export const folderViewsSharedWithMeExtensionPoint: ExtensionPoint<FolderViewExtension> = {
  id: 'app.files.folder-views.shared-with-me',
  extensionType: 'folderView'
}

export const folderViewsSearchExtensionPoint: ExtensionPoint<FolderViewExtension> = {
  id: 'app.files.folder-views.search',
  extensionType: 'folderView'
}

export const extensionPoints = () => {
  return computed<ExtensionPoint<any>[]>(() => {
    return [
      uploadMenuExtensionPoint,
      quickActionsExtensionPoint,
      trashQuickActionsExtensionPoint,
      batchActionsExtensionPoint,
      contextActionsExtensionPoint,
      defaultActionsExtensionPoint,
      fileSideBarExtensionPoint,
      folderViewsFolderExtensionPoint,
      folderViewsFavoritesExtensionPoint,
      folderViewsProjectSpacesExtensionPoint,
      folderViewsTrashExtensionPoint,
      folderViewsTrashOverviewExtensionPoint,
      folderViewsSharedViaLinkExtensionPoint,
      folderViewsSharedWithOthersExtensionPoint,
      folderViewsSearchExtensionPoint
    ]
  })
}
