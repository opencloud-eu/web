<template>
  <div
    id="web-nav-sidebar"
    class="bg-role-surface-container z-40 flex flex-col rounded-l-xl overflow-hidden transition-all duration-350 ease-[cubic-bezier(0.34,0.11,0,1.12)]"
    :class="{
      'max-w-[62px] min-w-[62px]': closed,
      'max-w-[230px] min-w-[230px]': !closed
    }"
  >
    <oc-button
      appearance="raw"
      :class="{ 'pr-2': !closed }"
      class="toggle-sidebar-button pb-2 pt-4 min-h-10.5 hover:overflow-hidden transition-all duration-200 ease-out"
      :aria-label="$gettext('Toggle sidebar')"
      :aria-expanded="!closed"
      :justify-content="closed ? 'center' : 'right'"
      no-hover
      @click="$emit('update:nav-bar-closed', !closed)"
    >
      <oc-icon
        size="large"
        fill-type="line"
        class="raw-hover-surface rounded-sm"
        :name="toggleSidebarButtonIcon"
      />
    </oc-button>
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
          :index="getUuid()"
          :target="link.route"
          :active="link.active"
          :icon="link.icon"
          :fill-type="link.fillType"
          :name="link.name"
          :collapsed="closed"
          :handler="link.handler"
        />
      </oc-list>
    </nav>
    <!-- @slot bottom content of the sidebar -->
    <slot name="bottom">
      <div
        v-show="!closed"
        class="versions flex flex-col justify-end items-start grow pb-4 pl-4 text-xs text-role-on-surface-variant"
      >
        <span v-text="backendVersion" />
        <version-check />
      </div>
    </slot>
  </div>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  nextTick,
  onBeforeUnmount,
  onMounted,
  PropType,
  ref,
  unref,
  watch
} from 'vue'
import { v4 as uuidV4 } from 'uuid'
import SidebarNavItem from './SidebarNavItem.vue'
import { NavItem } from '../../helpers/navItems'
import { getBackendVersion, getWebVersion } from '../../container/versions'
import { useCapabilityStore } from '@opencloud-eu/web-pkg'
import VersionCheck from '../VersionCheck.vue'

type NavItemRef = InstanceType<typeof SidebarNavItem>

export default defineComponent({
  components: {
    VersionCheck,
    SidebarNavItem
  },
  props: {
    navItems: {
      type: Array as PropType<NavItem[]>,
      required: true
    },
    closed: { type: Boolean, default: false }
  },
  emits: ['update:nav-bar-closed'],
  setup(props) {
    let resizeObserver: ResizeObserver
    const navItemRefs = ref<Record<string, NavItemRef>>({})
    const highlighterAttrs = ref<Record<string, unknown>>({})
    const capabilityStore = useCapabilityStore()

    const webVersion = computed(() => getWebVersion())
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
      const activeItemIndex = props.navItems.findIndex((n) => n.active)
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
      () => props.navItems,
      async () => {
        await nextTick()
        updateHighlighterPosition()
      },
      { deep: true, immediate: true }
    )

    return { highlighterAttrs, navItemRefs, backendVersion, webVersion }
  },
  computed: {
    toggleSidebarButtonIcon() {
      return this.closed ? 'arrow-drop-right' : 'arrow-drop-left'
    },

    isAnyNavItemActive() {
      return this.navItems.some((i) => i.active === true)
    }
  },
  methods: {
    getUuid() {
      return uuidV4().replaceAll('-', '')
    }
  }
})
</script>
