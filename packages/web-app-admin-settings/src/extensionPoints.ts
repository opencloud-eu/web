import { ExtensionPoint, FloatingActionButtonExtension } from '@opencloud-eu/web-pkg'
import { computed } from 'vue'

export const floatingActionButtonExtension: ExtensionPoint<FloatingActionButtonExtension> = {
  id: 'app.admin-settings.floating-action-button',
  extensionType: 'floatingActionButton'
}

export const extensionPoints = () => {
  return computed<ExtensionPoint<any>[]>(() => {
    return [floatingActionButtonExtension]
  })
}
