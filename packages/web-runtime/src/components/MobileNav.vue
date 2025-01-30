<template>
  <nav id="mobile-nav">
    <oc-button id="mobile-nav-button" appearance="raw" aria-current="page">
      {{ activeNavItem.name }}
      <oc-icon name="arrow-drop-down" />
    </oc-button>
    <oc-drop
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
            variation="passive"
            :to="item.route"
            class="oc-display-block oc-p-s"
            :class="{ 'oc-secondary-container router-link-active': item.active }"
          >
            <span class="oc-flex">
              <oc-icon :name="item.icon" variation="inherit" />
              <span class="oc-ml-m text" v-text="item.name" />
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

<style lang="scss" scoped>
#mobile-nav {
  li {
    margin: var(--oc-space-xsmall) 0;

    &:first-child {
      margin-top: 0;
    }

    &:last-child {
      margin-bottom: 0;
    }

    a {
      &:focus,
      &:hover {
        background-color: var(--oc-color-background-hover);
        text-decoration: none;
      }
    }
  }
}
</style>
