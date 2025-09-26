<template>
  <div id="web-content" class="flex flex-col flex-nowrap h-dvh">
    <div id="global-progress-bar" class="w-full absolute top-0 z-100">
      <custom-component-target :extension-point="progressBarExtensionPoint" />
    </div>
    <div id="web-content-header" class="shrink basis-auto grow-0">
      <div v-if="isIE11" class="bg-role-surface-container text-center py-4">
        <p class="m-0" v-text="ieDeprecationWarning" />
      </div>
      <top-bar />
    </div>
    <div
      id="web-content-main"
      class="flex flex-col items-start justify-start grow shrink basis-auto px-2 pb-2 overflow-y-hidden"
    >
      <div
        class="app-container flex bg-role-surface-container rounded-xl size-full overflow-hidden"
      >
        <app-loading-spinner v-if="isLoading" />
        <template v-else>
          <sidebar-nav
            v-if="isSidebarVisible"
            :nav-items="navItems"
            :closed="navBarClosed"
            @update:nav-bar-closed="setNavBarClosed"
          />
          <portal to="app.runtime.mobile.nav">
            <mobile-nav v-if="isMobileWidth && navItems.length" :nav-items="navItems" />
          </portal>
          <router-view
            v-for="name in ['default', 'app', 'fullscreen']"
            :key="`router-view-${name}`"
            class="app-content w-full bg-role-surface rounded-l-xl transition-all duration-350 ease-[cubic-bezier(0.34,0.11,0,1.12)]"
            :name="name"
          />
        </template>
      </div>

      <portal-target name="app.runtime.bottom.drawer" :multiple="true" />
      <portal-target name="app.runtime.footer" />
    </div>
    <div
      class="snackbars absolute inset-x-[20px] sm:left-auto bottom-[20px] z-[calc(var(--z-index-modal)+1)]"
    >
      <message-bar />
      <upload-info />
    </div>
  </div>
</template>

<script setup lang="ts">
import orderBy from 'lodash-es/orderBy'
import {
  AppLoadingSpinner,
  CustomComponentTarget,
  useAuthStore,
  useExtensionRegistry,
  useLocalStorage,
  useSideBar
} from '@opencloud-eu/web-pkg'
import TopBar from '../components/Topbar/TopBar.vue'
import MessageBar from '../components/MessageBar.vue'
import SidebarNav from '../components/SidebarNav/SidebarNav.vue'
import UploadInfo from '../components/UploadInfo.vue'
import MobileNav from '../components/MobileNav.vue'
import { NavItem, getExtensionNavItems } from '../helpers/navItems'
import { useActiveApp, useRoute, useRouteMeta, useSpacesLoading } from '@opencloud-eu/web-pkg'
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, unref, watch } from 'vue'
import { RouteLocationAsRelativeTyped, useRouter } from 'vue-router'
import { useGettext } from 'vue3-gettext'
import { progressBarExtensionPoint } from '../extensionPoints'

const MOBILE_BREAKPOINT = 640

const router = useRouter()
const route = useRoute()
const { $gettext } = useGettext()
const authStore = useAuthStore()
const activeApp = useActiveApp()
const extensionRegistry = useExtensionRegistry()
const { isSideBarOpen } = useSideBar()

const extensionNavItems = computed(() =>
  getExtensionNavItems({ extensionRegistry, appId: unref(activeApp) })
)

// FIXME: we can convert to a single router-view without name (thus without the loop) and without this watcher when we release v6.0.0
watch(
  useRoute(),
  (route) => {
    if (unref(route).matched.length) {
      unref(route).matched.forEach((match) => {
        const keys = Object.keys(match.components).filter((key) => key !== 'default')
        if (keys.length) {
          console.warn(
            `named components are deprecated, use "default" instead of "${keys.join(
              ', '
            )}" on route ${String(route.name)}`
          )
        }
      })
    }
  },
  { immediate: true }
)

const requiredAuthContext = useRouteMeta('authContext')
const { areSpacesLoading } = useSpacesLoading()
const isLoading = computed(() => {
  if (['anonymous', 'idp'].includes(unref(requiredAuthContext))) {
    return false
  }
  return unref(areSpacesLoading)
})

const isMobileWidth = ref<boolean>(window.innerWidth < MOBILE_BREAKPOINT)
provide('isMobileWidth', isMobileWidth)

const handleLeftSideBarOnResize = () => {
  const breakpoint = unref(isSideBarOpen) ? 1200 : 960
  if (window.innerWidth < breakpoint) {
    setNavBarClosed(true)
    return
  }
  setNavBarClosed(false)
}

const onResize = () => {
  isMobileWidth.value = window.innerWidth < MOBILE_BREAKPOINT
  handleLeftSideBarOnResize()
}

watch(isSideBarOpen, handleLeftSideBarOnResize)

const navItems = computed<NavItem[]>(() => {
  if (!authStore.userContextReady) {
    return []
  }

  const { href: currentHref } = router.resolve(unref(route))
  return orderBy(
    unref(extensionNavItems).map((item) => {
      let active = typeof item.isActive !== 'function' || item.isActive()

      if (active) {
        active = [item.route, ...(item.activeFor || [])].filter(Boolean).some((currentItem) => {
          try {
            const comparativeHref = router.resolve(currentItem as RouteLocationAsRelativeTyped).href
            return currentHref.startsWith(comparativeHref)
          } catch (e) {
            console.error(e)
            return false
          }
        })
      }

      const name = typeof item.name === 'function' ? item.name() : item.name

      return {
        ...item,
        name: $gettext(name),
        active
      }
    }),
    ['priority', 'name']
  )
})

const isSidebarVisible = computed(() => {
  return unref(navItems).length && !unref(isMobileWidth)
})

const navBarClosed = useLocalStorage(`oc_navBarClosed`, false)
const setNavBarClosed = (value: boolean) => {
  navBarClosed.value = value
}

const isIE11 = !!(window as any).MSInputMethodContext && !!(document as any).documentMode

const ieDeprecationWarning = computed(() =>
  $gettext(
    'Internet Explorer (your current browser) is not officially supported. For security reasons, please switch to another browser.'
  )
)

onMounted(async () => {
  await nextTick()
  window.addEventListener('resize', onResize)
  onResize()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})
</script>
