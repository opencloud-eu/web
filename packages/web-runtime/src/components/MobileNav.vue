<template>
  <nav id="mobile-nav">
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

<script lang="ts">
import { computed, defineComponent, PropType, unref } from 'vue'
import { NavItem } from '../helpers/navItems'
import { VersionCheck, useCapabilityStore } from '@opencloud-eu/web-pkg'
import { getBackendVersion } from '../container/versions'

export default defineComponent({
  name: 'MobileNav',
  components: { VersionCheck },
  props: {
    navItems: {
      type: Array as PropType<NavItem[]>,
      required: true
    }
  },
  setup(props) {
    const capabilityStore = useCapabilityStore()

    const backendVersion = computed(() => getBackendVersion({ capabilityStore }))
    const activeNavItem = computed(() => {
      return unref(props.navItems).find((n) => n.active) || props.navItems[0]
    })

    return { activeNavItem, backendVersion }
  }
})
</script>
