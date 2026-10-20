<template>
  <div class="flex">
    <files-view-wrapper class="flex-col">
      <app-bar :has-bulk-actions="true" :view-modes="viewModes" :breadcrumbs="breadcrumbs">
        <template #actions>
          <div class="flex flex-wrap gap-2 justify-end w-full mt-2 mb-4 items-center">
            <oc-search-bar
              v-model="filterTerm"
              is-filter
              class="search-filter w-full sm:w-3xs"
              :label="$gettext('Search')"
              :placeholder="$gettext('Search for shares')"
              button-hidden
              :is-rounded="false"
            />
          </div>
        </template>
      </app-bar>
      <app-loading-spinner v-if="areResourcesLoading" />
      <template v-else>
        <shared-with-me-section
          id="files-guest-shared-with-me-view"
          class="h-full"
          :file-list-header-y="fileListHeaderY"
          :items="items"
          :sort-by="sortBy"
          :sort-dir="sortDir"
          :sort-handler="handleSort"
          :folder-view="folderView"
          :title="$gettext('Shares')"
          :view-mode="viewMode"
          :view-size="viewSize"
          :sort-fields="sortFields"
          :term="filterTerm"
        />
      </template>
    </files-view-wrapper>
    <file-side-bar :space="selectedShareSpace" />
  </div>
</template>

<script setup lang="ts">
import Fuse from 'fuse.js'
import { computed, onBeforeUnmount, onMounted, ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { v4 as uuidV4 } from 'uuid'
import { IncomingShareResource } from '@opencloud-eu/web-client'
import {
  AppBar,
  AppLoadingSpinner,
  FileSideBar,
  defaultFuseOptions,
  eventBus,
  useGetMatchingSpace,
  useKeyboardActions,
  useResourcesStore,
  useSort
} from '@opencloud-eu/web-pkg'
import { useResourcesViewDefaults } from '../../composables'
import {
  useKeyboardFileMouseActions,
  useKeyboardFileNavigation
} from '../../composables/keyboardActions'
import FilesViewWrapper from '../../components/FilesViewWrapper.vue'
import SharedWithMeSection from '../../components/Shares/SharedWithMeSection.vue'
import { folderViewsSharedWithMeExtensionPoint } from '../../extensionPoints'

const { $gettext } = useGettext()
const resourcesStore = useResourcesStore()
const { getMatchingSpace } = useGetMatchingSpace()

const {
  viewMode,
  viewModes,
  viewSize,
  folderView,
  areResourcesLoading,
  sortFields,
  fileListHeaderY,
  loadResourcesTask,
  selectedResources,
  paginatedResources,
  scrollToResourceFromRoute
} = useResourcesViewDefaults<IncomingShareResource, any, any>({
  folderViewExtensionPoint: folderViewsSharedWithMeExtensionPoint
})

const filterTerm = ref('')

const breadcrumbs = computed(() => [
  {
    id: uuidV4(),
    text: $gettext('Shares'),
    onClick: () => loadResourcesTask.perform(),
    isStaticNav: true
  }
])

const filteredItems = computed(() => {
  const resources = unref(paginatedResources)
  if (!unref(filterTerm).trim()) {
    return resources
  }
  const searchEngine = new Fuse(resources, { ...defaultFuseOptions, keys: ['name'] })
  return searchEngine.search(unref(filterTerm)).map(({ item }) => item)
})

const { sortBy, sortDir, items, handleSort } = useSort({
  items: filteredItems,
  fields: sortFields,
  foldersFirst: computed(() => resourcesStore.areFoldersSortedFirst)
})

const keyActions = useKeyboardActions()
useKeyboardFileNavigation(keyActions, items, viewMode)
useKeyboardFileMouseActions(keyActions, viewMode)

const selectedShareSpace = computed(() => {
  if (unref(selectedResources).length !== 1) {
    return null
  }
  return getMatchingSpace(unref(selectedResources)[0])
})

async function performLoaderTask() {
  await loadResourcesTask.perform()
  scrollToResourceFromRoute(unref(items), 'files-app-bar')
}

let loadResourcesEventToken: string
onMounted(() => {
  performLoaderTask()
  loadResourcesEventToken = eventBus.subscribe('app.files.list.load', performLoaderTask)
})

onBeforeUnmount(() => {
  eventBus.unsubscribe('app.files.list.load', loadResourcesEventToken)
})
</script>
