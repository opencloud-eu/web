<template>
  <nav v-if="isVisible" id="mobile-nav">
    <oc-button
      id="mobile-nav-button"
      appearance="raw-inverse"
      color-role="chrome"
      no-hover
      aria-haspopup="dialog"
      :aria-label="$gettext('Show navigation menu')"
      :aria-expanded="isMenuOpen"
      @click="isMenuOpen = true"
    >
      <oc-icon name="menu" size-class="size-8" />
    </oc-button>
    <teleport to="body">
      <transition name="mobile-nav">
        <dialog
          v-if="isMenuOpen"
          class="mobile-nav-overlay fixed inset-0 bg-black/40 size-full z-[var(--z-index-modal)]"
          open
          aria-modal="true"
          aria-labelledby="sidebar-nav-mobile-title"
          @click="handleOverlayClick"
          @keydown.esc="isMenuOpen = false"
          @keydown.tab="trapFocus"
        >
          <div
            id="sidebar-nav-mobile-panel"
            ref="panelRef"
            tabindex="-1"
            class="fixed inset-y-0 left-0 sm:max-w-[85%] w-[85%] xs:w-[320px] bg-role-surface-container overflow-x-hidden"
          >
            <div class="flex flex-col h-full">
              <div class="flex items-center justify-between p-4">
                <h2 id="sidebar-nav-mobile-title" class="text-base m-0" v-text="$gettext('Menu')" />
                <oc-button
                  appearance="raw"
                  :aria-label="$gettext('Close navigation menu')"
                  no-hover
                  @click="isMenuOpen = false"
                >
                  <oc-icon name="close" />
                </oc-button>
              </div>
              <sidebar-nav
                class="!max-w-full h-full"
                :nav-items="navItems"
                @click="handleNavClick"
              />
            </div>
          </div>
        </dialog>
      </transition>
    </teleport>
  </nav>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, unref, useTemplateRef, watch } from 'vue'
import {
  CustomComponentExtension,
  useActiveApp,
  useExtensionRegistry,
  useNavItems
} from '@opencloud-eu/web-pkg'
import { useIsMobile } from '@opencloud-eu/design-system/composables'
import SidebarNav from './SidebarNav.vue'

const { requestExtensions } = useExtensionRegistry()
const { isTablet } = useIsMobile()
const { navItems } = useNavItems()
const activeApp = useActiveApp()

const isMenuOpen = ref(false)
const panelRef = useTemplateRef<HTMLElement>('panelRef')

watch(isMenuOpen, async (open) => {
  await nextTick()
  if (open) {
    unref(panelRef)?.focus()
    return
  }
  document.getElementById('mobile-nav-button')?.focus()
})

// keeps the focus inside the panel while the menu is open
function trapFocus(event: KeyboardEvent) {
  const focusable = unref(panelRef).querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]'
  )
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement
  if (event.shiftKey && (active === first || active === unref(panelRef))) {
    event.preventDefault()
    last.focus()
    return
  }
  if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

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
    unref(isTablet)
  )
})

watch(isTablet, () => {
  if (!unref(isTablet)) {
    isMenuOpen.value = false
  }
})
</script>

<style scoped>
@reference '@opencloud-eu/design-system/tailwind';

.mobile-nav-enter-active,
.mobile-nav-leave-active {
  @apply transition-opacity duration-200;
}

.mobile-nav-enter-active #sidebar-nav-mobile-panel,
.mobile-nav-leave-active #sidebar-nav-mobile-panel {
  @apply transition-transform duration-200;
}

.mobile-nav-enter-from,
.mobile-nav-leave-to {
  @apply opacity-0;
}

.mobile-nav-enter-from #sidebar-nav-mobile-panel,
.mobile-nav-leave-to #sidebar-nav-mobile-panel {
  @apply -translate-x-full;
}
</style>
