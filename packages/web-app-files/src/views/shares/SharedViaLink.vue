<template>
  <div class="flex">
    <files-view-wrapper>
      <app-bar :view-modes="viewModes" :breadcrumbs="breadcrumbs" has-bulk-actions>
        <template #navigation>
          <SharesNavigation />
        </template>
        <template #actions>
          <div class="flex justify-end w-full mt-2 mb-4 items-center">
            <oc-search-bar
              v-model="filterTerm"
              class="search-filter w-3xs"
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
        <no-content-message
          v-if="isEmpty"
          id="files-shared-via-link-empty"
          img-src="/images/empty-states/empty-shared-via-link.svg"
        >
          <template #message>
            <span v-text="$gettext('Nothing shared, yet')" />
          </template>
          <template #callToAction>
            <span v-text="$gettext('All your links will show up here')" />
          </template>
        </no-content-message>
        <component
          :is="folderView.component"
          v-else
          v-model:selected-ids="selectedResourcesIds"
          :fields-displayed="['name', 'sdate']"
          :are-paths-displayed="true"
          :resources="filteredItems"
          :header-position="fileListHeaderY"
          :sort-by="sortBy"
          :sort-dir="sortDir"
          :sort-fields="sortFields.filter((field) => field.name === 'name')"
          :view-mode="viewMode"
          :view-size="viewSize"
          @file-click="triggerDefaultAction"
          @item-visible="loadPreview({ space: getMatchingSpace($event), resource: $event })"
          @sort="handleSort"
        >
          <template #contextMenu="{ resource }">
            <context-actions
              v-if="isResourceInSelection(resource)"
              :action-options="{ space: getMatchingSpace(resource), resources: selectedResources }"
            />
          </template>
          <template #footer>
            <pagination :pages="paginationPages" :current-page="paginationPage" />
            <list-info v-if="filteredItems.length > 0" class="w-full my-2" />
          </template>
        </component>
      </template>
    </files-view-wrapper>
    <file-side-bar :space="selectedResourceSpace" />
  </div>
</template>

<script setup lang="ts">
import {
  createLocationShares,
  defaultFuseOptions,
  FileSideBar,
  useFileActions,
  useLoadPreview,
  useResourcesStore,
  AppLoadingSpinner,
  NoContentMessage,
  AppBar,
  Pagination,
  useGetMatchingSpace,
  ContextActions
} from '@opencloud-eu/web-pkg'
import ListInfo from '../../components/FilesList/ListInfo.vue'
import FilesViewWrapper from '../../components/FilesViewWrapper.vue'
import { useResourcesViewDefaults } from '../../composables'
import { computed, onMounted, ref, unref, watch } from 'vue'
import SharesNavigation from '../../../src/components/AppBar/SharesNavigation.vue'
import { OutgoingShareResource } from '@opencloud-eu/web-client'
import { folderViewsSharedViaLinkExtensionPoint } from '../../extensionPoints'
import { v4 as uuidV4 } from 'uuid'
import { useGettext } from 'vue3-gettext'
import Fuse from 'fuse.js'
import Mark from 'mark.js'

const { $gettext } = useGettext()

const { getMatchingSpace } = useGetMatchingSpace()

const resourcesStore = useResourcesStore()

const {
  paginatedResources,
  selectedResources,
  selectedResourcesIds,
  viewMode,
  viewModes,
  areResourcesLoading,
  sortBy,
  sortDir,
  sortFields,
  viewSize,
  folderView,
  fileListHeaderY,
  paginationPages,
  paginationPage,
  loadResourcesTask,
  selectedResourceSpace,
  handleSort,
  isResourceInSelection,
  scrollToResourceFromRoute
} = useResourcesViewDefaults<OutgoingShareResource, any, any[]>({
  folderViewExtensionPoint: folderViewsSharedViaLinkExtensionPoint
})

const { triggerDefaultAction } = useFileActions()

const { loadPreview } = useLoadPreview(viewMode)

const filterTerm = ref('')
const filteredItems = computed(() => {
  if (unref(filterTerm)) {
    const searchEngine = new Fuse(unref(paginatedResources), {
      ...defaultFuseOptions,
      keys: ['name']
    })
    return searchEngine.search(unref(filterTerm)).map((r) => r.item)
  }
  return unref(paginatedResources)
})

let markInstance: Mark | undefined
watch(filteredItems, () => {
  if (!unref(areResourcesLoading)) {
    if (!markInstance) {
      markInstance = new Mark('.oc-resource-details')
    }

    markInstance.unmark()
    markInstance.mark(unref(filterTerm), {
      element: 'span',
      className: 'mark-highlight'
    })
  }
})

resourcesStore.$onAction((action) => {
  if (action.name !== 'updateResourceField') {
    return
  }

  if (selectedResourcesIds.value.length !== 1) return
  const id = selectedResourcesIds.value[0]

  const match = unref(paginatedResources).find((r) => {
    return r.id === id
  })
  if (!match) return

  loadResourcesTask.perform()

  const matchedNewResource = unref(paginatedResources).find((r) => r.fileId === match.fileId)
  if (!matchedNewResource) return

  selectedResourcesIds.value = [matchedNewResource.id]
})

const breadcrumbs = computed(() => {
  return [
    {
      id: uuidV4(),
      text: $gettext('Shares'),
      to: createLocationShares('files-shares-via-link'),
      isStaticNav: true
    }
  ]
})

const isEmpty = computed(() => {
  return unref(filteredItems).length < 1
})

onMounted(async () => {
  await loadResourcesTask.perform()
  scrollToResourceFromRoute(unref(paginatedResources), 'files-app-bar')
})
</script>
