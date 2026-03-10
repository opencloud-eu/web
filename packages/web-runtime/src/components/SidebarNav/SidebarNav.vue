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
import { computed } from 'vue'
import SidebarNavItem from './SidebarNavItem.vue'
import AppFloatingActionButton from '../AppFloatingActionButton.vue'
import { useCapabilityStore, VersionCheck, NavItem, getBackendVersion } from '@opencloud-eu/web-pkg'

const { navItems } = defineProps<{ navItems: NavItem[] }>()

const capabilityStore = useCapabilityStore()
const backendVersion = computed(() => getBackendVersion({ capabilityStore }))
</script>
