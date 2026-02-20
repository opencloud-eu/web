<template>
  <div
    id="web-nav-sidebar"
    class="bg-role-surface-container z-40 flex flex-col rounded-l-xl overflow-hidden transition-all duration-350 ease-[cubic-bezier(0.34,0.11,0,1.12)] max-w-[230px] min-w-[230px]"
  >
    <nav class="oc-sidebar-nav mb-4 mt-2 px-1" :aria-label="$gettext('Sidebar navigation menu')">
      <div
        v-show="isAnyNavItemActive"
        id="nav-highlighter"
        class="absolute ml-2 bg-role-secondary-container text-role-on-secondary-container rounded-sm transition-transform duration-200 ease-[cubic-bezier(0.51, 0.06, 0.56, 1.37)]"
        v-bind="highlighterAttrs"
        :aria-hidden="true"
      />
      <oc-list class="relative">
        <sidebar-nav-item
          v-for="(link, index) in navItems"
          :ref="(el) => (navItemRefs[index] = el as NavItemRef)"
          :key="index"
          :target="link.route"
          :active="link.active"
          :icon="link.icon"
          :fill-type="link.fillType"
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, unref, watch } from 'vue'
import SidebarNavItem from './SidebarNavItem.vue'
import { useCapabilityStore, VersionCheck, NavItem, getBackendVersion } from '@opencloud-eu/web-pkg'

type NavItemRef = InstanceType<typeof SidebarNavItem>

const { navItems } = defineProps<{ navItems: NavItem[] }>()

let resizeObserver: ResizeObserver
const navItemRefs = ref<Record<string, NavItemRef>>({})
const highlighterAttrs = ref<Record<string, unknown>>({})
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

const updateHighlighterPosition = () => {
  const activeItemIndex = navItems.findIndex((n) => n.active)
  const activeEl = unref(navItemRefs)[activeItemIndex]
  if (activeEl) {
    highlighterAttrs.value = {
      style: {
        transform: `translateY(${activeEl.$el.offsetTop}px)`,
        'transition-duration': '0.2s'
      }
    }
  }
}

watch(
  () => navItems,
  async () => {
    await nextTick()
    updateHighlighterPosition()
  },
  { deep: true, immediate: true }
)

const isAnyNavItemActive = computed(() => {
  return navItems.some((i) => i.active === true)
})
</script>
