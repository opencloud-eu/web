<template>
  <div
    id="web-nav-sidebar"
    class="bg-role-surface-container z-40 flex flex-col rounded-l-xl overflow-x-hidden overflow-y-auto transition-all duration-350 ease-[cubic-bezier(0.34,0.11,0,1.12)] max-w-[230px] min-w-[230px]"
  >
    <div class="flex flex-col grow">
      <nav class="oc-sidebar-nav mt-3 px-1" :aria-label="$gettext('Sidebar navigation menu')">
        <div v-if="floatingActionButton && !isTablet" class="pb-3 px-2">
          <oc-button
            :id="getButtonId(floatingActionButton.id)"
            :disabled="isFloatingActionButtonDisabled"
            appearance="filled"
            class="oc-app-floating-action-button w-full"
            @click="floatingActionButton.handler?.()"
          >
            <oc-icon :name="floatingActionButton.icon" />
            <span v-text="floatingActionButton.label()" />
          </oc-button>
          <template
            v-if="floatingActionButton.dropComponent && floatingActionButton.mode() === 'drop'"
          >
            <component
              :is="floatingActionButton.dropComponent"
              :toggle="`#${getButtonId(floatingActionButton.id)}`"
            />
          </template>
        </div>
        <oc-list class="relative">
          <sidebar-nav-item
            v-for="(link, index) in navItems"
            :key="index"
            :target="link.route"
            :active="link.active"
            :icon="link.icon"
            :fill-type="link.active ? 'fill' : 'line'"
            :name="link.name"
            :handler="link.handler"
          />
        </oc-list>
      </nav>
      <custom-component-target :extension-point="dynamicExtensionPointMain" />
    </div>
    <div class="flex flex-col gap-2">
      <custom-component-target :extension-point="dynamicExtensionPointBottom" />
      <div class="flex flex-col pb-4 px-4 text-xs text-role-on-surface-variant">
        <span v-text="backendVersion" />
        <version-check />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, unref, watchEffect } from 'vue'
import SidebarNavItem from './SidebarNavItem.vue'
import {
  useCapabilityStore,
  VersionCheck,
  NavItem,
  getBackendVersion,
  CustomComponentTarget,
  ExtensionPoint,
  CustomComponentExtension,
  useActiveApp,
  useExtensionRegistry,
  FloatingActionButtonExtension
} from '@opencloud-eu/web-pkg'
import { useIsMobile } from '@opencloud-eu/design-system/composables'

const { navItems } = defineProps<{ navItems: NavItem[] }>()

const capabilityStore = useCapabilityStore()
const backendVersion = computed(() => getBackendVersion({ capabilityStore }))

const activeApp = useActiveApp()
const { requestExtensions } = useExtensionRegistry()

const { isTablet } = useIsMobile()

const dynamicExtensionPointMain = computed<ExtensionPoint<CustomComponentExtension>>(() => ({
  id: `app.${unref(activeApp)}.sidebar-nav.main`,
  extensionType: 'customComponent'
}))
const dynamicExtensionPointBottom = computed<ExtensionPoint<CustomComponentExtension>>(() => ({
  id: `app.${unref(activeApp)}.sidebar-nav.bottom`,
  extensionType: 'customComponent'
}))

const isFloatingActionButtonDisabled = ref(true)

const floatingActionButton = computed(() => {
  return requestExtensions<FloatingActionButtonExtension>({
    id: `app.${unref(activeApp)}.floating-action-button`,
    extensionType: 'floatingActionButton'
  }).find(({ isVisible }) => !isVisible || isVisible())
})

function getButtonId(extensionId: string): string {
  return `app-floating-action-button-${extensionId.replace(/\./g, '-')}`
}

let timeoutId: ReturnType<typeof setTimeout> | null = null

// use a timeout to avoid flickering of the floating action button in case the isFloatingActionButtonDisabled state changes rapidly
watchEffect(() => {
  const disabled = unref(floatingActionButton)?.isDisabled?.() ?? false
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
  timeoutId = setTimeout(() => {
    isFloatingActionButtonDisabled.value = disabled
    timeoutId = null
  }, 50)
})

onBeforeUnmount(() => {
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
})
</script>
