<template>
  <main
    id="account"
    class="flex justify-center p-4 overflow-auto app-content border w-full bg-role-surface rounded-l-xl transition-all duration-350 ease-[cubic-bezier(0.34,0.11,0,1.12)]"
  >
    <div class="w-full lg:w-3/4 xl:w-1/2">
      <mobile-nav class="px-4 pb-4" />
      <app-bar v-if="!isMobile" :breadcrumbs="breadcrumbs" :has-view-options="false" />
      <div class="px-4">
        <router-view />
      </div>
    </div>
  </main>
</template>
<script setup lang="ts">
import {
  useActiveLocation,
  useCapabilityStore,
  useExtensionRegistry,
  MobileNav,
  AccountExtension,
  AppBar
} from '@opencloud-eu/web-pkg'
import { storeToRefs } from 'pinia'
import { isLocationAccountActive } from '../../router'
import { computed, onMounted, onUnmounted, ref, unref } from 'vue'
import { preferencesPanelExtensionPoint } from '../../extensionPoints'
import { useGettext } from 'vue3-gettext'
import { useRoute } from 'vue-router'
import { v4 as uuidV4 } from 'uuid'
import { useIsMobile } from '@opencloud-eu/design-system/composables'

const extensionRegistry = useExtensionRegistry()
const capabilityStore = useCapabilityStore()

const { supportRadicale } = storeToRefs(capabilityStore)
const { $gettext } = useGettext()
const preferencesPanelExtensions = ref<AccountExtension[]>([])
const route = useRoute()
const { isMobile } = useIsMobile()

const isAccountInformationActive = useActiveLocation(isLocationAccountActive, 'account-information')
const isAccountPreferencesActive = useActiveLocation(isLocationAccountActive, 'account-preferences')
const isAccountExtensionsActive = useActiveLocation(isLocationAccountActive, 'account-extensions')
const isAccountCalendarActive = useActiveLocation(isLocationAccountActive, 'account-calendar')
const isAccountGdprActive = useActiveLocation(isLocationAccountActive, 'account-gdpr')

const navItems = computed(() => {
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

  return [...baseItems, ...extensionItems]
})

const navItemExtensions = computed(() => {
  return unref(navItems).map((navItem) => {
    return {
      id: 'com.github.opencloud-eu.web.account.navItems',
      type: 'sidebarNav',
      extensionPointIds: ['app.account.navItems'],
      navItem
    }
  })
})

const breadcrumbs = computed(() => {
  const activeNavItem = unref(navItems).find((navItem) => navItem.active)

  if (!activeNavItem) {
    return []
  }

  return [
    {
      id: uuidV4(),
      text: activeNavItem.name,
      to: activeNavItem.route,
      isStaticNav: true
    }
  ]
})

extensionRegistry.registerExtensions(navItemExtensions)

onMounted(() => {
  preferencesPanelExtensions.value = extensionRegistry.requestExtensions(
    preferencesPanelExtensionPoint
  )
})

onUnmounted(() => {
  extensionRegistry.unregisterExtensions(['com.github.opencloud-eu.web.account.navItems'])
})
</script>
