<template>
  <SidebarNav
    :nav-items="navItems"
    :closed="navBarClosed"
    @update:nav-bar-closed="setNavBarClosed"
  />
  <main
    id="account"
    class="p-4 overflow-auto app-content w-full bg-role-surface rounded-l-xl transition-all duration-350 ease-[cubic-bezier(0.34,0.11,0,1.12)]"
  >
    <router-view />
  </main>
</template>
<script setup lang="ts">
import { useGettext } from 'vue3-gettext'
import SidebarNav from '../../components/SidebarNav/SidebarNav.vue'
import { isLocationAccountActive } from '../../router'
import {
  routeToContextQuery,
  useActiveLocation,
  useAuthStore,
  useCapabilityStore,
  useExtensionRegistry
} from '@opencloud-eu/web-pkg/src'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, unref } from 'vue'
import { preferencesPanelExtensionPoint } from '../../extensionPoints'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'

const { $gettext } = useGettext()
const extensionRegistry = useExtensionRegistry()
const route = useRoute()
const authStore = useAuthStore()
const capabilityStore = useCapabilityStore()
const { supportRadicale } = storeToRefs(capabilityStore)

const navBarClosed = ref<boolean>(false)

const isAccountInformationActive = useActiveLocation(isLocationAccountActive, 'account-information')
const isAccountPreferencesActive = useActiveLocation(isLocationAccountActive, 'account-preferences')
const isAccountExtensionsActive = useActiveLocation(isLocationAccountActive, 'account-extensions')
const isAccountCalendarActive = useActiveLocation(isLocationAccountActive, 'account-calendar')
const isAccountGdprActive = useActiveLocation(isLocationAccountActive, 'account-gdpr')

const preferencesPanelExtensions = computed(() => {
  return extensionRegistry.requestExtensions(preferencesPanelExtensionPoint)
})

const navItems = computed(() => {
  if (!authStore.userContextReady) {
    return [
      {
        name: $gettext('Preferences'),
        route: { name: 'account-preferences', query: routeToContextQuery(unref(route)) }, // Persist query for hybrid auth context
        icon: 'settings-4',
        active: unref(isAccountPreferencesActive)
      }
    ]
  }

  const baseItems = [
    {
      name: $gettext('Profile'),
      route: { name: 'account-information' },
      icon: 'id-card',
      active: unref(isAccountInformationActive)
    },
    {
      name: $gettext('Preferences'),
      route: { name: 'account-preferences' },
      icon: 'settings-4',
      active: unref(isAccountPreferencesActive)
    },
    {
      name: $gettext('Extensions'),
      route: { name: 'account-extensions' },
      icon: 'brush-2',
      active: unref(isAccountExtensionsActive)
    },
    ...(unref(supportRadicale)
      ? [
          {
            name: $gettext('Calendar'),
            route: { name: 'account-calendar' },
            icon: 'calendar',
            active: unref(isAccountCalendarActive)
          }
        ]
      : []),
    {
      name: $gettext('GDPR'),
      route: { name: 'account-gdpr' },
      icon: 'git-repository',
      active: unref(isAccountGdprActive)
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

const setNavBarClosed = (closed: boolean) => {
  navBarClosed.value = closed
}

const handleLeftSideBarOnResize = () => {
  const breakpoint = 960
  if (window.innerWidth < breakpoint) {
    setNavBarClosed(true)
    return
  }
  setNavBarClosed(false)
}

onMounted(async () => {
  await nextTick()
  window.addEventListener('resize', handleLeftSideBarOnResize)
  handleLeftSideBarOnResize()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleLeftSideBarOnResize)
})
</script>
