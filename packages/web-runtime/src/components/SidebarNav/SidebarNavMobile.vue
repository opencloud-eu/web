<template>
  <nav v-if="isVisible" id="mobile-nav">
    <oc-button
      id="mobile-nav-button"
      appearance="raw-inverse"
      color-role="chrome"
      no-hover
      aria-current="page"
      :aria-label="$gettext('Show navigation menu')"
      @click="isMenuOpen = true"
    >
      <oc-icon name="menu" size="large" />
    </oc-button>
    <teleport to="body">
      <dialog
        class="mobile-nav-overlay fixed inset-0 bg-black/40 size-full z-[var(--z-index-modal)]"
        :open="isMenuOpen"
        @click="handleOverlayClick"
      >
        <div
          id="sidebar-nav-mobile-panel"
          tabindex="-1"
          class="fixed inset-y-0 left-0 w-[95%] bg-role-surface-container transition-transform duration-200 -translate-x-full overflow-x-hidden"
          :class="{ '[&.active]:translate-x-0': isMenuOpen }"
        >
          <div class="flex flex-col p-4 h-full">
            <div class="flex items-center justify-between">
              <h2 class="text-base" v-text="$gettext('Menu')" />
              <oc-button
                appearance="raw"
                :aria-label="$gettext('Close navigation menu')"
                no-hover
                @click="isMenuOpen = false"
              >
                <oc-icon name="close" />
              </oc-button>
            </div>
            <sidebar-nav class="mobile-nav-sidebar" :nav-items="navItems" @click="handleNavClick" />
          </div>
        </div>
      </dialog>
    </teleport>
  </nav>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, unref, watch } from 'vue'
import {
  CustomComponentExtension,
  useActiveApp,
  useExtensionRegistry,
  useNavItems
} from '@opencloud-eu/web-pkg'
import { useIsMobile } from '@opencloud-eu/design-system/composables'
import SidebarNav from './SidebarNav.vue'

const { requestExtensions } = useExtensionRegistry()
const { isMobile } = useIsMobile()
const { navItems } = useNavItems()
const activeApp = useActiveApp()

const isMenuOpen = ref(false)

function handleNavClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  const button = target.closest('button, a')
  if (button) {
    isMenuOpen.value = false
  }
}

function handleOverlayClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    isMenuOpen.value = false
  }
}

const isVisible = computed(() => {
  const mainExtensionPoint = {
    id: `app.${unref(activeApp)}.sidebar-nav.main`,
    extensionType: 'customComponent'
  }
  const bottomExtensionPoint = {
    id: `app.${unref(activeApp)}.sidebar-nav.bottom`,
    extensionType: 'customComponent'
  }
  return (
    (requestExtensions<CustomComponentExtension>(mainExtensionPoint).length > 0 ||
      requestExtensions<CustomComponentExtension>(bottomExtensionPoint).length > 0 ||
      unref(navItems).length > 0) &&
    unref(isMobile)
  )
})

watch(
  () => isMenuOpen.value,
  async () => {
    const panelEl = document.getElementById('sidebar-nav-mobile-panel')
    if (!panelEl) {
      return
    }

    if (isMenuOpen.value) {
      await nextTick()
      requestAnimationFrame(() => panelEl.classList.add('active'))
      return
    }

    panelEl.classList.remove('active')
  }
)

watch(isMobile, () => {
  if (!unref(isMobile)) {
    isMenuOpen.value = false
  }
})
</script>

<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer utilities {
  .mobile-nav-sidebar {
    @apply max-w-100 h-full;
  }

  .mobile-nav-sidebar .oc-sidebar-nav {
    @apply !px-0;
  }

  .mobile-nav-sidebar .oc-sidebar-nav-item {
    @apply !px-0;
  }
}
</style>
