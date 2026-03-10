<template>
  <div
    id="web-nav-sidebar"
    class="bg-role-surface-container z-40 flex flex-col rounded-l-xl overflow-hidden transition-all duration-350 ease-[cubic-bezier(0.34,0.11,0,1.12)] max-w-[230px] min-w-[230px]"
  >
    <nav class="oc-sidebar-nav mb-4 mt-2 px-1" :aria-label="$gettext('Sidebar navigation menu')">
      <app-floating-action-button />
      <oc-list class="relative">
        <sidebar-nav-item
          v-for="(link, index) in navItems"
          :ref="(el) => (navItemRefs[index] = el as NavItemRef)"
          :key="index"
          :target="link.route"
          :active="link.active"
          :icon="link.icon"
          :fill-type="link.fillType || 'line'"
          :name="link.name"
          :handler="link.handler"
        />
      </oc-list>
    </nav>
    <!-- @slot bottom content of the sidebar -->
    <slot name="bottom">
      <div
        class="versions flex flex-col justify-end items-start grow pb-4 pl-4 text-xs text-role-on-surface-variant"
      >
        <span v-text="backendVersion" />
        <version-check />
      </div>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import SidebarNavItem from './SidebarNavItem.vue'
import AppFloatingActionButton from '../AppFloatingActionButton.vue'
import { useCapabilityStore, VersionCheck, NavItem, getBackendVersion } from '@opencloud-eu/web-pkg'

type NavItemRef = InstanceType<typeof SidebarNavItem>

const { navItems } = defineProps<{ navItems: NavItem[] }>()

let resizeObserver: ResizeObserver
const navItemRefs = ref<Record<string, NavItemRef>>({})
const capabilityStore = useCapabilityStore()

const backendVersion = computed(() => getBackendVersion({ capabilityStore }))

onMounted(() => {
  const navBar = document.getElementById('web-nav-sidebar')
  const highlighter = document.getElementById('nav-highlighter')

  if (!highlighter || !navBar) {
    return
  }

  resizeObserver = new ResizeObserver(() => {
    const navItem = document.getElementsByClassName('oc-sidebar-nav-item-link')[0]
    if (!navItem) {
      return
    }
    highlighter.style.setProperty('transition-duration', `0.05s`)
    highlighter.style.setProperty('width', `${navItem.clientWidth}px`)
    highlighter.style.setProperty('height', `${navItem.clientHeight}px`)
  })
  resizeObserver.observe(navBar)
})

onBeforeUnmount(() => {
  resizeObserver.disconnect()
})
</script>
