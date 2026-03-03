<template>
  <header
    id="oc-topbar"
    class="sticky grid z-50 items-center px-4 h-auto sm:h-13 sm:gap-10 grid-rows-[52px_auto] grid-cols-[auto_9fr_1fr]"
    :aria-label="$gettext('Top bar')"
  >
    <div class="flex items-center flex-start gap-2.5 sm:gap-5 col-1">
      <applications-menu
        v-if="appMenuExtensions.length && !isEmbedModeEnabled"
        :menu-items="appMenuExtensions"
      />
      <router-link v-if="!hideLogo" :to="homeLink" class="w-full oc-logo-href">
        <picture>
          <source
            :srcset="currentTheme.logoMobile || currentTheme.logo"
            media="(max-width: 959px)"
          />
          <oc-image
            :src="currentTheme.logo"
            :alt="sidebarLogoAlt"
            class="oc-logo-image align-middle ml-1 max-h-[26px] select-none"
          />
        </picture>
      </router-link>
    </div>
    <div class="topbar-center flex justify-end sm:justify-center col-2">
      <custom-component-target :extension-point="topBarCenterExtensionPoint" />
    </div>
    <div class="flex items-center justify-end gap-5 col-3">
      <template v-if="!isEmbedModeEnabled">
        <custom-component-target :extension-point="topBarRightExtensionPoint" />
        <feedback-link v-if="isFeedbackLinkEnabled" v-bind="feedbackLinkOptions" />
        <notifications v-if="isNotificationBellEnabled" />
        <side-bar-toggle
          v-if="isSideBarToggleVisible"
          :disabled="isSideBarToggleDisabled"
          class="hidden sm:flex"
        />
        <user-menu />
      </template>
    </div>
    <custom-component-target :extension-point="topBarLeftExtensionPoint" />
  </header>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, unref } from 'vue'
import ApplicationsMenu from './ApplicationsMenu.vue'
import UserMenu from './UserMenu.vue'
import Notifications from './Notifications.vue'
import FeedbackLink from './FeedbackLink.vue'
import SideBarToggle from './SideBarToggle.vue'
import {
  CustomComponentTarget,
  useAuthStore,
  useCapabilityStore,
  useConfigStore,
  useEmbedMode,
  useExtensionRegistry,
  useRouter,
  useThemeStore
} from '@opencloud-eu/web-pkg'
import { routeNames } from '../../router/names'
import {
  appMenuExtensionPoint,
  topBarCenterExtensionPoint,
  topBarLeftExtensionPoint,
  topBarRightExtensionPoint
} from '../../extensionPoints'
import { RouteLocationNormalizedLoaded } from 'vue-router'
import { useGettext } from 'vue3-gettext'

const { $gettext } = useGettext()
const capabilityStore = useCapabilityStore()
const themeStore = useThemeStore()
const { currentTheme } = storeToRefs(themeStore)
const configStore = useConfigStore()
const { options: configOptions } = storeToRefs(configStore)
const extensionRegistry = useExtensionRegistry()

const authStore = useAuthStore()
const router = useRouter()
const { isEnabled: isEmbedModeEnabled } = useEmbedMode()

const appMenuExtensions = computed(() => {
  return extensionRegistry.requestExtensions(appMenuExtensionPoint)
})

const hideLogo = computed(() => unref(configOptions).hideLogo)

const isNotificationBellEnabled = computed(() => {
  return authStore.userContextReady && capabilityStore.notificationsOcsEndpoints.includes('list')
})

const homeLink = computed(() => {
  if (authStore.publicLinkContextReady && !authStore.userContextReady) {
    return {
      name: 'resolvePublicLink',
      params: { token: authStore.publicLinkToken }
    }
  }

  return '/'
})

const isRuntimeRoute = (route: RouteLocationNormalizedLoaded) => {
  return Object.values(routeNames).includes(route.name.toString())
}
const isSideBarToggleVisible = computed(() => {
  return authStore.userContextReady || authStore.publicLinkContextReady
})
const isSideBarToggleDisabled = computed(() => {
  return isRuntimeRoute(unref(router.currentRoute))
})

const sidebarLogoAlt = computed(() => {
  return $gettext('Navigate to personal files page')
})

const isFeedbackLinkEnabled = computed(() => {
  return !unref(configOptions).disableFeedbackLink
})

const feedbackLinkOptions = computed(() => {
  const feedback = unref(configOptions).feedbackLink
  if (!unref(isFeedbackLinkEnabled) || !feedback) {
    return {}
  }

  return {
    ...(feedback.href && { href: feedback.href }),
    ...(feedback.ariaLabel && { ariaLabel: feedback.ariaLabel }),
    ...(feedback.description && { description: feedback.description })
  }
})
</script>
<style scoped>
@reference '@opencloud-eu/design-system/tailwind';

@layer utilities {
  #oc-topbar:has(> :last-child:nth-child(4)) .topbar-center {
    @apply hidden;
  }

  #oc-topbar .oc-logo-image {
    image-rendering: auto;
    image-rendering: crisp-edges;
    image-rendering: pixelated;
    image-rendering: -webkit-optimize-contrast;
  }
}
</style>
