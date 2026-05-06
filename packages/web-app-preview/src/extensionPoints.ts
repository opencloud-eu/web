import { ActionExtension, ExtensionPoint } from '@opencloud-eu/web-pkg'
import { computed } from 'vue'

export const previewToolbarActionsExtensionPoint: ExtensionPoint<ActionExtension> = {
  id: 'app.preview.toolbar-actions',
  extensionType: 'action',
  multiple: true
}

export const extensionPoints = () => {
  return computed<ExtensionPoint<any>[]>(() => {
    return [previewToolbarActionsExtensionPoint]
  })
}
