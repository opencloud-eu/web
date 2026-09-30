<template>
  <main class="flex app-content size-full rounded-l-xl">
    <app-loading-spinner v-if="loading" />
    <template v-else>
      <div class="admin-settings-wrapper flex w-full flex-1 h-full flex-nowrap sm:flex-wrap">
        <div
          id="admin-settings-view-wrapper"
          class="relative grid grid-cols-1 flex-1 focus:outline-0 h-full overflow-y-auto gap-0"
        >
          <div id="admin-settings-view" class="outline-0 z-0 flex flex-col">
            <div
              id="admin-settings-app-bar"
              ref="appBarRef"
              class="py-1 px-4 top-0 z-20 rounded-t-xl bg-role-surface"
              :class="{ sticky: isSticky }"
            >
              <h1 class="sr-only" v-text="pageTitle" />
              <oc-hidden-announcer :announcement="selectedItemsAnnouncement" level="polite" />
              <div class="flex justify-between items-center h-12">
                <oc-breadcrumb
                  id="admin-settings-breadcrumb"
                  :items="breadcrumbs"
                  :mobile-breakpoint="isSideBarOpen ? 'md' : 'sm'"
                />
                <div class="flex">
                  <view-options
                    v-if="showViewOptions"
                    :has-hidden-files="false"
                    :has-file-extensions="false"
                    :has-pagination="true"
                    :pagination-options="paginationOptions"
                    :per-page-default="perPageDefault"
                    per-page-storage-prefix="admin-settings"
                  />
                </div>
              </div>
              <div class="flex relative flex items-start justify-end min-h-10">
                <div
                  class="peer flex [&:not(:empty)]:w-full"
                  :class="{ invisible: showBatchActions }"
                >
                  <slot name="actions" :limited-screen-space="limitedScreenSpace" />
                </div>
                <div
                  v-if="showBatchActions"
                  class="flex flex-1 justify-between items-center px-3 h-9 rounded-xl peer-[:not(:empty)]:absolute peer-[:not(:empty)]:inset-x-0 peer-[:not(:empty)]:top-1/2 peer-[:not(:empty)]:-translate-y-1/2"
                  :class="{ 'bg-role-surface-container': batchActionItems.length }"
                >
                  <BatchActions
                    v-if="!batchActionsLoading"
                    :actions="sortedBatchActions"
                    :action-options="{ resources: batchActionItems }"
                    :limited-screen-space="limitedScreenSpace"
                  />
                  <div v-else>
                    <oc-spinner :aria-label="$gettext('Loading actions')" />
                  </div>
                  <div v-if="batchActionItems.length" class="flex items-center gap-1">
                    <oc-button
                      v-oc-tooltip="$gettext('Clear selection')"
                      :aria-label="$gettext('Clear selection')"
                      appearance="raw"
                      gap-size="small"
                      class="p-1 clear-selection-btn"
                      @click="emit('clearSelection')"
                    >
                      <span
                        class="text-sm"
                        :class="{ hidden: limitedScreenSpace }"
                        v-text="$gettext('%{count} selected', { count: batchActionItems.length })"
                      />
                      <oc-icon fill-type="line" name="close" />
                    </oc-button>
                  </div>
                </div>
              </div>
            </div>
            <slot name="mainContent" />
          </div>
        </div>
      </div>
      <side-bar
        v-if="isSideBarOpen && sideBarAvailablePanels.length"
        :available-panels="sideBarAvailablePanels"
        :panel-context="sideBarPanelContext"
        :loading="sideBarLoading"
      >
        <template #rootHeader>
          <slot name="sideBarHeader" />
        </template>
        <template #subHeader>
          <slot name="sideBarHeader" />
        </template>
      </side-bar>
    </template>
  </main>
</template>

<script setup lang="ts">
import { perPageDefault, paginationOptions } from '../defaults'
import {
  Action,
  AppLoadingSpinner,
  BatchActions,
  SideBar,
  SideBarPanel,
  SideBarPanelContext,
  useAppDefaults,
  useIsTopBarSticky,
  useSideBar,
  ViewOptions
} from '@opencloud-eu/web-pkg'
import { computed, onBeforeUnmount, ref, unref, useTemplateRef, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import { BreadcrumbItem } from '@opencloud-eu/design-system/helpers'
import { Item } from '@opencloud-eu/web-client'
import { storeToRefs } from 'pinia'

const {
  breadcrumbs,
  sideBarAvailablePanels = [],
  sideBarPanelContext = {},
  loading = false,
  sideBarLoading = false,
  showViewOptions = false,
  showBatchActions = false,
  batchActionItems = [],
  batchActions = [],
  batchActionsLoading = false
} = defineProps<{
  breadcrumbs: BreadcrumbItem[]
  sideBarAvailablePanels?: SideBarPanel<unknown, unknown, unknown>[]
  sideBarPanelContext?: SideBarPanelContext<unknown, unknown, unknown>
  loading?: boolean
  sideBarLoading?: boolean
  showViewOptions?: boolean
  showBatchActions?: boolean
  batchActionItems?: Item[]
  batchActions?: Action[]
  batchActionsLoading?: boolean
}>()

const emit = defineEmits<{
  (e: 'clearSelection'): void
}>()

defineSlots<{
  actions?: (props: { limitedScreenSpace: boolean }) => unknown
  mainContent?: () => unknown
  sideBarHeader?: () => unknown
}>()

// sets the document title
useAppDefaults({ applicationId: 'admin-settings' })

const { $gettext, $ngettext } = useGettext()
const { isSideBarOpen } = storeToRefs(useSideBar())
const { isSticky } = useIsTopBarSticky()
const appBarRef = useTemplateRef<HTMLElement>('appBarRef')
const limitedScreenSpace = ref(false)

// the last breadcrumb is the title of the admin settings page
const pageTitle = computed(() => breadcrumbs.at(-1)?.text || '')

const categoryOrder: Record<string, number> = {
  primary: 0,
  secondary: 1,
  tertiary: 2,
  quaternary: 3
}
const sortedBatchActions = computed(() =>
  [...batchActions].sort(
    (a, b) =>
      (categoryOrder[a.category ?? 'tertiary'] ?? 2) -
      (categoryOrder[b.category ?? 'tertiary'] ?? 2)
  )
)

// so screen reader users know about the batch actions
const selectedItemsAnnouncement = computed(() => {
  if (batchActionItems.length === 0) {
    return $gettext('No items selected.')
  }
  return $ngettext(
    '%{ amount } item selected. Actions are available above the table.',
    '%{ amount } items selected. Actions are available above the table.',
    batchActionItems.length,
    { amount: batchActionItems.length.toString() }
  )
})

function onResize() {
  limitedScreenSpace.value = unref(isSideBarOpen)
    ? window.innerWidth <= 1600
    : window.innerWidth <= 1200
}
const resizeObserver = new ResizeObserver(onResize)

watch(
  appBarRef,
  (el) => {
    if (el) {
      resizeObserver.observe(el)
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (unref(appBarRef)) {
    resizeObserver.unobserve(unref(appBarRef))
  }
})
</script>
