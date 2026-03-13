<template>
  <main
    id="account"
    class="flex justify-center p-4 overflow-auto app-content border w-full bg-role-surface rounded-l-xl transition-all duration-350 ease-[cubic-bezier(0.34,0.11,0,1.12)]"
  >
    <div class="w-full lg:w-3/4 xl:w-1/2">
      <mobile-nav class="py-2" />
      <router-view />
    </div>
  </main>
</template>
<script setup lang="ts">
import {
  useActiveLocation,
  useCapabilityStore,
  useExtensionRegistry
} from '@opencloud-eu/web-pkg/src'
import { storeToRefs } from 'pinia'
import { isLocationAccountActive } from '../../router'
import { computed, onUnmounted, unref, watch } from 'vue'
import { preferencesPanelExtensionPoint } from '../../extensionPoints'
import { useGettext } from 'vue3-gettext'
import { useRoute } from 'vue-router'
import MobileNav from '@opencloud-eu/web-pkg/src/components/Navigation/MobileNav.vue'

const extensionRegistry = useExtensionRegistry()
const capabilityStore = useCapabilityStore()

const { supportRadicale } = storeToRefs(capabilityStore)
const { $gettext, current: currentLanguage } = useGettext()
const route = useRoute()

const isAccountInformationActive = useActiveLocation(isLocationAccountActive, 'account-information')
const isAccountPreferencesActive = useActiveLocation(isLocationAccountActive, 'account-preferences')
const isAccountExtensionsActive = useActiveLocation(isLocationAccountActive, 'account-extensions')
const isAccountCalendarActive = useActiveLocation(isLocationAccountActive, 'account-calendar')
const isAccountGdprActive = useActiveLocation(isLocationAccountActive, 'account-gdpr')

const preferencesPanelExtensions = computed(() => {
  return extensionRegistry.requestExtensions(preferencesPanelExtensionPoint)
})

const getNavItems = () => {
  const baseItems = [
    {
      name: $gettext('Profile'),
      route: { name: 'account-information' },
      icon: 'id-card',
      active: unref(isAccountInformationActive),
      priority: 10
    },
    {
      name: $gettext('Preferences'),
      route: { name: 'account-preferences' },
      icon: 'settings-4',
      active: unref(isAccountPreferencesActive),
      priority: 20
    },
    {
      name: $gettext('Extensions'),
      route: { name: 'account-extensions' },
      icon: 'puzzle-2',
      active: unref(isAccountExtensionsActive),
      priority: 30
    },
    ...(unref(supportRadicale)
      ? [
          {
            name: $gettext('Calendar'),
            route: { name: 'account-calendar' },
            icon: 'calendar',
            active: unref(isAccountCalendarActive),
            priority: 40
          }
        ]
      : []),
    {
      name: $gettext('GDPR'),
      route: { name: 'account-gdpr' },
      icon: 'shield-user',
      active: unref(isAccountGdprActive),
      priority: 50
    }
  ]

  const extensionItems = unref(preferencesPanelExtensions).map((ext) => ({
    name: ext.label(),
    route: {
      name: 'account-extension',
      query: { 'extension-id': ext.id }
    },
    icon: ext.icon,
    active: route.path === '/account/extension' && route.query?.['extension-id'] === ext.id
  }))

  return [...baseItems, ...extensionItems].map((navItem) => {
    return {
      id: 'com.github.opencloud-eu.web.account.navItems',
      type: 'sidebarNav',
      extensionPointIds: ['app.account.navItems'],
      navItem
    }
  })
}

onUnmounted(() => {
  const navItems = getNavItems()
  extensionRegistry.unregisterExtensions(navItems.map((item) => item.id))
})

watch(
  () => currentLanguage,
  () => {
    const navItems = getNavItems()
    extensionRegistry.registerExtensions(computed(() => navItems))
  },
  { immediate: true }
)
</script>
