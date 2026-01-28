<template>
  <Teleport to="#mobile-right-sidebar" :disabled="!isMobile">
    <component
      :is="isMobile ? 'oc-bottom-drawer' : 'div'"
      id="app-sidebar"
      tabindex="-1"
      v-bind="sidebarProps"
    >
      <side-bar-panels
        :loading="loading"
        :available-panels="availablePanels"
        :panel-context="panelContext"
        :active-panel="activePanel"
        @select-panel="setSidebarPanel"
        @close="emit('close')"
        @close-panel="focusSidebar"
      >
        <template #body>
          <slot name="body" />
        </template>
        <template #rootHeader>
          <slot name="rootHeader" />
        </template>
        <template #subHeader>
          <slot name="subHeader" />
        </template>
      </side-bar-panels>
    </component>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onUnmounted, unref, useAttrs } from 'vue'
import { SideBarPanel, SideBarPanelContext } from './types'
import SideBarPanels from './SideBarPanels.vue'
import { useIsMobile } from '@opencloud-eu/design-system/composables'
import { SideBarEventTopics, useEventBus, useSideBar } from '../../composables'

const {
  loading,
  availablePanels,
  panelContext,
  activePanel = ''
} = defineProps<{
  isOpen: boolean
  loading: boolean
  availablePanels: SideBarPanel<unknown, unknown, unknown>[]
  panelContext: SideBarPanelContext<unknown, unknown, unknown>
  activePanel?: string
}>()

const emit = defineEmits<{
  (e: 'selectPanel', panel: string): void
  (e: 'close'): void
}>()

defineSlots<{
  body: () => unknown
  rootHeader: () => unknown
  subHeader: () => unknown
}>()

defineOptions({ inheritAttrs: false })
const attrs = useAttrs()

const { isMobile } = useIsMobile()
const eventBus = useEventBus()
const { focusSidebar } = useSideBar()

const sidebarProps = computed(() => {
  if (unref(isMobile)) {
    // bottom drawer props for mobile
    return {
      ...unref(attrs),
      isFocusTrapActive: !loading,
      hasFullHeight: true,
      maxHeight: 'max-h-[80vh]',
      class: 'z-100',
      onClicked: onBottomDrawerClicked
    }
  }

  const classes = [
    'border-l',
    'focus:outline-0',
    'focus-visible:outline-0',
    'w-[440px]',
    'min-w-[440px]',
    'overflow-hidden',
    'relative',
    'focus:shadow-none',
    'focus-visible:shadow-none',
    ...(unref(attrs)?.class ? [unref(attrs).class] : [])
  ]
  if (loading) {
    classes.push('flex', 'justify-center', 'items-center')
  }
  return {
    ...unref(attrs),
    class: classes
  }
})

const onBottomDrawerClicked = (event: MouseEvent) => {
  if (!event.target) {
    return
  }

  const bottomDrawerOutsideClicked = event.target === event.currentTarget
  const linkClicked = event.target instanceof HTMLAnchorElement
  const actionPanelItemClicked = (event.target as HTMLElement).closest('ul.sidebar-actions-panel')
  if (bottomDrawerOutsideClicked || linkClicked || actionPanelItemClicked) {
    // in some scenarios we want to close the bottom drawer, e.g. when clicking outside or on a file action
    closeSidebar()
  }
}
const closeSidebar = () => {
  eventBus.publish(SideBarEventTopics.close)
  emit('close')
}
const setSidebarPanel = (panel: string) => {
  emit('selectPanel', panel)
}

onUnmounted(() => {
  if (unref(isMobile)) {
    // in mobile, when the sidebar is unmounted, we assume a route change > close bottom drawer
    closeSidebar()
  }
})
</script>
