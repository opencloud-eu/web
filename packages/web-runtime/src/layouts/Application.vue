<template>
  <div id="web-content">
    <div id="global-progress-bar">
      <custom-component-target :extension-point="progressBarExtensionPoint" />
    </div>
    <div id="web-content-header">
      <div v-if="isIE11" class="oc-surface-container oc-text-center oc-py-m">
        <p class="oc-m-rm" v-text="ieDeprecationWarning" />
      </div>
      <top-bar :applications-list="Object.values(apps)" />
    </div>
    <div id="web-content-main" class="oc-px-s oc-pb-s">
      <div class="app-container oc-flex">
        <app-loading-spinner v-if="isLoading" />
        <template v-else>
          <sidebar-nav
            v-if="isSidebarVisible"
            class="app-navigation"
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
            class="app-content oc-width-1-1"
            :name="name"
          />
        </template>
      </div>

      <portal-target name="app.runtime.bottom.drawer" />
      <portal-target name="app.runtime.footer" />
    </div>
    <div class="snackbars">
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
  useAppsStore,
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

import '@uppy/core/dist/style.min.css'
import { storeToRefs } from 'pinia'
import { progressBarExtensionPoint } from '../extensionPoints'

const MOBILE_BREAKPOINT = 640

const router = useRouter()
const route = useRoute()
const { $gettext } = useGettext()
const authStore = useAuthStore()
const activeApp = useActiveApp()
const extensionRegistry = useExtensionRegistry()
const { isSideBarOpen } = useSideBar()

const appsStore = useAppsStore()
const { apps } = storeToRefs(appsStore)

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
<style lang="scss">
#web-content {
  display: flex;
  flex-flow: column;
  flex-wrap: nowrap;
  height: 100vh;

  #global-progress-bar {
    z-index: 10;
    position: absolute;
    top: 0;
    width: 100%;
  }

  #web-content-header,
  #web-content-main {
    flex-shrink: 1;
    flex-basis: auto;
  }

  #web-content-header {
    flex-grow: 0;
  }

  #web-content-main {
    align-items: flex-start;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    justify-content: flex-start;
    overflow-y: hidden;

    .app-container {
      height: 100%;
      background: var(--oc-role-surface-container);
      border-radius: 15px;
      overflow: hidden;
      width: 100%;

      .app-content {
        background: var(--oc-role-surface);
        border-top-left-radius: 15px;
        border-bottom-left-radius: 15px;
        transition: all 0.35s cubic-bezier(0.34, 0.11, 0, 1.12);
      }
    }
  }

  .snackbars {
    position: absolute;
    right: 20px;
    bottom: 20px;
    z-index: calc(var(--oc-z-index-modal) + 1);

    @media (max-width: 640px) {
      left: 0;
      right: 0;
      margin: 0 auto;
      width: 100%;
      max-width: 500px;
    }
  }
}
</style>
