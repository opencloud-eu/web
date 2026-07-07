<template>
  <div>
    <h2 class="px-4 py-2 sr-only">
      {{ title }}
      <span class="text-base">({{ items.length }})</span>
    </h2>

    <no-content-message
      v-if="!items.length"
      class="files-empty"
      img-src="/images/empty-states/empty-shared-with-me.svg"
    >
      <template #message>
        <span v-text="$gettext('Nothing shared, yet')" />
      </template>
      <template #callToAction>
        <span v-text="$gettext('All received shares will show up here')" />
      </template>
    </no-content-message>
    <component
      :is="folderView.component"
      v-else
      v-model:selected-ids="selectedResourcesIds"
      :fields-displayed="displayedFields"
      :resources="resourceItems"
      :are-resources-clickable="resourceClickable"
      :header-position="fileListHeaderY"
      :sort-by="sortBy"
      :sort-dir="sortDir"
      :sort-fields="sortFields.filter((field) => field.name === 'name')"
      :view-mode="viewMode"
      :view-size="viewSize"
      @file-click="triggerDefaultAction"
      @item-visible="loadPreview({ space: getMatchingSpace($event), resource: $event })"
      @sort="sortHandler"
    >
      <template #contextMenu="{ resource }">
        <context-actions
          v-if="isResourceInSelection(resource)"
          :action-options="{ space: getMatchingSpace(resource), resources: selectedResources }"
        />
      </template>
      <template #quickActions="{ resource }">
        <oc-button
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
import { FolderView, SortField, useFileActions, useLoadPreview } from '@opencloud-eu/web-pkg'
import { computed, ref, unref } from 'vue'
import { useGetMatchingSpace } from '@opencloud-eu/web-pkg'
import ListInfo from '../../components/FilesList/ListInfo.vue'
import { IncomingShareResource } from '@opencloud-eu/web-client'
import { ContextActions } from '@opencloud-eu/web-pkg'
import { NoContentMessage } from '@opencloud-eu/web-pkg'
import { useSelectedResources } from '@opencloud-eu/web-pkg'
import { SortDir } from '@opencloud-eu/design-system/helpers'
import { useFileActionsToggleHideShare } from '../../composables/actions/files'
import { useGettext } from 'vue3-gettext'

const {
  title,
  items,
  sortBy = undefined,
  sortDir = undefined,
  sortHandler,
  folderView,
  showMoreToggle = false,
  showMoreToggleCount = 3,
  resourceClickable = true,
  fileListHeaderY = 0,
  viewMode,
  viewSize,
  sortFields
} = defineProps<{
  title: string
  items: IncomingShareResource[]
  sortBy?: string
  sortDir?: SortDir
  sortHandler: ({ sortBy, sortDir }: { sortBy: string; sortDir: SortDir }) => void
  folderView: FolderView
  showMoreToggle?: boolean
  showMoreToggleCount?: number
  resourceClickable?: boolean
  fileListHeaderY?: number
  viewMode: string
  viewSize: number
  sortFields: SortField[]
}>()

const { $gettext } = useGettext()
const { getMatchingSpace } = useGetMatchingSpace()

const { loadPreview } = useLoadPreview(computed(() => viewMode))

const { triggerDefaultAction } = useFileActions()
const { actions: hideShareActions } = useFileActionsToggleHideShare()
const hideShareAction = computed(() => unref(hideShareActions)[0])

const { selectedResources, selectedResourcesIds, isResourceInSelection } = useSelectedResources()

const showMore = ref(false)

const displayedFields = computed(() => {
  return ['name', 'sharedBy', 'sdate', 'sharedWith']
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

const toggleShowMore = () => {
  showMore.value = !showMore.value
}
</script>
