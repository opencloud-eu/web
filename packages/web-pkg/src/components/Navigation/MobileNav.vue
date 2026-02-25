<template>
  <nav v-if="isMobile" id="mobile-nav">
    <oc-button id="mobile-nav-button" class="p-1" appearance="raw" aria-current="page">
      {{ activeNavItem.name }}
      <oc-icon name="arrow-drop-down" />
    </oc-button>
    <oc-drop
      :title="$gettext('Navigation')"
      drop-id="mobile-nav-drop"
      toggle="#mobile-nav-button"
      mode="click"
      padding-size="small"
      close-on-click
    >
      <oc-list>
        <li
          v-for="(item, index) in navItems"
          :key="index"
          class="mobile-nav-item w-full"
          :aria-current="item.active ? 'page' : null"
        >
          <oc-button
            type="router-link"
            :appearance="item.active ? 'filled' : 'raw-inverse'"
            :color-role="item.active ? 'secondaryContainer' : 'surface'"
            justify-content="left"
            :no-hover="item.active"
            :to="item.route"
            class="block p-2"
            :class="{ 'router-link-active': item.active }"
          >
            <span class="flex">
              <oc-icon :name="item.icon" />
              <span class="ml-4 text" v-text="item.name" />
            </span>
          </oc-button>
        </li>
      </oc-list>
      <div
        class="versions flex flex-col items-center justify-center py-2 mt-4 bg-role-surface-container text-xs text-role-on-surface-variant"
      >
        <div v-text="backendVersion" />
        <version-check />
      </div>
    </oc-drop>
  </nav>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { getBackendVersion } from '../../helpers/versions'
import { useCapabilityStore, useNavItems } from '../../composables'
import { useIsMobile } from '@opencloud-eu/design-system/composables'

const capabilityStore = useCapabilityStore()
const { isMobile } = useIsMobile()
const { navItems } = useNavItems()

const backendVersion = computed(() => getBackendVersion({ capabilityStore }))
const activeNavItem = computed(() => {
  return unref(navItems).find((n) => n.active) || unref(navItems)[0]
})
</script>
