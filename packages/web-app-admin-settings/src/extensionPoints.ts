import {
  ActionExtension,
  ExtensionPoint,
  FloatingActionButtonExtension
} from '@opencloud-eu/web-pkg'
import { computed } from 'vue'

export const floatingActionButtonExtension: ExtensionPoint<FloatingActionButtonExtension> = {
  id: 'app.admin-settings.floating-action-button',
  extensionType: 'floatingActionButton'
}

export const spacesContextActionsExtensionPoint: ExtensionPoint<ActionExtension> = {
  id: 'app.admin-settings.spaces.context-actions',
  extensionType: 'action',
  multiple: true
}

export const spacesBatchActionsExtensionPoint: ExtensionPoint<ActionExtension> = {
  id: 'app.admin-settings.spaces.batch-actions',
  extensionType: 'action',
  multiple: true
}

export const spacesSidebarActionsExtensionPoint: ExtensionPoint<ActionExtension> = {
  id: 'app.admin-settings.spaces.sidebar-actions',
  extensionType: 'action',
  multiple: true
}

export const extensionPoints = () => {
  return computed<ExtensionPoint<any>[]>(() => {
    return [
      floatingActionButtonExtension,
      spacesContextActionsExtensionPoint,
      spacesBatchActionsExtensionPoint,
      spacesSidebarActionsExtensionPoint
    ]
  })
}
