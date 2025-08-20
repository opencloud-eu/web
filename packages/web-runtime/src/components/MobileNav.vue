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
          class="mobile-nav-item oc-width-1-1"
          :aria-current="item.active ? 'page' : null"
        >
          <oc-button
            type="router-link"
            appearance="raw"
            :to="item.route"
            class="oc-display-block p-2"
            :class="{ 'oc-secondary-container router-link-active': item.active }"
          >
            <span class="flex">
              <oc-icon :name="item.icon" />
              <span class="ml-4 text" v-text="item.name" />
            </span>
          </oc-button>
        </li>
      </oc-list>
    </oc-drop>
  </nav>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, unref } from 'vue'
import { NavItem } from '../helpers/navItems'

export default defineComponent({
  name: 'MobileNav',
  props: {
    navItems: {
      type: Array as PropType<NavItem[]>,
      required: true
    }
  },
  setup(props) {
    const activeNavItem = computed(() => {
      return unref(props.navItems).find((n) => n.active) || props.navItems[0]
    })

    return { activeNavItem }
  }
})
</script>
