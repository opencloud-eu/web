<template>
  <div
    id="app-sidebar"
    ref="appSideBar"
    data-testid="app-sidebar"
    tabindex="-1"
    :class="{
      'has-active-sub-panel': hasActiveSubPanel,
      'oc-flex oc-flex-center oc-flex-middle': loading,
      'app-sidebar-full-width': fullWidthSideBar
    }"
  >
    <oc-spinner v-if="loading" />
    <template v-else>
      <div
        v-for="panel in displayPanels"
        :id="`sidebar-panel-${panel.name}`"
        :key="`panel-${panel.name}`"
        :data-testid="`sidebar-panel-${panel.name}`"
        :tabindex="activePanelName === panel.name ? -1 : null"
        class="sidebar-panel"
        :inert="activePanelName !== panel.name"
        :class="{
          'is-root-panel': panel.isRoot?.(panelContext),
          'is-active-sub-panel': hasActiveSubPanel && activeSubPanelName === panel.name, // only one specific sub panel can be active
          'is-active-root-panel': hasActiveRootPanel && panel.isRoot?.(panelContext) // all root panels are active if no sub panel is active
        }"
      >
        <div
          v-if="[activePanelName, oldPanelName].includes(panel.name)"
          class="sidebar-panel__header header pt-2 px-2"
        >
          <oc-button
            v-if="!panel.isRoot?.(panelContext)"
            v-oc-tooltip="accessibleLabelBack"
            class="header__back p-1"
            appearance="raw"
            :aria-label="accessibleLabelBack"
            @click="closePanel"
          >
            <oc-icon name="arrow-left-s" fill-type="line" />
          </oc-button>

          <h2 class="header__title my-0">
            {{ panel.title(panelContext) }}
          </h2>

          <oc-button
            appearance="raw"
            class="header__close p-1"
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
        <div class="sidebar-panel__body" :class="[`sidebar-panel__body-${panel.name}`]">
          <div
            class="sidebar-panel__body-content"
            :class="{ 'sidebar-panel__body-content-stretch': !panel.isRoot?.(panelContext) }"
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
                  :class="{ 'multi-root-panel-separator mt-4 pt-2': index > 0 }"
                  class="oc-rounded"
                  v-bind="p.componentAttrs?.(panelContext) || {}"
                />
              </div>
            </slot>
          </div>

          <div
            v-if="panel.isRoot?.(panelContext) && subPanels.length > 0"
            class="sidebar-panel__navigation mt-4"
          >
            <oc-button
              v-for="panelSelect in subPanels"
              :id="`sidebar-panel-${panelSelect.name}-select`"
              :key="`panel-select-${panelSelect.name}`"
              :data-testid="`sidebar-panel-${panelSelect.name}-select`"
              appearance="raw-inverse"
              color-role="surface"
              class="px-2"
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
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  unref,
  useTemplateRef,
  watch
} from 'vue'
import { SideBarPanel, SideBarPanelContext } from './types'
import { useGettext } from 'vue3-gettext'

const {
  isOpen,
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

const { $gettext } = useGettext()
const appSideBar = useTemplateRef<HTMLElement>('appSideBar')

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

const windowWidth = ref(window.innerWidth)

const fullWidthSideBar = computed(() => unref(windowWidth) <= 580)
const backgroundContentEl = computed(() => {
  return unref(appSideBar)?.parentElement?.querySelector('div')
})

const handleBackgroundContentVisibility = () => {
  // handles the visibility of the content behind the sidebar. It needs to be hidden if
  // the sidebar is open and has full width to avoid focusable elements.
  if (!unref(backgroundContentEl)) {
    return
  }

  const visibility = unref(fullWidthSideBar) ? 'hidden' : 'visible'
  unref(backgroundContentEl).style.visibility = visibility
}

const onResize = () => {
  if (!isOpen) {
    return
  }

  windowWidth.value = window.innerWidth
  handleBackgroundContentVisibility()
}

watch(
  () => isOpen,
  async (isOpen) => {
    if (!isOpen) {
      return
    }
    await nextTick()
    handleBackgroundContentVisibility()
  },
  { immediate: true }
)

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
  unref(appSideBar).focus()
}

onMounted(() => {
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)

  if (unref(backgroundContentEl)) {
    unref(backgroundContentEl).style.visibility = 'visible'
  }
})
</script>

<style lang="scss">
#app-sidebar {
  border-left: 0.5px solid var(--oc-role-outline-variant);
  position: relative;
  overflow: hidden;
  min-width: 440px;
  width: 440px;

  &:focus,
  &:focus-visible {
    box-shadow: none;
    outline: none;
  }
}
.app-sidebar-full-width {
  min-width: 100% !important;
  width: 100% !important;
}

@media only screen and (max-width: $oc-breakpoint-small-default) {
  .files-wrapper {
    flex-wrap: nowrap !important;
  }
}

.sidebar-panel {
  $root: &;
  overflow: hidden;
  width: 100%;
  max-width: 100%;
  height: 100%;
  max-height: 100%;
  display: grid;
  grid-template-rows: auto auto 1fr;
  background-color: var(--oc-role-surface);
  top: 0;
  position: absolute;
  transform: translateX(100%);
  transition:
    transform 0.4s ease,
    visibility 0.4s 0s;
  // visibility is here to prevent focusing panel child elements,
  // the transition delay keeps care that it will only apply if the element is visible or not.
  // hidden: if element is off screen
  // visible: if element is on screen
  visibility: hidden;
  border-top-right-radius: var(--oc-space-medium);
  border-bottom-right-radius: var(--oc-space-medium);

  @media screen and (prefers-reduced-motion: reduce), (update: slow) {
    transition-duration: 0.001ms !important;
  }

  &.is-active-root-panel,
  &.is-active-sub-panel {
    visibility: unset;
    transform: translateX(0);
  }

  &.is-active-root-panel {
    right: 0 !important;
    transition: right 0.4s 0s;
  }

  &.is-root-panel {
    transform: translateX(0);
    visibility: visible;
    transition: right 0.4s 0s;
    right: 100px;
  }

  .multi-root-panel-separator {
    border-top: 0.5px solid var(--oc-role-outline-variant);
  }

  &__header {
    // padding: var(--oc-space-small) var(--oc-space-small) 0 var(--oc-space-small);

    &.header {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
    }

    & .header {
      &__back {
        grid-column-start: 1;
      }

      &__title {
        text-align: center;
        color: var(--oc-role-on-surface);
        font-size: var(--oc-font-size-large);
        grid-column-start: 2;
      }

      &__close {
        grid-column-start: 3;
      }
    }
  }

  &__body {
    overflow-y: auto;
    overflow-x: hidden;
    padding: var(--oc-space-small);
    display: flex;
    flex-direction: column;

    &-content-stretch {
      flex: 1;
    }
  }

  &__navigation {
    > button {
      width: 100%;
      border-radius: 0;
      color: var(--oc-role-on-surface) !important;
      display: grid;
      grid-template-columns: auto 1fr auto;
      text-align: left;
      height: 50px;
      border-radius: 5px;
    }
  }
}
</style>
