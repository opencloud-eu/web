import {
  AccountExtension,
  AppMenuItemExtension,
  CustomComponentExtension,
  Extension,
  ExtensionPoint
} from '@opencloud-eu/web-pkg'
import { computed } from 'vue'

const $gettext = (str: string) => str

export const appMenuExtensionPoint: ExtensionPoint<AppMenuItemExtension> = {
  id: 'app.runtime.header.app-menu',
  extensionType: 'appMenuItem',
  multiple: true
}

export const preferencesPanelExtensionPoint: ExtensionPoint<AccountExtension> = {
  id: 'app.runtime.preferences.panels',
  extensionType: 'accountExtension',
  multiple: true
}

export const progressBarExtensionPoint: ExtensionPoint<CustomComponentExtension> = {
  id: 'app.runtime.global-progress-bar',
  extensionType: 'customComponent',
  multiple: false,
  defaultExtensionId: 'com.github.opencloud-eu.web.runtime.default-progress-bar',
  userPreference: {
    label: $gettext('Global progress bar'),
    description: $gettext('Customize your progress bar')
  }
}

export const topBarCenterExtensionPoint: ExtensionPoint<CustomComponentExtension> = {
  id: 'app.runtime.header.center',
  extensionType: 'customComponent',
  multiple: true
}

export const extensionPoints = () => {
  return computed<ExtensionPoint<Extension>[]>(() => {
    return [
      appMenuExtensionPoint,
      preferencesPanelExtensionPoint,
      progressBarExtensionPoint,
      topBarCenterExtensionPoint
    ]
  })
}
