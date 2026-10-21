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
          :items="paginatedResources"
          :sort-by="sortBy"
          :sort-dir="sortDir"
          :sort-handler="handleSort"
          :pagination-pages="paginationPages"
          :pagination-page="paginationPage"
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
import { computed, onBeforeUnmount, onMounted, ref, unref, watch } from 'vue'
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
  useRoute,
  useRouter
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
const router = useRouter()
const route = useRoute()
const { getMatchingSpace } = useGetMatchingSpace()

const filterTerm = ref('')

function filterShares(shares: IncomingShareResource[]) {
  if (!unref(filterTerm).trim()) {
    return shares
  }
  const searchEngine = new Fuse(shares, { ...defaultFuseOptions, keys: ['name'] })
  return searchEngine.search(unref(filterTerm)).map(({ item }) => item)
}

const {
  viewMode,
  viewModes,
  viewSize,
  folderView,
  areResourcesLoading,
  sortFields,
  sortBy,
  sortDir,
  handleSort,
  fileListHeaderY,
  loadResourcesTask,
  selectedResources,
  sortedResources,
  paginatedResources,
  paginationPages,
  paginationPage,
  scrollToResourceFromRoute
} = useResourcesViewDefaults<IncomingShareResource, any, any>({
  folderViewExtensionPoint: folderViewsSharedWithMeExtensionPoint,
  filterResources: filterShares
})

const breadcrumbs = computed(() => [
  {
    id: uuidV4(),
    text: $gettext('Shares'),
    onClick: () => loadResourcesTask.perform(),
    isStaticNav: true
  }
])

watch(filterTerm, async () => {
  await router.push({ ...unref(route), query: { ...unref(route).query, page: '1' } })
})

const keyActions = useKeyboardActions()
useKeyboardFileNavigation(keyActions, paginatedResources, viewMode)
useKeyboardFileMouseActions(keyActions, viewMode)

const selectedShareSpace = computed(() => {
  if (unref(selectedResources).length !== 1) {
    return null
  }
  return getMatchingSpace(unref(selectedResources)[0])
})

async function performLoaderTask() {
  await loadResourcesTask.perform()
  scrollToResourceFromRoute(unref(sortedResources), 'files-app-bar')
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
