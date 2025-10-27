<template>
  <div class="flex items-center">
    <template v-if="viewModes.length">
      <oc-button
        id="mobile-viewmode-switch-toggle"
        v-oc-tooltip="$gettext('Switch view mode')"
        :aria-label="$gettext('Switch view mode')"
        appearance="raw"
        class="my-2 mx-1 p-1 align-middle"
        :class="{ 'sm:hidden': !isSideBarOpen, 'md:hidden': isSideBarOpen }"
      >
        <oc-icon name="list-view" fill-type="none" />
      </oc-button>
      <oc-drop
        :title="$gettext('View mode')"
        drop-id="mobile-viewmode-switch-drop"
        toggle="#mobile-viewmode-switch-toggle"
        class="w-auto"
        padding-size="medium"
        close-on-click
      >
        <oc-list>
          <li v-for="viewMode in viewModes" :key="viewMode.name">
            <oc-button
              :appearance="viewModeQuery === viewMode.name ? 'filled' : 'raw'"
              :color-role="viewModeQuery === viewMode.name ? 'secondaryContainer' : 'secondary'"
              justify-content="left"
              @click="setViewMode(viewMode)"
            >
              <div class="flex justify-between w-full">
                <span class="flex items-center">
                  <oc-icon
                    :name="viewMode.icon.name"
                    :fill-type="viewMode.icon.fillType"
                    size="medium"
                    class="mr-1"
                  />
                  <span v-text="viewMode.label" />
                </span>
                <oc-icon v-if="viewModeQuery === viewMode.name" name="check" size="medium" />
              </div>
            </oc-button>
          </li>
        </oc-list>
      </oc-drop>
    </template>
    <div
      v-if="viewModes.length > 1"
      class="viewmode-switch-buttons oc-button-group hidden mr-2"
      :class="{ 'sm:inline-flex': !isSideBarOpen, 'md:inline-flex': isSideBarOpen }"
    >
      <oc-button
        v-for="viewMode in viewModes"
        :key="viewMode.name"
        v-oc-tooltip="$gettext('Switch to %{viewMode}', { viewMode: viewMode.label })"
        :no-hover="viewModeQuery === viewMode.name"
        :class="[viewMode.name]"
        :appearance="viewModeQuery === viewMode.name ? 'filled' : 'outline'"
        :color-role="viewModeQuery === viewMode.name ? 'secondaryContainer' : 'secondary'"
        :aria-label="$gettext('Switch to %{viewMode}', { viewMode: viewMode.label })"
        @click="setViewMode(viewMode)"
      >
        <oc-icon :name="viewMode.icon.name" :fill-type="viewMode.icon.fillType" size="small" />
      </oc-button>
    </div>
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
      class="w-auto"
      padding-size="medium"
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
        <li
          v-if="viewModeQuery === FolderViewModeConstants.name.tiles"
          class="mt-2 mb-4 last:mb-0 flex justify-between items-center [&>*]:flex [&>*]:justify-between"
        >
          <label for="tiles-size-slider" v-text="$gettext('Tile size')" />
          <input
            id="tiles-size-slider"
            v-model="viewSizeQuery"
            type="range"
            :min="1"
            :max="viewSizeMax"
            class="oc-range bg-role-surface-container-high rounded-sm outline-0 w-full max-w-[50%] h-1.5 hover:opacity-100 appearance-none"
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
  queryItemAsString,
  useActiveLocation,
  useResourcesStore,
  useRoute,
  useRouteQuery,
  useRouteQueryPersisted,
  useRouter,
  useSideBar,
  useViewSizeMax
} from '../composables'
import { FolderView } from '../ui/types'
import { storeToRefs } from 'pinia'
import { isLocationSpacesActive, isLocationTrashActive } from '../router'

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
const { isSideBarOpen } = useSideBar()

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

const viewModeQuery = useRouteQueryPersisted({
  name: FolderViewModeConstants.queryName,
  defaultValue: viewModeDefault
})

const viewSizeQuery = useRouteQueryPersisted({
  name: FolderViewModeConstants.tilesSizeQueryName,
  defaultValue: FolderViewModeConstants.tilesSizeDefault.toString()
})

const setItemsPerPage = (itemsPerPage: string) => {
  return router.replace({
    query: {
      ...unref(currentRoute).query,
      [perPageQueryName]: itemsPerPage,
      ...(unref(currentPage) > 1 && { page: '1' })
    }
  })
}

const setViewMode = (mode: FolderView) => {
  viewModeQuery.value = mode.name
}

watch(
  [itemsPerPageQuery, viewModeQuery, viewSizeQuery],
  (params) => {
    queryParamsLoading.value = params.some((p) => !p)
  },
  { immediate: true, deep: true }
)

const viewSizeMax = useViewSizeMax()

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

<style lang="scss" scoped>
.oc-range {
  // needs to be scss to work properly
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    background: var(--oc-role-on-surface);
    border-radius: 50%;
    cursor: pointer;
    height: 1rem;
    width: 1rem;
  }

  &::-moz-range-thumb {
    background: var(--oc-role-on-surface);
    border-radius: 50%;
    cursor: pointer;
    height: 1rem;
    width: 1rem;
  }
}
</style>
