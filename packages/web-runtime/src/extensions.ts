import { computed, markRaw, unref } from 'vue'
import { preferencesPanelExtensionPoint, progressBarExtensionPoint } from './extensionPoints'
import AppTokens from './components/Account/AppTokens.vue'
import {
  AccountExtension,
  AppMenuItemExtension,
  CustomComponentExtension,
  LoadingIndicator,
  useCapabilityStore,
  useUserStore
} from '@opencloud-eu/web-pkg'
import { storeToRefs } from 'pinia'

const $gettext = (str: string) => str

export const extensions = () => {
  const capabilityStore = useCapabilityStore()
  const userStore = useUserStore()
  const { supportRadicale } = storeToRefs(capabilityStore)
  const { user } = storeToRefs(userStore)

  const showCalender = computed(() => unref(user) && unref(supportRadicale))

  return computed(() => [
    {
      id: 'com.github.opencloud-eu.web.runtime.preferences-panels.app-tokens',
      type: 'accountExtension',
      label: () => $gettext('App Tokens'),
      icon: 'key-2',
      extensionPointIds: [preferencesPanelExtensionPoint.id],
      content: AppTokens
    } as AccountExtension,
    {
      id: 'com.github.opencloud-eu.web.runtime.default-progress-bar',
      type: 'customComponent',
      extensionPointIds: [progressBarExtensionPoint.id],
      content: markRaw(LoadingIndicator),
      userPreference: {
        optionLabel: $gettext('Default progress bar')
      }
    } as CustomComponentExtension,
    ...(unref(showCalender)
      ? [
          {
            id: 'com.github.opencloud-eu.web.runtime.app-menu-item.Calendar',
            type: 'appMenuItem',
            label: () => $gettext('Calendar'),
            color: '#0478d4',
            icon: 'calendar',
            path: '/account/calendar'
          } as AppMenuItemExtension
        ]
      : [])
  ])
}
