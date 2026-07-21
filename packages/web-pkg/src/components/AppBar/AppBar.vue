<template>
  <div
    id="files-app-bar"
    ref="filesAppBar"
    class="px-4 bg-role-surface rounded-t-xl [display:inherit] top-0 z-20"
    :class="{ 'files-app-bar-squashed': isSideBarOpen, sticky: isSticky }"
  >
    <div class="files-topbar py-1 w-full">
      <h1 class="sr-only" v-text="pageTitle" />
      <oc-hidden-announcer :announcement="selectedResourcesAnnouncement" level="polite" />
      <div
        class="flex items-center files-app-bar-controls min-h-12"
        :class="{
          'justify-between': showBreadcrumb || hasSharesNavigation,
          'justify-end': !showBreadcrumb && !hasSharesNavigation
        }"
      >
        <oc-breadcrumb
          v-if="showBreadcrumb"
          id="files-breadcrumb"
          context-menu-padding="small"
          :show-context-actions="showContextActions"
          :items="breadcrumbs"
          :max-width="breadcrumbMaxWidth"
          :truncation-offset="breadcrumbTruncationOffset"
          :mobile-breakpoint="isSideBarOpen ? 'md' : 'sm'"
          @item-dropped-breadcrumb="fileDroppedBreadcrumb"
        >
          <template #contextMenu>
            <context-actions
              :action-options="{ space, resources: breadcrumbsContextActionsItems.filter(Boolean) }"
            />
          </template>
        </oc-breadcrumb>
        <div v-if="hasViewOptions" id="files-app-bar-controls-right" class="flex">
          <view-options
            :view-modes="viewModes"
            :has-hidden-files="hasHiddenFiles"
            :has-file-extensions="hasFileExtensions"
            :has-pagination="hasPagination"
            per-page-storage-prefix="files"
            :view-mode-default="viewModeDefault"
          />
        </div>
      </div>
      <slot v-if="hasSharesNavigation" name="navigation" />
      <div
        v-if="showActionsBar"
        class="files-app-bar-actions relative flex items-start justify-end min-h-10"
      >
        <div class="peer flex [&:not(:empty)]:w-full" :class="{ invisible: showBatchActions }">
          <slot name="actions" :limited-screen-space="limitedScreenSpace" />
        </div>
        <div
          v-if="showBatchActions"
          class="flex flex-1 has-[_ul:first-child>*]:flex justify-between items-center px-3 h-9 rounded-xl has-[_ul:first-child>*]:bg-role-surface-container-high peer-[:not(:empty)]:absolute peer-[:not(:empty)]:inset-x-0 peer-[:not(:empty)]:top-1/2 peer-[:not(:empty)]:-translate-y-1/2"
        >
          <BatchActions
            v-if="!batchActionsLoading"
            :actions="batchActions"
            :action-options="{ space, resources: selectedResources }"
            :limited-screen-space="limitedScreenSpace"
          />
          <div v-else>
            <oc-spinner :aria-label="$gettext('Loading actions')" />
          </div>
          <div v-if="selectedResources.length" class="flex items-center gap-1">
            <oc-button
              v-oc-tooltip="$gettext('Clear selection')"
              :aria-label="$gettext('Clear selection')"
              appearance="raw"
              gap-size="small"
              class="p-1 clear-selection-btn"
              @click="resetSelection"
            >
              <span
                class="text-sm"
                :class="{ hidden: limitedScreenSpace }"
                v-text="$gettext('%{count} selected', { count: selectedResources.length })"
              />
              <oc-icon fill-type="line" name="close" />
            </oc-button>
          </div>
        </div>
      </div>
      <slot name="content" />
    </div>
  </div>
</template>

<script setup lang="ts">
import last from 'lodash-es/last'
import { computed, onBeforeUnmount, onMounted, ref, unref, useSlots, useTemplateRef } from 'vue'
import {
  isPersonalSpaceResource,
  isProjectSpaceResource,
  isShareSpaceResource,
  Resource,
  SpaceResource
} from '@opencloud-eu/web-client'
import BatchActions from '../BatchActions.vue'
import ContextActions from '../FilesList/ContextActions.vue'
import ViewOptions from '../ViewOptions.vue'
import { isLocationTrashActive } from '../../router'
import { FolderView } from '../../ui/types'
import {
  useFileActionsDelete,
  useFileActionsDownloadFile,
  useFileActionsRestore
} from '../../composables/actions'
import {
  ActionExtension,
  FileAction,
  FolderViewModeConstants,
  useAbility,
  useActiveLocation,
  useExtensionRegistry,
  useIsTopBarSticky,
  useResourcesStore,
  useRouteMeta,
  useSideBar,
  useSpacesStore
} from '../../composables'
import { BreadcrumbItem, EVENT_ITEM_DROPPED } from '@opencloud-eu/design-system/helpers'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'
import { RouteLocationRaw } from 'vue-router'

const {
  viewModeDefault = FolderViewModeConstants.defaultModeName,
  breadcrumbs = [],
  breadcrumbsContextActionsItems = [],
  viewModes = [],
  hasBulkActions = false,
  hasViewOptions = true,
  hasHiddenFiles = true,
  hasFileExtensions = true,
  hasPagination = true,
  showActionsBar = true,
  showActionsOnSelection = false,
  batchActionsLoading = false,
  space = undefined
} = defineProps<{
  viewModeDefault?: string
  breadcrumbs?: BreadcrumbItem[]
  breadcrumbsContextActionsItems?: Resource[]
  viewModes?: FolderView[]
  hasBulkActions?: boolean
  hasViewOptions?: boolean
  hasHiddenFiles?: boolean
  hasFileExtensions?: boolean
  hasPagination?: boolean
  showActionsBar?: boolean
  showActionsOnSelection?: boolean
  batchActionsLoading?: boolean
  space?: SpaceResource
}>()

const emit = defineEmits<{
  (e: typeof EVENT_ITEM_DROPPED, data: RouteLocationRaw): void
}>()

const spacesStore = useSpacesStore()
const { $gettext, $ngettext } = useGettext()
const { can } = useAbility()
const { requestExtensions } = useExtensionRegistry()
const { isSticky } = useIsTopBarSticky()

const sidebarStore = useSideBar()
const { isSideBarOpen } = storeToRefs(sidebarStore)

const resourcesStore = useResourcesStore()
const { selectedResources } = storeToRefs(resourcesStore)
const { resetSelection } = resourcesStore

const { actions: deleteActions } = useFileActionsDelete()
const { actions: downloadFileActions } = useFileActionsDownloadFile()
const { actions: restoreActions } = useFileActionsRestore()

const filesAppBar = useTemplateRef('filesAppBar')

const breadcrumbMaxWidth = ref<number>(0)
const limitedScreenSpace = ref(false)

const hasSharesNavigation = computed(
  () => Object.hasOwn(useSlots(), 'navigation') && can('create-all', 'Share')
)

const batchActions = computed(() => {
  let actions: FileAction[] = [...unref(downloadFileActions)]

  const actionExtensions = requestExtensions<ActionExtension>({
    id: 'global.files.batch-actions',
    extensionType: 'action'
  })
  if (actionExtensions.length) {
    actions = [...actions, ...actionExtensions.map((e) => e.action)]
  }

  actions = [...actions, ...unref(deleteActions), ...unref(restoreActions)]

  const categoryOrder: Record<string, number> = {
    primary: 0,
    secondary: 1,
    tertiary: 2,
    quaternary: 3
  }

  return actions
    .filter((item) =>
      item.isVisible({ space: unref(space), resources: resourcesStore.selectedResources })
    )
    .sort((a, b) => {
      const aOrder = categoryOrder[a.category ?? 'tertiary'] ?? 2
      const bOrder = categoryOrder[b.category ?? 'tertiary'] ?? 2
      return aOrder - bOrder
    })
})

const spaces = computed(() =>
  spacesStore.spaces.filter((s) => isPersonalSpaceResource(s) || isProjectSpaceResource(s))
)

const isTrashLocation = useActiveLocation(isLocationTrashActive, 'files-trash-generic')
const showBreadcrumb = computed(() => {
  if (unref(isTrashLocation) && unref(spaces).length === 1) {
    return false
  }
  return breadcrumbs.length
})

const breadcrumbTruncationOffset = computed(() => {
  if (!unref(space)) {
    return 2
  }
  return isProjectSpaceResource(unref(space)) || isShareSpaceResource(unref(space)) ? 3 : 2
})
const fileDroppedBreadcrumb = (data: RouteLocationRaw) => {
  emit(EVENT_ITEM_DROPPED, data)
}

const routeMetaTitle = useRouteMeta('title')
const pageTitle = computed(() => {
  if (unref(routeMetaTitle)) {
    return $gettext(unref(routeMetaTitle))
  }
  return unref(space)?.name || ''
})

const showBatchActions = computed(() => hasBulkActions && unref(batchActions).length)

const showContextActions = computed(() => {
  return last<BreadcrumbItem>(breadcrumbs).allowContextActions
})
const selectedResourcesAnnouncement = computed(() => {
  if (unref(selectedResources).length === 0) {
    return $gettext('No items selected.')
  }
  return $ngettext(
    '%{ amount } item selected. Actions are available above the table.',
    '%{ amount } items selected. Actions are available above the table.',
    unref(selectedResources).length,
    {
      amount: unref(selectedResources).length.toString()
    }
  )
})

const onResize = () => {
  const totalContentWidth =
    document.getElementById('web-content-main')?.getBoundingClientRect().width || 0
  const leftSidebarWidth =
    document.getElementById('web-nav-sidebar')?.getBoundingClientRect().width || 0
  const rightSidebarWidth =
    document.getElementById('app-sidebar')?.getBoundingClientRect().width || 0

  const rightControlsWidth = document.getElementById('files-app-bar-controls-right')?.clientWidth

  breadcrumbMaxWidth.value =
    totalContentWidth - leftSidebarWidth - rightSidebarWidth - rightControlsWidth
  limitedScreenSpace.value = isSideBarOpen.value
    ? window.innerWidth <= 1600
    : window.innerWidth <= 1200
}

const resizeObserver = new ResizeObserver(onResize)

onMounted(() => {
  resizeObserver.observe(unref(filesAppBar))
})

onBeforeUnmount(() => {
  resizeObserver.unobserve(unref(filesAppBar))
})
</script>
