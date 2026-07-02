import { urlJoin } from '@opencloud-eu/web-client'
import {
  AccountsSwitch,
  AppMenuItemExtension,
  ApplicationInformation,
  CustomComponentExtension,
  Extension,
  FloatingActionButtonExtension,
  useCapabilityStore,
  useUserStore
} from '@opencloud-eu/web-pkg'
import { computed, markRaw, unref } from 'vue'
import { storeToRefs } from 'pinia'
import CalendarNavigation from './components/CalendarNavigation.vue'
import CreateAppointmentDrop from './components/CreateAppointmentDrop.vue'
import { useGettext } from 'vue3-gettext'

export const extensions = (appInfo: ApplicationInformation) => {
  const capabilityStore = useCapabilityStore()
  const userStore = useUserStore()
  const { user } = storeToRefs(userStore)
  const { $gettext } = useGettext()

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

  const floatingActionButton: FloatingActionButtonExtension = {
    id: `com.github.opencloud-eu.web.${appInfo.id}.floating-action-button`,
    extensionPointIds: [`app.${appInfo.id}.floating-action-button`],
    type: 'floatingActionButton',
    icon: 'add',
    label: () => $gettext('Create New'),
    mode: () => 'drop',
    dropComponent: markRaw(CreateAppointmentDrop)
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
      result.push(floatingActionButton)
      result.push(mainNavExtension)
      result.push(bottomNavExtension)
    }

    return result
  })
}
