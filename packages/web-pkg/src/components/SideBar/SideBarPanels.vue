<template>
  <oc-spinner v-if="loading" :aria-label="$gettext('Loading sidebar content')" />
  <template v-else>
    <div
      v-for="panel in displayPanels"
      :id="`sidebar-panel-${panel.name}`"
      :key="`panel-${panel.name}`"
      :data-testid="`sidebar-panel-${panel.name}`"
      :tabindex="activePanelName === panel.name ? -1 : null"
      class="sidebar-panel absolute top-0 grid grid-rows-[auto_auto_1fr] bg-role-surface w-full size-full max-w-full max-h-full motion-reduce:transition-none"
      :inert="activePanelName !== panel.name"
      :class="{
        'is-root-panel transition-[right] duration-[0.4s,0s]': panel.isRoot?.(panelContext),
        'is-active-sub-panel': hasActiveSubPanel && activeSubPanelName === panel.name, // only one specific sub panel can be active
        'is-active-root-panel transition-[right] duration-[0.4s,0s]':
          hasActiveRootPanel && panel.isRoot?.(panelContext) // all root panels are active if no sub panel is active
      }"
    >
      <div
        v-if="[activePanelName, oldPanelName].includes(panel.name)"
        class="sidebar-panel__header header grid grid-cols-[auto_1fr_auto] items-center pt-2 px-2"
      >
        <oc-button
          v-if="!panel.isRoot?.(panelContext)"
          v-oc-tooltip="accessibleLabelBack"
          class="header__back col-start-1 p-1"
          appearance="raw"
          :aria-label="accessibleLabelBack"
          @click="closePanel"
        >
          <oc-icon name="arrow-left-s" fill-type="line" />
        </oc-button>

        <h2 class="col-start-2 text-center my-0 text-lg">
          {{ panel.title(panelContext) }}
        </h2>

        <oc-button
          appearance="raw"
          class="header__close col-start-3 p-1"
          :aria-label="$gettext('Close file sidebar')"
          @click="closeSidebar"
        >
          <oc-icon name="close" />
        </oc-button>
      </div>

      <div>
        <slot v-if="panel.isRoot?.(panelContext)" name="rootHeader" />
        <slot v-else name="subHeader" />
      </div>
      <div
        class="sidebar-panel__body flex flex-col p-2 overflow-y-auto overflow-x-hidden"
        :class="[`sidebar-panel__body-${panel.name}`]"
      >
        <div
          class="sidebar-panel__body-content"
          :class="{
            'flex-1 ': !panel.isRoot?.(panelContext)
          }"
        >
          <slot name="body">
            <div
              v-for="(p, index) in panel.isRoot?.(panelContext) ? rootPanels : [panel]"
              :key="`sidebar-panel-${p.name}`"
            >
              <component
                :is="p.component"
                v-if="
                  hasActiveRootPanel
                    ? p.isRoot?.(panelContext)
                    : [activePanelName, oldPanelName].includes(p.name)
                "
                :class="{ 'multi-root-panel-separator mt-4 pt-2 border-t': index > 0 }"
                class="rounded-sm"
                v-bind="p.componentAttrs?.(panelContext) || {}"
              />
            </div>
          </slot>
        </div>

        <div v-if="panel.isRoot?.(panelContext) && subPanels.length > 0" class="mt-4">
          <oc-button
            v-for="panelSelect in subPanels"
            :id="`sidebar-panel-${panelSelect.name}-select`"
            :key="`panel-select-${panelSelect.name}`"
            :data-testid="`sidebar-panel-${panelSelect.name}-select`"
            appearance="raw-inverse"
            color-role="surface"
            class="!grid !grid-cols-[auto_1fr_auto] text-left px-2 w-full h-12"
            @click="openPanel(panelSelect.name)"
          >
            <oc-icon :name="panelSelect.icon" :fill-type="panelSelect.iconFillType" />
            {{ panelSelect.title(panelContext) }}
            <oc-icon name="arrow-right-s" fill-type="line" />
          </oc-button>
        </div>
      </div>
    </div>
  </template>
</template>
<script setup lang="ts">
import { computed, ref, unref } from 'vue'
import { SideBarPanel, SideBarPanelContext } from './types'
import { useGettext } from 'vue3-gettext'

const {
  loading,
  availablePanels,
  panelContext,
  activePanel = ''
} = defineProps<{
  loading: boolean
  availablePanels: SideBarPanel<unknown, unknown, unknown>[]
  panelContext: SideBarPanelContext<unknown, unknown, unknown>
  activePanel?: string
}>()

const emit = defineEmits<{
  (e: 'selectPanel', panel: string): void
  (e: 'close'): void
  (e: 'closePanel'): void
}>()

defineSlots<{
  body: () => unknown
  rootHeader: () => unknown
  subHeader: () => unknown
}>()

const { $gettext } = useGettext()

const rootPanels = computed(() => {
  return availablePanels.filter((p) => p.isVisible(panelContext) && p.isRoot?.(panelContext))
})
const subPanels = computed(() =>
  availablePanels.filter((p) => p.isVisible(panelContext) && !p.isRoot?.(panelContext))
)
const displayPanels = computed<SideBarPanel<unknown, unknown, unknown>[]>(() => {
  if (unref(rootPanels).length) {
    return [unref(rootPanels)[0], ...unref(subPanels)]
  }
  return unref(subPanels)
})

const activeSubPanelName = computed(() => {
  const panelName = activePanel?.split('#')[0]
  if (!panelName) {
    return null
  }
  if (
    !unref(subPanels)
      .map((p) => p.name)
      .includes(panelName)
  ) {
    return null
  }
  return panelName
})
const hasActiveSubPanel = computed(() => {
  return unref(activeSubPanelName) !== null
})
const hasActiveRootPanel = computed(() => {
  return unref(activeSubPanelName) === null
})

const oldPanelName = ref<string>(null)
const setOldPanelName = (name: string) => {
  oldPanelName.value = name
}
const activePanelName = computed<string>(() => {
  if (unref(hasActiveSubPanel)) {
    return unref(activeSubPanelName)
  }
  return unref(rootPanels)[0].name
})

const accessibleLabelBack = computed(() => {
  if (unref(rootPanels).length === 1) {
    return $gettext('Back to %{panel} panel', {
      panel: unref(rootPanels)[0].title(panelContext)
    })
  }
  return $gettext('Back to main panels')
})

const setSidebarPanel = (panel: string) => {
  emit('selectPanel', panel)
}

const resetSidebarPanel = () => {
  emit('selectPanel', null)
}

const closeSidebar = () => {
  emit('close')
}

const openPanel = (panel: string) => {
  setOldPanelName(unref(activePanelName))
  setSidebarPanel(panel)
}

const closePanel = () => {
  setOldPanelName(unref(activePanelName))
  resetSidebarPanel()
  emit('closePanel')
}
</script>
<style scoped>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .sidebar-panel {
    /* visibility is here to prevent focusing panel child elements,
     * the transition delay keeps care that it will only apply if the element is visible or not.
     * hidden: if element is off screen
     * visible: if element is on screen */
    @apply invisible;
    transform: translateX(100%);
    transition:
      transform 0.4s ease,
      visibility 0.4s 0s;
  }
  .sidebar-panel.is-root-panel {
    right: 100px;
  }
}

@layer utilities {
  .sidebar-panel.is-active-root-panel {
    @apply right-0;
  }
  .sidebar-panel.is-active-root-panel,
  .sidebar-panel.is-active-sub-panel,
  .sidebar-panel.is-root-panel {
    transform: translateX(0);
  }
  .sidebar-panel.is-active-root-panel,
  .sidebar-panel.is-active-sub-panel {
    visibility: unset;
  }

  .sidebar-panel.is-root-panel {
    @apply visible;
  }
}
</style>
