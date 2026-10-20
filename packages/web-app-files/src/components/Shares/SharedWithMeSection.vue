<template>
  <div>
    <h2 class="px-4 py-2 sr-only">
      {{ title }}
      <span class="text-base">({{ items.length }})</span>
    </h2>

    <template v-if="!items.length">
      <no-content-message
        v-if="!hasShares"
        class="files-empty"
        img-src="images/illustrations/shared-with-me.svg"
      >
        <template #message>
          <span v-text="$gettext('Nothing shared, yet')" />
        </template>
        <template #callToAction>
          <span v-text="$gettext('All received shares will show up here')" />
        </template>
      </no-content-message>
      <no-content-message
        v-else
        class="files-no-results"
        img-src="images/illustrations/shared-with-me.svg"
      >
        <template #message>
          <span v-text="$gettext('No shares found')" />
        </template>
        <template #callToAction>
          <span v-text="$gettext('Try refining the search term or filters to get results')" />
        </template>
      </no-content-message>
    </template>
    <component
      :is="folderView.component"
      v-else
      :fields-displayed="displayedFields"
      :resources="resourceItems"
      :are-resources-clickable="resourceClickable"
      :header-position="fileListHeaderY"
      :sort-by="sortBy"
      :sort-dir="sortDir"
      :sort-fields="sortFields.filter((field) => field.name === 'name')"
      :view-mode="viewMode"
      :view-size="viewSize"
      :term="term"
      @file-click="triggerDefaultAction"
      @item-visible="loadPreview({ space: getMatchingSpace($event), resource: $event })"
      @item-hidden="dropPreview($event)"
      @sort="sortHandler"
      @update:selected-ids="selectedResourcesIds = $event"
    >
      <template #contextMenu="{ resource }">
        <context-actions
          v-if="isResourceInSelection(resource)"
          :action-options="{ space: getMatchingSpace(resource), resources: selectedResources }"
        />
      </template>
      <template #quickActions="{ resource }">
        <oc-button
          v-if="hideShareAction.isVisible({ space: null, resources: [resource] })"
          v-oc-tooltip="hideShareAction.label({ space: null, resources: [resource] })"
          :aria-label="hideShareAction.label({ space: null, resources: [resource] })"
          appearance="raw"
          :class="['p-1', hideShareAction.class, 'raw-hover-surface']"
          @click.stop="hideShareAction.handler({ space: null, resources: [resource] })"
        >
          <oc-icon
            :name="resource.hidden ? 'eye' : 'eye-off'"
            fill-type="line"
            aria-hidden="true"
          />
        </oc-button>
      </template>
      <template #footer>
        <pagination :pages="paginationPages" :current-page="paginationPage" />
        <div v-if="showMoreToggle && hasMore" class="w-full text-center mt-4">
          <oc-button
            id="files-shared-with-me-show-all"
            appearance="raw"
            gap-size="xsmall"
            size="small"
            :data-test-expand="(!showMore).toString()"
            @click="toggleShowMore"
          >
            {{ toggleMoreLabel }}
            <oc-icon :name="'arrow-' + (showMore ? 'up' : 'down') + '-s'" fill-type="line" />
          </oc-button>
        </div>
        <list-info v-else class="w-full my-2" />
      </template>
    </component>
  </div>
</template>

<script setup lang="ts">
import {
  FolderView,
  Pagination,
  SortField,
  useAuthStore,
  useFileActions,
  useLoadPreview
} from '@opencloud-eu/web-pkg'
import { computed, ref, unref } from 'vue'
import { useGetMatchingSpace } from '@opencloud-eu/web-pkg'
import ListInfo from '../../components/FilesList/ListInfo.vue'
import { IncomingShareResource } from '@opencloud-eu/web-client'
import { ContextActions } from '@opencloud-eu/web-pkg'
import { NoContentMessage } from '@opencloud-eu/web-pkg'
import { useResourcesSelectionVisibilityGuard, useSelectedResources } from '@opencloud-eu/web-pkg'
import { SortDir } from '@opencloud-eu/design-system/helpers'
import { useFileActionsToggleHideShare } from '../../composables/actions/files'
import { useGettext } from 'vue3-gettext'

const {
  title,
  items,
  hasShares = false,
  sortBy = undefined,
  sortDir = undefined,
  sortHandler,
  paginationPages,
  paginationPage,
  folderView,
  showMoreToggle = false,
  showMoreToggleCount = 3,
  resourceClickable = true,
  fileListHeaderY = 0,
  viewMode,
  viewSize,
  sortFields,
  term = ''
} = defineProps<{
  title: string
  items: IncomingShareResource[]
  /**
   * Whether there are any shares before filtering. If so, an empty `items` list
   * means that only the search term or the filters match nothing.
   */
  hasShares?: boolean
  sortBy?: string
  sortDir?: SortDir
  sortHandler: ({ sortBy, sortDir }: { sortBy: string; sortDir: SortDir }) => void
  paginationPages: number
  paginationPage: number
  folderView: FolderView
  showMoreToggle?: boolean
  showMoreToggleCount?: number
  resourceClickable?: boolean
  fileListHeaderY?: number
  viewMode: string
  viewSize: number
  sortFields: SortField[]
  /**
   * The filter term whose occurrences get highlighted in the resource names.
   */
  term?: string
}>()

const { $gettext } = useGettext()
const authStore = useAuthStore()
const { getMatchingSpace } = useGetMatchingSpace()

const { loadPreview, dropPreview } = useLoadPreview(computed(() => viewMode))

const { triggerDefaultAction } = useFileActions()
const { actions: hideShareActions } = useFileActionsToggleHideShare()
const hideShareAction = computed(() => unref(hideShareActions)[0])

const { selectedResources, selectedResourcesIds, isResourceInSelection } = useSelectedResources()

const showMore = ref(false)

const displayedFields = computed(() => {
  const fields = ['name', 'sharedBy', 'sdate']
  // a guest is the only recipient of their shares
  return authStore.isGuestContext ? fields : [...fields, 'sharedWith']
})

const toggleMoreLabel = computed(() => {
  return unref(showMore) ? $gettext('Show less') : $gettext('Show more')
})

const hasMore = computed(() => {
  return items.length > showMoreToggleCount
})

const resourceItems = computed(() => {
  if (!showMoreToggle || unref(showMore)) {
    return items
  }
  return items.slice(0, showMoreToggleCount)
})

// the folder view gets replaced when nothing is left to show, its guard can't deselect then
useResourcesSelectionVisibilityGuard(resourceItems)

const toggleShowMore = () => {
  showMore.value = !showMore.value
}
</script>
