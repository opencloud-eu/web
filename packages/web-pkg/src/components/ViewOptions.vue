<template>
  <div class="flex items-center">
    <view-mode-switch
      v-if="viewModes.length > 1"
      :view-modes="viewModes"
      :current-view-mode="queryItemAsString(viewModeQuery)"
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
        <li v-if="hasPagination" class="mt-2 mb-4 last:mb-0 [&>*]:flex [&>*]:justify-between">
          <oc-page-size
            v-if="!queryParamsLoading"
            :selected="queryItemAsString(itemsPerPageQuery)"
            data-testid="files-pagination-size"
            :label="$gettext('Items per page')"
            :options="paginationOptions"
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
        <li v-if="viewModeQuery === FolderViewModeConstants.name.tiles" class="mt-2 mb-4 last:mb-0">
          <oc-range
            id="tiles-size-slider"
            v-model="viewSizeModel"
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
import { computed, ref, unref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  FolderViewModeConstants,
  PaginationConstants,
  QueryValue,
  queryItemAsString,
  useActiveLocation,
  useResourcesStore,
  useRoute,
  useRouteQuery,
  useRouteQueryPersisted,
  useRouter,
  useViewSizeMax
} from '../composables'
import { FolderView } from '../ui/types'
import { storeToRefs } from 'pinia'
import { isLocationSpacesActive, isLocationTrashActive } from '../router'
import { PageSizeOption } from '@opencloud-eu/design-system/helpers'
import ViewModeSwitch from './ViewModeSwitch.vue'
import { useIsMobile } from '@opencloud-eu/design-system/composables'

const {
  perPageStoragePrefix,
  hasHiddenFiles = true,
  hasFileExtensions = true,
  hasPagination = true,
  paginationOptions = PaginationConstants.options,
  perPageQueryName = PaginationConstants.perPageQueryName,
  perPageDefault = PaginationConstants.perPageDefault,
  viewModeDefault = FolderViewModeConstants.defaultModeName,
  viewModes = []
} = defineProps<{
  perPageStoragePrefix: string
  hasHiddenFiles?: boolean
  hasFileExtensions?: boolean
  hasPagination?: boolean
  paginationOptions?: string[]
  perPageQueryName?: string
  perPageDefault?: string
  viewModeDefault?: string
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
  setAreEmptyTrashesShown
} = resourcesStore
const {
  areHiddenFilesShown,
  areFileExtensionsShown,
  areDisabledSpacesShown,
  areEmptyTrashesShown
} = storeToRefs(resourcesStore)

const queryParamsLoading = ref(false)

const isProjectsLocation = useActiveLocation(isLocationSpacesActive, 'files-spaces-projects')
const isTrashOverViewLocation = useActiveLocation(isLocationTrashActive, 'files-trash-overview')

const currentPageQuery = useRouteQuery('page')
const currentPage = computed(() => {
  if (!unref(currentPageQuery)) {
    return 1
  }
  return parseInt(queryItemAsString(unref(currentPageQuery)))
})
const itemsPerPageQuery = useRouteQueryPersisted({
  name: perPageQueryName,
  defaultValue: perPageDefault,
  storagePrefix: perPageStoragePrefix
})

// view mode and tile size only apply to views that offer view modes, so we don't want to write them into the url otherwise
const hasViewModes = computed(() => viewModes.length > 0)

const viewModeQuery = unref(hasViewModes)
  ? useRouteQueryPersisted({
      name: FolderViewModeConstants.queryName,
      defaultValue: viewModeDefault
    })
  : ref<QueryValue>()

// on phones the default tile size results in one huge tile per row, so default to the smallest size
const { isMobile } = useIsMobile()
const viewSizeQuery = unref(hasViewModes)
  ? useRouteQueryPersisted({
      name: FolderViewModeConstants.tilesSizeQueryName,
      defaultValue: unref(isMobile) ? '1' : FolderViewModeConstants.tilesSizeDefault.toString()
    })
  : ref<QueryValue>()

const setItemsPerPage = (itemsPerPage: PageSizeOption) => {
  return router.replace({
    query: {
      ...unref(currentRoute).query,
      [perPageQueryName]: itemsPerPage.toString(),
      ...(unref(currentPage) > 1 && { page: '1' })
    }
  })
}

const setViewMode = (mode: FolderView) => {
  viewModeQuery.value = mode.name
}

watch(
  () =>
    unref(hasViewModes)
      ? [unref(itemsPerPageQuery), unref(viewModeQuery), unref(viewSizeQuery)]
      : [unref(itemsPerPageQuery)],
  (params) => {
    queryParamsLoading.value = params.some((p) => !p)
  },
  { immediate: true, deep: true }
)

const viewSizeMax = useViewSizeMax()

const viewSizeModel = computed({
  get() {
    return Number(queryItemAsString(unref(viewSizeQuery)))
  },
  set(value: number) {
    viewSizeQuery.value = value.toString()
  }
})

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
</script>
