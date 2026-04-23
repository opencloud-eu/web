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
          <sidebar-nav v-if="isSidebarVisible" :nav-items="navItems" />
          <app-floating-action-button />
          <router-view
            v-for="name in ['default', 'app', 'fullscreen']"
            :key="`router-view-${name}`"
            class="app-content border w-full bg-role-surface rounded-l-xl transition-all duration-350 ease-[cubic-bezier(0.34,0.11,0,1.12)]"
            :name="name"
          />
        </template>
      </div>

      <div id="app-runtime-bottom-drawer" />
      <div id="mobile-right-sidebar" />
      <div id="app-runtime-footer" class="w-full" />
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
import {
  AppLoadingSpinner,
  CustomComponentExtension,
  CustomComponentTarget,
  FloatingActionButtonExtension,
  useActiveApp,
  useExtensionRegistry
} from '@opencloud-eu/web-pkg'
import { useIsMobile } from '@opencloud-eu/design-system/composables'
import TopBar from '../components/Topbar/TopBar.vue'
import MessageBar from '../components/MessageBar.vue'
import SidebarNav from '../components/SidebarNav/SidebarNav.vue'
import UploadInfo from '../components/UploadInfo.vue'
import { useRouteMeta, useSpacesLoading, useNavItems } from '@opencloud-eu/web-pkg'
import { computed, nextTick, onMounted, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { progressBarExtensionPoint } from '../extensionPoints'
import AppFloatingActionButton from '../components/AppFloatingActionButton.vue'

const { $gettext } = useGettext()
const { navItems } = useNavItems()
const { requestExtensions } = useExtensionRegistry()
const activeApp = useActiveApp()

const requiredAuthContext = useRouteMeta('authContext')
const { areSpacesLoading } = useSpacesLoading()
const isLoading = computed(() => {
  if (['anonymous', 'idp'].includes(unref(requiredAuthContext))) {
    return false
  }
  return unref(areSpacesLoading)
})

const { isTablet } = useIsMobile()

const hasFloatingActionButton = computed(() => {
  return !!requestExtensions<FloatingActionButtonExtension>({
    id: `app.${unref(activeApp)}.floating-action-button`,
    extensionType: 'floatingActionButton'
  }).filter(({ isVisible }) => !isVisible || isVisible()).length
})

const hasSidebarNavExtension = computed(() => {
  const mainExtensionPoint = {
    id: `app.${unref(activeApp)}.sidebar-nav.main`,
    extensionType: 'customComponent'
  }
  const bottomExtensionPoint = {
    id: `app.${unref(activeApp)}.sidebar-nav.bottom`,
    extensionType: 'customComponent'
  }
  return (
    requestExtensions<CustomComponentExtension>(mainExtensionPoint).length > 0 ||
    requestExtensions<CustomComponentExtension>(bottomExtensionPoint).length > 0
  )
})

const isSidebarVisible = computed(() => {
  return (
    !unref(isTablet) &&
    (unref(navItems).length || unref(hasFloatingActionButton) || unref(hasSidebarNavExtension))
  )
})

const isIE11 = !!(window as any).MSInputMethodContext && !!(document as any).documentMode

const ieDeprecationWarning = computed(() =>
  $gettext(
    'Internet Explorer (your current browser) is not officially supported. For security reasons, please switch to another browser.'
  )
)

onMounted(async () => {
  await nextTick()
})
</script>
