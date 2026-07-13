<template>
  <div class="flex">
    <files-view-wrapper>
      <app-bar :view-modes="viewModes" :breadcrumbs="breadcrumbs" has-bulk-actions>
        <template #navigation>
          <SharesNavigation />
        </template>
        <template #actions>
          <div
            class="flex w-full mt-2 mb-4 items-center"
            :class="{
              'justify-between': shareTypes.length > 1,
              'justify-end': shareTypes.length <= 1
            }"
          >
            <div v-if="shareTypes.length > 1" class="flex">
              <item-filter
                :allow-multiple="true"
                :filter-label="$gettext('Share Type')"
                :filterable-attributes="['label']"
                :items="shareTypes"
                :option-filter-label="$gettext('Filter share types')"
                :show-option-filter="true"
                id-attribute="key"
                class="share-type-filter"
                display-name-attribute="label"
                filter-name="shareType"
              >
                <template #item="{ item }">
                  <span class="ml-2" v-text="item.label" />
                </template>
              </item-filter>
            </div>
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
          id="files-shared-with-others-empty"
          img-src="/images/empty-states/empty-shared-with-others.svg"
        >
          <template #message>
            <span v-text="$gettext('Nothing shared, yet')" />
          </template>
          <template #callToAction>
            <span v-text="$gettext('Anything you shared will show up here')" />
          </template>
        </no-content-message>
        <component
          :is="folderView.component"
          v-else
          v-model:selected-ids="selectedResourcesIds"
          :fields-displayed="['name', 'sharedWith', 'sdate']"
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
  queryItemAsString,
  useAppsStore,
  useFileActions,
  useLoadPreview,
  useResourcesStore,
  useRouteQuery,
  FileSideBar,
  AppLoadingSpinner,
  NoContentMessage,
  AppBar,
  Pagination,
  useGetMatchingSpace,
  ContextActions,
  ItemFilter
} from '@opencloud-eu/web-pkg'
import { uniq } from 'lodash-es'
import ListInfo from '../../components/FilesList/ListInfo.vue'
import FilesViewWrapper from '../../components/FilesViewWrapper.vue'
import { useResourcesViewDefaults } from '../../composables'
import { computed, unref, ref, watch, onMounted } from 'vue'
import SharesNavigation from '../../components/AppBar/SharesNavigation.vue'
import { OutgoingShareResource, ShareTypes } from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'
import { folderViewsSharedWithOthersExtensionPoint } from '../../extensionPoints'
import { v4 as uuidV4 } from 'uuid'
import Fuse from 'fuse.js'
import Mark from 'mark.js'

const { getMatchingSpace } = useGetMatchingSpace()
const appsStore = useAppsStore()
const { $gettext } = useGettext()

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
  folderViewExtensionPoint: folderViewsSharedWithOthersExtensionPoint
})

const { triggerDefaultAction } = useFileActions()

const { loadPreview } = useLoadPreview(viewMode)

const breadcrumbs = computed(() => {
  return [
    {
      id: uuidV4(),
      text: $gettext('Shares'),
      to: createLocationShares('files-shares-with-others'),
      isStaticNav: true
    }
  ]
})

const shareTypes = computed(() => {
  const uniqueShareTypes = uniq(unref(paginatedResources).flatMap((i) => i.shareTypes))

  const ocmAvailable = appsStore.appIds.includes('open-cloud-mesh')
  if (ocmAvailable && !uniqueShareTypes.includes(ShareTypes.remote.value)) {
    uniqueShareTypes.push(ShareTypes.remote.value)
  }

  return ShareTypes.getByValues(uniqueShareTypes).map((shareType) => {
    return {
      key: shareType.key,
      value: shareType.value,
      label: $gettext(shareType.label)
    }
  })
})
const selectedShareTypesQuery = useRouteQuery('q_shareType')
const filterTerm = ref('')
const filteredItems = computed(() => {
  let items = unref(paginatedResources)
  if (unref(filterTerm)) {
    const searchEngine = new Fuse(items, { ...defaultFuseOptions, keys: ['name'] })
    items = searchEngine.search(unref(filterTerm)).map((r) => r.item)
  }

  const selectedShareTypes = queryItemAsString(unref(selectedShareTypesQuery))?.split('+')
  if (!selectedShareTypes || selectedShareTypes.length === 0) {
    return items
  }
  return items.filter((item) => {
    return ShareTypes.getByKeys(selectedShareTypes)
      .map(({ value }) => value)
      .some((t) => item.shareTypes.includes(t))
  })
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

const isEmpty = computed(() => {
  return unref(filteredItems).length < 1
})

onMounted(async () => {
  await loadResourcesTask.perform()
  scrollToResourceFromRoute(unref(filteredItems), 'files-app-bar')
})
</script>
