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
import { useActiveLocation } from '@opencloud-eu/web-pkg/src'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, unref } from 'vue'

const { $gettext } = useGettext()

const navBarClosed = ref<boolean>(false)

const navItems = computed(() => [
  {
    name: $gettext('Profile'),
    route: '/account',
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
    name: $gettext('App Tokens'),
    route: '/account/app-tokens',
    icon: 'key-2',
    active: unref(useActiveLocation(isLocationAccountActive, 'account-app-tokens'))
  },
  {
    name: $gettext('GDPR'),
    route: '/account/gdpr',
    icon: 'git-repository',
    active: unref(useActiveLocation(isLocationAccountActive, 'account-gdpr'))
  }
])

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
