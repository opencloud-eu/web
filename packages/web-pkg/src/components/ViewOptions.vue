<template>
  <div class="flex items-center">
    <view-mode-switch
      v-if="viewModes.length > 1"
      :view-modes="viewModes"
      :current-view-mode="viewMode"
      @select="setViewMode"
    />
    <oc-button
      id="files-view-options-btn"
      key="files-view-options-btn"
      v-oc-tooltip="$gettext('Display customization options of the files list')"
      data-testid="files-view-options-btn"
      :aria-label="$gettext('Display customization options of the files list')"
      appearance="raw"
      class="my-2 mx-1 p-1 align-middle"
    >
      <oc-icon name="settings-3" fill-type="line" />
    </oc-button>
    <oc-drop
      :title="$gettext('View options')"
      drop-id="files-view-options-drop"
      toggle="#files-view-options-btn"
      mode="click"
      class="w-auto [&.oc-drop]:overflow-visible [&_li]:first:mt-0!"
      padding-size="medium"
      :is-menu="false"
    >
      <oc-list>
        <li v-if="hasHiddenFiles" class="mt-2 mb-4 last:mb-0 [&>*]:flex [&>*]:justify-between">
          <oc-switch
            v-model:checked="hiddenFilesShownModel"
            data-testid="files-switch-hidden-files"
            :label="$gettext('Show hidden files')"
            @update:checked="updateHiddenFilesShownModel"
          />
        </li>
        <li v-if="hasFileExtensions" class="mt-2 mb-4 last:mb-0 [&>*]:flex [&>*]:justify-between">
          <oc-switch
            v-model:checked="fileExtensionsShownModel"
            data-testid="files-switch-files-extensions-files"
            :label="$gettext('Show file extensions')"
            @update:checked="updateFileExtensionsShownModel"
          />
        </li>
        <li v-if="hasFoldersFirst" class="mt-2 mb-4 last:mb-0 [&>*]:flex [&>*]:justify-between">
          <oc-switch
            v-model:checked="foldersSortedFirstModel"
            data-testid="files-switch-folders-first"
            :label="$gettext('Folders first')"
            @update:checked="updateFoldersSortedFirstModel"
          />
        </li>
        <li v-if="hasPagination" class="mt-2 mb-4 last:mb-0 [&>*]:flex [&>*]:justify-between">
          <oc-page-size
            :selected="itemsPerPageSelection"
            data-testid="files-pagination-size"
            :label="$gettext('Items per page')"
            :options="paginationOptionsList"
            class="files-pagination-size"
            @change="setItemsPerPage"
          />
        </li>
        <li v-if="isProjectsLocation" class="mt-2 mb-4 last:mb-0 [&>*]:flex [&>*]:justify-between">
          <oc-switch
            v-model:checked="disabledSpacesShownModel"
            data-testid="files-switch-projects-show-disabled"
            :label="$gettext('Show disabled Spaces')"
            @update:checked="updateDisabledSpacesShownModel"
          />
        </li>
        <li
          v-if="isTrashOverViewLocation"
          class="mt-2 mb-4 last:mb-0 [&>*]:flex [&>*]:justify-between"
        >
          <oc-switch
            v-model:checked="emptyTrashesShownModel"
            data-testid="files-switch-projects-show-disabled"
            :label="$gettext('Show empty trash bins')"
            @update:checked="updateEmptyTrashesShownModel"
          />
        </li>
        <li v-if="isTileSizeSliderShown" class="mt-2 mb-4 last:mb-0">
          <oc-range
            id="tiles-size-slider"
            v-model="viewSize"
            :label="$gettext('Grid size')"
            :min="1"
            :max="viewSizeMax"
            inline-label
            input-class="max-w-[50%]"
            data-testid="files-tiles-size-slider"
          />
        </li>
      </oc-list>
    </oc-drop>
  </div>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  FolderViewModeConstants,
  PaginationConstants,
  queryItemAsString,
  useActiveLocation,
  useIsInfiniteScrollEnabled,
  useItemsPerPage,
  useResourcesStore,
  useRoute,
  useRouteQuery,
  useRouter,
  useViewMode,
  useViewSize,
  useViewSizeMax
} from '../composables'
import { FolderView } from '../ui/types'
import { storeToRefs } from 'pinia'
import { isLocationSpacesActive, isLocationTrashActive } from '../router'
import { PageSizeOption } from '@opencloud-eu/design-system/helpers'
import ViewModeSwitch from './ViewModeSwitch.vue'

const {
  hasHiddenFiles = true,
  hasFileExtensions = true,
  hasFoldersFirst = true,
  hasPagination = true,
  hasInfiniteScroll = false,
  paginationOptions = PaginationConstants.options,
  perPageDefault = PaginationConstants.perPageDefault,
  viewModes = []
} = defineProps<{
  hasHiddenFiles?: boolean
  hasFileExtensions?: boolean
  hasFoldersFirst?: boolean
  hasPagination?: boolean
  /**
   * Offers an option that switches the files views to infinite scrolling, which
   * makes numbered pagination superfluous. Only views that support it may enable it.
   */
  hasInfiniteScroll?: boolean
  paginationOptions?: string[]
  perPageDefault?: string
  viewModes?: FolderView[]
}>()

const router = useRouter()
const currentRoute = useRoute()
const { $gettext } = useGettext()

const resourcesStore = useResourcesStore()
const {
  setAreHiddenFilesShown,
  setAreFileExtensionsShown,
  setAreDisabledSpacesShown,
  setAreEmptyTrashesShown,
  setAreFoldersSortedFirst
} = resourcesStore
const {
  areHiddenFilesShown,
  areFileExtensionsShown,
  areDisabledSpacesShown,
  areEmptyTrashesShown,
  areFoldersSortedFirst
} = storeToRefs(resourcesStore)

const isProjectsLocation = useActiveLocation(isLocationSpacesActive, 'files-spaces-projects')
const isTrashOverViewLocation = useActiveLocation(isLocationTrashActive, 'files-trash-overview')

const currentPageQuery = useRouteQuery('page', '1')
const itemsPerPage = useItemsPerPage(perPageDefault)

const viewMode = useViewMode()
const viewSize = useViewSize()
const viewSizeMax = useViewSizeMax()

const isTileSizeSliderShown = computed(() => {
  return viewModes.length > 0 && unref(viewMode) === FolderViewModeConstants.name.tiles
})

const infiniteScrollEnabled = useIsInfiniteScrollEnabled()
const infiniteScrollOptionLabel = computed(() => $gettext('∞'))

function isInfiniteScrollLabel(value: string) {
  return value === unref(infiniteScrollOptionLabel)
}

const itemsPerPageSelection = computed<string>({
  get() {
    return unref(hasInfiniteScroll) && unref(infiniteScrollEnabled)
      ? unref(infiniteScrollOptionLabel)
      : unref(itemsPerPage).toString()
  },
  set(value: string) {
    const infiniteScrollSelected = isInfiniteScrollLabel(value)
    // the flag is shared with other views, so only views that offer infinite scrolling may change it
    if (unref(hasInfiniteScroll)) {
      infiniteScrollEnabled.value = infiniteScrollSelected
    }
    if (!infiniteScrollSelected) {
      itemsPerPage.value = Number(value)
    }
  }
})

const paginationOptionsList = computed(() => {
  const options = unref(paginationOptions)
  if (!unref(hasInfiniteScroll)) {
    return options
  }

  const label = unref(infiniteScrollOptionLabel)
  if (options.includes(label)) {
    return options
  }

  return [...options, label]
})

const setItemsPerPage = (value: PageSizeOption) => {
  const infiniteScrollSelected = isInfiniteScrollLabel(value.toString())
  itemsPerPageSelection.value = value.toString()
  if (!infiniteScrollSelected && parseInt(queryItemAsString(unref(currentPageQuery)), 10) > 1) {
    return router.replace({ query: { ...unref(currentRoute).query, page: '1' } })
  }
}

const setViewMode = (mode: FolderView) => {
  viewMode.value = mode.name
}

const hiddenFilesShownModel = computed({
  get() {
    return unref(areHiddenFilesShown)
  },
  set(value: boolean) {
    setAreHiddenFilesShown(value)
  }
})
const fileExtensionsShownModel = computed({
  get() {
    return unref(areFileExtensionsShown)
  },
  set(value: boolean) {
    setAreFileExtensionsShown(value)
  }
})
const disabledSpacesShownModel = computed({
  get() {
    return unref(areDisabledSpacesShown)
  },
  set(value: boolean) {
    setAreDisabledSpacesShown(value)
  }
})
const emptyTrashesShownModel = computed({
  get() {
    return unref(areEmptyTrashesShown)
  },
  set(value: boolean) {
    setAreEmptyTrashesShown(value)
  }
})
const foldersSortedFirstModel = computed({
  get() {
    return unref(areFoldersSortedFirst)
  },
  set(value: boolean) {
    setAreFoldersSortedFirst(value)
  }
})

const updateHiddenFilesShownModel = (event: boolean) => {
  hiddenFilesShownModel.value = event
}
const updateFileExtensionsShownModel = (event: boolean) => {
  fileExtensionsShownModel.value = event
}
const updateDisabledSpacesShownModel = (event: boolean) => {
  disabledSpacesShownModel.value = event
}
const updateEmptyTrashesShownModel = (event: boolean) => {
  emptyTrashesShownModel.value = event
}
const updateFoldersSortedFirstModel = (event: boolean) => {
  foldersSortedFirstModel.value = event
}
</script>
