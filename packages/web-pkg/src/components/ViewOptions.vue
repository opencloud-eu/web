<template>
  <div class="flex items-center">
    <div
      v-if="viewModes.length > 1"
      class="viewmode-switch-buttons oc-button-group oc-visible@s mr-2"
    >
      <oc-button
        v-for="viewMode in viewModes"
        :key="viewMode.name"
        v-oc-tooltip="$gettext(viewMode.label)"
        :no-hover="viewModeCurrent === viewMode.name"
        :class="[viewMode.name]"
        :appearance="viewModeCurrent === viewMode.name ? 'filled' : 'outline'"
        :color-role="viewModeCurrent === viewMode.name ? 'secondaryContainer' : 'secondary'"
        :aria-label="$gettext(viewMode.label)"
        @click="setViewMode(viewMode)"
      >
        <oc-icon :name="viewMode.icon.name" :fill-type="viewMode.icon.fillType" size="small" />
      </oc-button>
    </div>
    <oc-button
      id="files-view-options-btn"
      key="files-view-options-btn"
      v-oc-tooltip="viewOptionsButtonLabel"
      data-testid="files-view-options-btn"
      :aria-label="viewOptionsButtonLabel"
      appearance="raw"
      class="my-2 p-1 align-middle"
    >
      <oc-icon name="settings-3" fill-type="line" />
    </oc-button>
    <oc-drop
      :title="$gettext('View options')"
      drop-id="files-view-options-drop"
      toggle="#files-view-options-btn"
      mode="click"
      class="oc-width-auto"
      padding-size="medium"
    >
      <oc-list>
        <li v-if="hasHiddenFiles" class="files-view-options-list-item mt-2 mb-4 last:mb-0">
          <oc-switch
            v-model:checked="hiddenFilesShownModel"
            data-testid="files-switch-hidden-files"
            :label="$gettext('Show hidden files')"
            @update:checked="updateHiddenFilesShownModel"
          />
        </li>
        <li v-if="hasFileExtensions" class="files-view-options-list-item mt-2 mb-4 last:mb-0">
          <oc-switch
            v-model:checked="fileExtensionsShownModel"
            data-testid="files-switch-files-extensions-files"
            :label="$gettext('Show file extensions')"
            @update:checked="updateFileExtensionsShownModel"
          />
        </li>
        <li v-if="hasPagination" class="files-view-options-list-item mt-2 mb-4 last:mb-0">
          <oc-page-size
            v-if="!queryParamsLoading"
            :selected="queryItemAsString(itemsPerPageCurrent)"
            data-testid="files-pagination-size"
            :label="$gettext('Items per page')"
            :options="paginationOptions"
            class="files-pagination-size"
            @change="setItemsPerPage"
          />
        </li>
        <li v-if="isProjectsLocation" class="files-view-options-list-item mt-2 mb-4 last:mb-0">
          <oc-switch
            v-model:checked="disabledSpacesShownModel"
            data-testid="files-switch-projects-show-disabled"
            :label="$gettext('Show disabled Spaces')"
            @update:checked="updateDisabledSpacesShownModel"
          />
        </li>
        <li v-if="isTrashOverViewLocation" class="files-view-options-list-item mt-2 mb-4 last:mb-0">
          <oc-switch
            v-model:checked="emptyTrashesShownModel"
            data-testid="files-switch-projects-show-disabled"
            :label="$gettext('Show empty trash bins')"
            @update:checked="updateEmptyTrashesShownModel"
          />
        </li>
        <li
          v-if="viewModeCurrent === FolderViewModeConstants.name.tiles"
          class="files-view-options-list-item mt-2 mb-4 last:mb-0 flex justify-between items-center"
        >
          <label for="tiles-size-slider" v-text="$gettext('Tile size')" />
          <input
            id="tiles-size-slider"
            v-model="viewSizeCurrent"
            type="range"
            :min="1"
            :max="viewSizeMax"
            class="oc-range bg-role-surface-container-high"
            data-testid="files-tiles-size-slider"
          />
        </li>
      </oc-list>
    </oc-drop>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, ref, unref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  FolderViewModeConstants,
  PaginationConstants,
  queryItemAsString,
  useActiveLocation,
  useResourcesStore,
  useRoute,
  useRouteName,
  useRouteQuery,
  useRouteQueryPersisted,
  useRouter,
  useViewSizeMax
} from '../composables'
import { FolderView } from '../ui/types'
import { storeToRefs } from 'pinia'
import { isLocationSpacesActive, isLocationTrashActive } from '../router'

export default defineComponent({
  props: {
    hasHiddenFiles: { type: Boolean, default: true },
    hasFileExtensions: { type: Boolean, default: true },
    hasPagination: { type: Boolean, default: true },
    paginationOptions: {
      type: Array as PropType<string[]>,
      default: () => PaginationConstants.options
    },
    perPageQueryName: {
      type: String,
      default: () => PaginationConstants.perPageQueryName
    },
    perPageDefault: {
      type: String,
      default: () => PaginationConstants.perPageDefault
    },
    perPageStoragePrefix: {
      type: String,
      required: true
    },
    viewModeDefault: {
      type: String,
      required: false,
      default: () => FolderViewModeConstants.defaultModeName
    },
    viewModes: {
      type: Array as PropType<FolderView[]>,
      default: (): FolderView[] => []
    }
  },
  setup(props) {
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

    const currentPageQuery = useRouteQuery('page')
    const currentPage = computed(() => {
      if (!unref(currentPageQuery)) {
        return 1
      }
      return parseInt(queryItemAsString(unref(currentPageQuery)))
    })
    const itemsPerPageQuery = useRouteQueryPersisted({
      name: props.perPageQueryName,
      defaultValue: props.perPageDefault,
      storagePrefix: props.perPageStoragePrefix
    })

    const routeName = useRouteName()
    const viewModeQuery = useRouteQueryPersisted({
      name: `${unref(routeName)}-${FolderViewModeConstants.queryName}`,
      defaultValue: props.viewModeDefault
    })

    const viewSizeQuery = useRouteQueryPersisted({
      name: FolderViewModeConstants.tilesSizeQueryName,
      defaultValue: FolderViewModeConstants.tilesSizeDefault.toString()
    })

    const setItemsPerPage = (itemsPerPage: string) => {
      return router.replace({
        query: {
          ...unref(currentRoute).query,
          [props.perPageQueryName]: itemsPerPage,
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

    return {
      FolderViewModeConstants,
      viewModeCurrent: viewModeQuery,
      viewSizeCurrent: viewSizeQuery,
      viewSizeMax,
      itemsPerPageCurrent: itemsPerPageQuery,
      queryParamsLoading,
      queryItemAsString,
      setItemsPerPage,
      setViewMode,
      areHiddenFilesShown,
      areFileExtensionsShown,
      areDisabledSpacesShown,
      areEmptyTrashesShown,
      setAreHiddenFilesShown,
      setAreFileExtensionsShown,
      setAreDisabledSpacesShown,
      setAreEmptyTrashesShown,
      viewOptionsButtonLabel: $gettext('Display customization options of the files list'),
      isProjectsLocation: useActiveLocation(isLocationSpacesActive, 'files-spaces-projects'),
      isTrashOverViewLocation: useActiveLocation(isLocationTrashActive, 'files-trash-overview')
    }
  },
  computed: {
    hiddenFilesShownModel: {
      get() {
        return this.areHiddenFilesShown
      },

      set(value: boolean) {
        this.setAreHiddenFilesShown(value)
      }
    },
    fileExtensionsShownModel: {
      get() {
        return this.areFileExtensionsShown
      },

      set(value: boolean) {
        this.setAreFileExtensionsShown(value)
      }
    },
    disabledSpacesShownModel: {
      get() {
        return this.areDisabledSpacesShown
      },

      set(value: boolean) {
        this.setAreDisabledSpacesShown(value)
      }
    },
    emptyTrashesShownModel: {
      get() {
        return this.areEmptyTrashesShown
      },

      set(value: boolean) {
        this.setAreEmptyTrashesShown(value)
      }
    }
  },
  methods: {
    updateHiddenFilesShownModel(event: boolean) {
      this.hiddenFilesShownModel = event
    },
    updateFileExtensionsShownModel(event: boolean) {
      this.fileExtensionsShownModel = event
    },
    updateDisabledSpacesShownModel(event: boolean) {
      this.disabledSpacesShownModel = event
    },
    updateEmptyTrashesShownModel(event: boolean) {
      this.emptyTrashesShownModel = event
    }
  }
})
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

/* Can't use @layer here: Tailwind only accepts plain class selectors, not `> *`. */
.files-view-options-list-item > * {
  @apply flex justify-between;
}
</style>

<style lang="scss" scoped>
.viewmode-switch-buttons {
  flex-flow: initial;
}

#files-view-options-btn {
  border: 3px solid transparent;

  &:hover {
    border-radius: 3px;
  }
}

.oc-range {
  -webkit-appearance: none;
  border-radius: 0.3rem;
  height: 0.5rem;
  outline: none;
  width: 100%;
  max-width: 50%;

  &:hover {
    opacity: 1;
  }

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
