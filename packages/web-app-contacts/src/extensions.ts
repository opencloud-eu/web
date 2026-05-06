import { urlJoin } from '@opencloud-eu/web-client'
import {
  AppMenuItemExtension,
  FloatingActionButtonExtension,
  CustomComponentExtension,
  AccountsSwitch,
  ApplicationInformation,
  useCapabilityStore,
  useUserStore,
  Extension
} from '@opencloud-eu/web-pkg'
import { computed, unref } from 'vue'
import { storeToRefs } from 'pinia'
import AddressBooksList from './components/AddressBooksList.vue'
import { useGettext } from 'vue3-gettext'
import { useContactEditor } from './composables/useContactEditor'

export const extensions = (appInfo: ApplicationInformation) => {
  const capabilityStore = useCapabilityStore()
  const userStore = useUserStore()
  const { user } = storeToRefs(userStore)
  const { $gettext } = useGettext()
  const { openCreateContact } = useContactEditor()

  const menuItemExtension: AppMenuItemExtension = {
    id: `app.${appInfo.id}.menuItem`,
    type: 'appMenuItem',
    label: () => appInfo.name,
    color: appInfo.color,
    icon: appInfo.icon,
    priority: 30,
    path: urlJoin(appInfo.id)
  }

  const floatingActionButton: FloatingActionButtonExtension = {
    id: `com.github.opencloud-eu.web.${appInfo.id}.floating-action-button`,
    extensionPointIds: [`app.${appInfo.id}.floating-action-button`],
    type: 'floatingActionButton',
    icon: 'add',
    label: () => $gettext('New'),
    mode: () => 'handler',
    handler: () => {
      openCreateContact()
    }
  }

  const mainNavExtension: CustomComponentExtension = {
    id: `app.${appInfo.id}.sidebar-nav.main-content`,
    extensionPointIds: [`app.${appInfo.id}.sidebar-nav.main`],
    type: 'customComponent',
    content: AddressBooksList
  }

  const bottomNavExtension: CustomComponentExtension = {
    id: `app.${appInfo.id}.sidebar-nav.bottom-content`,
    extensionPointIds: [`app.${appInfo.id}.sidebar-nav.bottom`],
    type: 'customComponent',
    content: AccountsSwitch
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
