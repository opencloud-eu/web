import { urlJoin } from '@opencloud-eu/web-client'
import {
  AccountsSwitch,
  AppMenuItemExtension,
  ApplicationInformation,
  CustomComponentExtension,
  Extension,
  useCapabilityStore,
  useUserStore
} from '@opencloud-eu/web-pkg'
import { computed, markRaw, unref } from 'vue'
import { storeToRefs } from 'pinia'
import CalendarNavigation from './components/CalendarNavigation.vue'

export const extensions = (appInfo: ApplicationInformation) => {
  const capabilityStore = useCapabilityStore()
  const userStore = useUserStore()
  const { user } = storeToRefs(userStore)
  const menuItemExtension: AppMenuItemExtension = {
    id: `app.${appInfo.id}.menuItem`,
    type: 'appMenuItem',
    label: () => appInfo.name,
    color: appInfo.color,
    icon: appInfo.icon,
    priority: 30,
    path: urlJoin(appInfo.id)
  }

  const mainNavExtension: CustomComponentExtension = {
    id: `app.${appInfo.id}.sidebar-nav.main-content`,
    extensionPointIds: [`app.${appInfo.id}.sidebar-nav.main`],
    type: 'customComponent',
    content: markRaw(CalendarNavigation)
  }

  const bottomNavExtension: CustomComponentExtension = {
    id: `app.${appInfo.id}.sidebar-nav.bottom-content`,
    extensionPointIds: [`app.${appInfo.id}.sidebar-nav.bottom`],
    type: 'customComponent',
    content: markRaw(AccountsSwitch)
  }

  return computed<Extension[]>(() => {
    const result: Extension[] = []

    if (unref(user) && capabilityStore.capabilities.groupware?.enabled) {
      result.push(menuItemExtension)
      result.push(mainNavExtension)
      result.push(bottomNavExtension)
    }

    return result
  })
}
