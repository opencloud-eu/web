<template>
  <div class="flex w-full">
    <files-view-wrapper>
      <app-bar
        :breadcrumbs="breadcrumbs"
        :show-actions-on-selection="true"
        :has-bulk-actions="true"
        :has-hidden-files="false"
        :has-file-extensions="false"
        :has-pagination="false"
        :batch-actions-loading="batchActionsLoading"
        :view-modes="viewModes"
        :view-mode-default="FolderViewModeConstants.defaultModeName"
      >
        <template #actions>
          <div v-if="!selectedResourcesIds?.length" class="flex items-center">
            <span v-text="$gettext('Learn about spaces')" />
            <oc-contextual-helper :list="spacesHelpList" :title="$gettext('Spaces')" class="ml-1" />
          </div>
        </template>
      </app-bar>
      <app-loading-spinner v-if="areResourcesLoading" />
      <template v-else>
        <no-content-message
          v-if="!runtimeSpaces.length"
          id="files-spaces-empty"
          img-src="/images/empty-states/empty-spaces.svg"
        >
          <template #message>
            <span v-text="$gettext('No spaces found')" />
          </template>
          <template #callToAction>
            <span v-text="noSpacesDescription" />
          </template>
        </no-content-message>
        <template v-else>
          <div class="flex justify-end flex-wrap items-end mx-4 mb-4">
            <oc-text-input
              id="spaces-filter"
              v-model="filterTerm"
              class="w-3xs"
              :label="$gettext('Search')"
              autocomplete="off"
            />
          </div>
          <no-content-message
            v-if="!items.length"
            id="files-spaces-empty"
            img-src="/images/empty-states/empty-spaces.svg"
          >
            <template #message>
              <span v-text="$gettext('No spaces found')" />
            </template>
            <template #callToAction>
              <span v-text="$gettext('Try refining the search term or filters to get results')" />
            </template>
          </no-content-message>
          <component
            :is="folderView.component"
            v-else
            v-model:selected-ids="selectedResourcesIds"
            resource-type="space"
            :resources="paginatedItems"
            :fields-displayed="tableDisplayFields"
            :sort-fields="sortFields"
            :sort-by="sortBy"
            :sort-dir="sortDir"
            :header-position="fileListHeaderY"
            :view-size="viewSize"
            :view-mode="viewMode"
            v-bind="folderView.componentAttrs?.()"
            @sort="handleSort"
            @item-visible="loadPreview({ space: $event, resource: $event })"
          >
            <template #image="{ resource }">
              <template v-if="viewMode === FolderViewModeConstants.name.tiles">
                <oc-spinner
                  v-if="imagesLoading.includes(resource.id)"
                  :aria-label="$gettext('Space image is loading')"
                />
                <img
                  v-else-if="resource.thumbnail"
                  class="tile-preview rounded-t-sm size-full"
                  :class="{
                    'rounded-sm': isResourceInSelection(resource)
                  }"
                  :src="resource.thumbnail"
                  alt=""
                />
              </template>
              <template v-else>
                <oc-spinner
                  v-if="imagesLoading.includes(resource.id)"
                  :aria-label="$gettext('Space image is loading')"
                  class="mr-2"
                />
                <img
                  v-else-if="resource.thumbnail"
                  class="table-preview mr-2 rounded-sm object-cover"
                  :class="{ 'opacity-80 grayscale': resource.disabled }"
                  :src="resource.thumbnail"
                  alt=""
                  width="33"
                  height="33"
                />
                <resource-icon v-else class="mr-2" :resource="resource" />
              </template>
            </template>
            <template #actions="{ resource }">
              <oc-button
                v-if="!resource.disabled"
                v-oc-tooltip="showSpaceMemberLabel"
                :aria-label="showSpaceMemberLabel"
                appearance="raw"
                no-hover
                @click="openSidebarSharePanel(resource as SpaceResource)"
              >
                <oc-icon name="group" fill-type="line" size="small" />
              </oc-button>
            </template>
            <template #contextMenu="{ resource }">
              <context-actions
                v-if="isResourceInSelection(resource)"
                :action-options="{
                  space: resource as SpaceResource,
                  resources: selectedResources as SpaceResource[]
                }"
              />
            </template>
            <template #footer>
              <pagination :pages="totalPages" :current-page="currentPage" />
              <div class="text-center w-full my-2">
                <p class="text-role-on-surface-variant">{{ footerTextTotal }}</p>
                <p v-if="filterTerm" class="text-role-on-surface-variant">{{ footerTextFilter }}</p>
              </div>
            </template>
            <!--- table -->
            <template #totalQuota="{ resource }">
              {{ getTotalQuota(resource) }}
            </template>
            <template #usedQuota="{ resource }"> {{ getUsedQuota(resource) }}</template>
            <template #remainingQuota="{ resource }"> {{ getRemainingQuota(resource) }}</template>
          </component>
        </template>
      </template>
    </files-view-wrapper>
    <file-side-bar :space="selectedSpace" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, unref, ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { useTask } from 'vue-concurrency'
import Mark from 'mark.js'
import Fuse from 'fuse.js'

import {
  AppLoadingSpinner,
  useResourcesStore,
  useSpacesStore,
  useLoadPreview,
  AppBar,
  useClientService,
  ContextActions,
  FolderViewModeConstants,
  useSort,
  usePagination,
  useRouter,
  useRoute,
  Pagination,
  FileSideBar,
  NoContentMessage,
  useSideBar
} from '@opencloud-eu/web-pkg'
import {
  isProjectSpaceResource,
  ProjectSpaceResource,
  SpaceResource
} from '@opencloud-eu/web-client'
import FilesViewWrapper from '../../components/FilesViewWrapper.vue'
import { eventBus } from '@opencloud-eu/web-pkg'
import { sortFields as availableSortFields, translateSortFields } from '@opencloud-eu/web-pkg'
import { defaultFuseOptions, formatFileSize, ResourceIcon } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import { useKeyboardActions } from '@opencloud-eu/web-pkg'
import {
  useKeyboardFileNavigation,
  useKeyboardFileMouseActions,
  useKeyboardFileActions
} from '../../composables/keyboardActions'
import { useResourcesViewDefaults } from '../../composables'
import { folderViewsProjectSpacesExtensionPoint } from '../../extensionPoints'
import { storeToRefs } from 'pinia'

const spacesStore = useSpacesStore()
const router = useRouter()
const route = useRoute()
const clientService = useClientService()
const language = useGettext()
const { $gettext, $ngettext } = language
const filterTerm = ref('')
const resourcesStore = useResourcesStore()
const { imagesLoading } = storeToRefs(spacesStore)
const { openSideBarPanel } = useSideBar()

const { setSelection, initResourceList, clearResourceList, setAncestorMetaData } = resourcesStore
const { areDisabledSpacesShown } = storeToRefs(resourcesStore)

const loadResourcesTask = useTask(function* (signal) {
  clearResourceList()
  setAncestorMetaData({})
  yield spacesStore.reloadProjectSpaces({
    graphClient: clientService.graphAuthenticated,
    signal
  })
  initResourceList({ currentFolder: null, resources: unref(runtimeSpaces) })
})

const {
  viewSize,
  viewMode,
  viewModes,
  folderView,
  fileListHeaderY,
  scrollToResourceFromRoute,
  areResourcesLoading,
  selectedResourcesIds,
  selectedResources,
  isResourceInSelection
} = useResourcesViewDefaults({
  loadResourcesTask,
  folderViewExtensionPoint: folderViewsProjectSpacesExtensionPoint
})

let loadPreviewToken: string = null

const runtimeSpaces = computed(() => {
  return spacesStore.spaces.filter(isProjectSpaceResource) || []
})
const selectedSpace = computed(() => {
  if (
    unref(selectedResources).length === 1 &&
    isProjectSpaceResource(unref(selectedResources)[0])
  ) {
    return unref(selectedResources)[0] as ProjectSpaceResource
  }
  return null
})

const tableDisplayFields = [
  'image',
  'name',
  'totalQuota',
  'usedQuota',
  'remainingQuota',
  'indicators',
  'mdate'
]

const filter = (spaces: Array<ProjectSpaceResource>, filterTerm: string) => {
  if (!unref(areDisabledSpacesShown)) {
    spaces = spaces.filter((space) => space.disabled !== true)
  }

  if (!(filterTerm || '').trim()) {
    return spaces
  }

  const searchEngine = new Fuse(spaces, { ...defaultFuseOptions, keys: ['name'] })
  return searchEngine.search(filterTerm).map((r) => r.item)
}

const filteredSpaces = computed(() => {
  return filter(unref(runtimeSpaces), unref(filterTerm))
})

const sortFields = translateSortFields(availableSortFields, language)
const { sortBy, sortDir, items, handleSort } = useSort<SpaceResource>({
  items: filteredSpaces,
  fields: sortFields
})

const {
  items: paginatedItems,
  page: currentPage,
  total: totalPages
} = usePagination({
  items,
  perPageDefault: '50',
  perPageStoragePrefix: 'spaces-list'
})

const batchActionsLoading = computed(() => {
  const selectedSpaces = unref(selectedResources) as SpaceResource[]
  return selectedSpaces.some(({ graphPermissions }) => graphPermissions === undefined)
})

let markInstance: Mark | undefined
watch(filterTerm, async () => {
  await router.push({ ...unref(route), query: { ...unref(route).query, page: '1' } })
  markInstance?.unmark()
  markInstance?.mark(unref(filterTerm), {
    element: 'span',
    className: 'mark-highlight'
  })
})

watch(selectedResourcesIds, async (ids) => {
  if (!ids.length) {
    return
  }

  await spacesStore.loadGraphPermissions({
    ids,
    graphClient: clientService.graphAuthenticated
  })
})
const { loadPreview } = useLoadPreview(viewMode)

const keyActions = useKeyboardActions()
useKeyboardFileNavigation(keyActions, items, viewMode)
useKeyboardFileMouseActions(keyActions, viewMode)
useKeyboardFileActions(keyActions)

const getTotalQuota = (space: SpaceResource) => {
  if (space.spaceQuota.total === 0) {
    return $gettext('Unrestricted')
  }

  return formatFileSize(space.spaceQuota.total, language.current)
}
const getUsedQuota = (space: SpaceResource) => {
  if (space.spaceQuota.used === undefined) {
    return '-'
  }
  return formatFileSize(space.spaceQuota.used, language.current)
}
const getRemainingQuota = (space: SpaceResource) => {
  if (space.spaceQuota.total === 0) {
    return $gettext('Unrestricted')
  }
  if (space.spaceQuota.remaining === undefined) {
    return '-'
  }
  return formatFileSize(space.spaceQuota.remaining, language.current)
}

onMounted(async () => {
  await loadResourcesTask.perform()

  loadPreviewToken = eventBus.subscribe(
    'app.files.spaces.uploaded-image',
    (space: SpaceResource) => {
      loadPreview({ space, resource: space })
    }
  )
  scrollToResourceFromRoute(unref(items), 'files-app-bar')
  nextTick(() => {
    markInstance = new Mark('.oc-resource-details')
  })
})

onBeforeUnmount(() => {
  eventBus.unsubscribe('app.files.spaces.uploaded-image', loadPreviewToken)
})

const footerTextTotal = computed(() => {
  const disabledSpaces = unref(runtimeSpaces).filter((space) => space.disabled === true)

  if (!disabledSpaces.length) {
    return $ngettext(
      '%{spaceCount} space in total',
      '%{spaceCount} spaces in total',
      unref(runtimeSpaces).length,
      {
        spaceCount: unref(runtimeSpaces).length.toString()
      }
    )
  }

  return $ngettext(
    '%{spaceCount} space in total (including %{disabledSpaceCount} disabled)',
    '%{spaceCount} spaces in total (including %{disabledSpaceCount} disabled)',
    unref(runtimeSpaces).length,
    {
      spaceCount: unref(runtimeSpaces).length.toString(),
      disabledSpaceCount: disabledSpaces.length.toString()
    }
  )
})
const footerTextFilter = computed(() => {
  return $gettext('%{spaceCount} matching spaces', {
    spaceCount: unref(items).length.toString()
  })
})

const spacesHelpList = computed(() => {
  return [
    {
      text: $gettext('Spaces are special folders for making files accessible to a team.')
    },
    {
      text: $gettext(
        'Spaces belong to a team and not to a single person. Even if members are removed, the files remain in the Space so that the team can continue to work on the files.'
      )
    },
    {
      text: $gettext(
        'Members with the Manager role can add or remove other members from the Space.'
      )
    },
    {
      text: $gettext('A Space can have multiple Managers. Each Space has at least one Manager.')
    }
  ]
})

const breadcrumbs = computed(() => {
  return [
    {
      text: $gettext('Spaces'),
      onClick: () => loadResourcesTask.perform(),
      isStativNav: true
    }
  ]
})
const showSpaceMemberLabel = computed(() => {
  return $gettext('Show members')
})

const noSpacesDescription = computed(() => {
  return $gettext('Use the "New" button to create a space or ask an Administrator to do so')
})

const openSidebarSharePanel = (space: SpaceResource) => {
  setSelection([space.id])
  openSideBarPanel('space-share')
}
</script>
