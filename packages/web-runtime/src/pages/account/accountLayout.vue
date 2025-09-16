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
import { useActiveLocation, useAuthStore, useExtensionRegistry } from '@opencloud-eu/web-pkg/src'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, unref } from 'vue'
import { preferencesPanelExtensionPoint } from '../../extensionPoints'
import { useRoute } from 'vue-router'

interface ExtensionItem {
  name: string
  route: string
  icon: string
  active: boolean
}

const { $gettext } = useGettext()
const extensionRegistry = useExtensionRegistry()
const route = useRoute()
const authStore = useAuthStore()

const navBarClosed = ref<boolean>(false)

const preferencesPanelExtensions = computed(() => {
  return extensionRegistry.requestExtensions(preferencesPanelExtensionPoint)
})

const navItems = computed(() => {
  if (!authStore.userContextReady) {
    return [
      {
        name: $gettext('Preferences'),
        route: '/account/preferences',
        icon: 'settings-4',
        active: unref(useActiveLocation(isLocationAccountActive, 'account-preferences'))
      }
    ]
  }

  const baseItems = [
    {
      name: $gettext('Profile'),
      route: '/account/information',
      icon: 'id-card',
      active: unref(useActiveLocation(isLocationAccountActive, 'account-information'))
    },
    {
      name: $gettext('Preferences'),
      route: '/account/preferences',
      icon: 'settings-4',
      active: unref(useActiveLocation(isLocationAccountActive, 'account-preferences'))
    },
    {
      name: $gettext('Extensions'),
      route: '/account/extensions',
      icon: 'brush-2',
      active: unref(useActiveLocation(isLocationAccountActive, 'account-extensions'))
    },
    {
      name: $gettext('Calendar'),
      route: '/account/calendar',
      icon: 'calendar',
      active: unref(useActiveLocation(isLocationAccountActive, 'account-calendar'))
    },
    {
      name: $gettext('GDPR'),
      route: '/account/gdpr',
      icon: 'git-repository',
      active: unref(useActiveLocation(isLocationAccountActive, 'account-gdpr'))
    }
  ]

  const extensionItems: ExtensionItem[] = unref(preferencesPanelExtensions).map((ext) => ({
    name: ext.label(),
    route: `/account/extension?extension-id=${ext.id}`,
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
