<template>
  <div class="flex">
    <files-view-wrapper class="flex-col">
      <app-bar :has-bulk-actions="true" :view-modes="viewModes">
        <template #navigation>
          <SharesNavigation />
        </template>
      </app-bar>
      <app-loading-spinner v-if="areResourcesLoading" />
      <template v-else>
        <div class="flex justify-between flex-wrap items-end mx-4 mb-4">
          <div class="flex flex-wrap">
            <div class="mr-4 flex items-center">
              <oc-icon name="filter-2" class="mr-1" />
              <span v-text="$gettext('Filter:')" />
            </div>
            <item-filter-inline
              class="share-visibility-filter"
              filter-name="share-visibility"
              :filter-options="visibilityOptions"
              @toggle-filter="setAreHiddenFilesShown"
            />
            <item-filter
              :allow-multiple="true"
              :filter-label="$gettext('Share Type')"
              :filterable-attributes="['label']"
              :items="shareTypes"
              :option-filter-label="$gettext('Filter share types')"
              :show-option-filter="true"
              id-attribute="key"
              class="share-type-filter ml-2"
              display-name-attribute="label"
              filter-name="shareType"
            >
              <template #item="{ item }">
                <span class="ml-2" v-text="item.label" />
              </template>
            </item-filter>
            <item-filter
              :allow-multiple="true"
              :filter-label="$gettext('Shared By')"
              :filterable-attributes="['displayName']"
              :items="fileOwners"
              :option-filter-label="$gettext('Filter shared by')"
              :show-option-filter="true"
              id-attribute="id"
              class="shared-by-filter ml-2"
              display-name-attribute="displayName"
              filter-name="sharedBy"
            >
              <template #image="{ item }">
                <user-avatar :user-id="item.id" :user-name="item.displayName" :width="32" />
              </template>
              <template #item="{ item }">
                <span class="ml-2" v-text="item.displayName" />
              </template>
            </item-filter>
          </div>
          <div>
            <oc-text-input
              v-model="filterTerm"
              class="search-filter w-3xs"
              :label="$gettext('Search')"
              autocomplete="off"
            />
          </div>
        </div>
        <shared-with-me-section
          id="files-shared-with-me-view"
          :file-list-header-y="fileListHeaderY"
          :items="items"
          :sort-by="sortBy"
          :sort-dir="sortDir"
          :sort-handler="handleSort"
          :folder-view="folderView"
          :title="shareSectionTitle"
          :empty-message="
            areHiddenFilesShown ? $gettext('No hidden shares') : $gettext('No shares')
          "
          :view-mode="viewMode"
          :view-size="viewSize"
          :sort-fields="sortFields"
        />
      </template>
    </files-view-wrapper>
    <file-side-bar :space="selectedShareSpace" />
  </div>
</template>

<script setup lang="ts">
import Fuse from 'fuse.js'
import Mark from 'mark.js'
import { useResourcesViewDefaults } from '../../composables'

import {
  AppLoadingSpinner,
  FileSideBar,
  InlineFilterOption,
  ItemFilter,
  useAppsStore,
  useResourcesStore,
  UserAvatar
} from '@opencloud-eu/web-pkg'
import { AppBar, ItemFilterInline } from '@opencloud-eu/web-pkg'
import { queryItemAsString, useRouteQuery } from '@opencloud-eu/web-pkg'
import SharedWithMeSection from '../../components/Shares/SharedWithMeSection.vue'
import { computed, onMounted, ref, unref, watch } from 'vue'
import FilesViewWrapper from '../../components/FilesViewWrapper.vue'
import { useGetMatchingSpace, useSort } from '@opencloud-eu/web-pkg'
import SharesNavigation from '../../components/AppBar/SharesNavigation.vue'
import { useGettext } from 'vue3-gettext'
import { useOpenWithDefaultApp, defaultFuseOptions } from '@opencloud-eu/web-pkg'
import { IncomingShareResource, ShareTypes } from '@opencloud-eu/web-client'
import { uniq } from 'lodash-es'
import { folderViewsSharedWithMeExtensionPoint } from '../../extensionPoints'

const { openWithDefaultApp } = useOpenWithDefaultApp()
const appsStore = useAppsStore()
const resourcesStore = useResourcesStore()

const resourcesViewDefaults = useResourcesViewDefaults<IncomingShareResource, any, any>({
  folderViewExtensionPoint: folderViewsSharedWithMeExtensionPoint
})

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
} = resourcesViewDefaults

const { $gettext } = useGettext()

const areHiddenFilesShown = ref(false)
const filterTerm = ref('')

const shareSectionTitle = computed(() => {
  return unref(areHiddenFilesShown) ? $gettext('Hidden Shares') : $gettext('Shares')
})

const visibilityOptions = computed(() => [
  { name: 'visible', label: $gettext('Shares') },
  { name: 'hidden', label: $gettext('Hidden Shares') }
])

const setAreHiddenFilesShown = (value: InlineFilterOption) => {
  areHiddenFilesShown.value = value.name === 'hidden'
  resourcesStore.resetSelection()
}

const visibleShares = computed(() => unref(paginatedResources).filter((r) => !r.hidden))
const hiddenShares = computed(() => unref(paginatedResources).filter((r) => r.hidden))
const currentItems = computed(() => {
  return unref(areHiddenFilesShown) ? unref(hiddenShares) : unref(visibleShares)
})

const selectedShareTypesQuery = useRouteQuery('q_shareType')
const selectedSharedByQuery = useRouteQuery('q_sharedBy')
const filteredItems = computed(() => {
  let result = unref(currentItems)

  const selectedShareTypes = queryItemAsString(unref(selectedShareTypesQuery))?.split('+')
  if (selectedShareTypes?.length) {
    result = result.filter(({ shareTypes }) => {
      return ShareTypes.getByKeys(selectedShareTypes)
        .map(({ value }) => value)
        .some((t) => shareTypes.includes(t))
    })
  }

  const selectedSharedBy = queryItemAsString(unref(selectedSharedByQuery))?.split('+')
  if (selectedSharedBy?.length) {
    result = result.filter(({ sharedBy }) =>
      sharedBy.some(({ id }) => selectedSharedBy.includes(id))
    )
  }

  if (unref(filterTerm).trim()) {
    const usersSearchEngine = new Fuse(result, { ...defaultFuseOptions, keys: ['name'] })
    const fuseResult = usersSearchEngine.search(unref(filterTerm)).map((r) => r.item)
    result = fuseResult.filter((item) => result.includes(item))
  }

  return result
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

const { sortBy, sortDir, items, handleSort } = useSort({
  items: filteredItems,
  fields: sortFields
})

const { getMatchingSpace } = useGetMatchingSpace()

const selectedShareSpace = computed(() => {
  if (unref(selectedResources).length !== 1) {
    return null
  }
  const resource = unref(selectedResources)[0]
  return getMatchingSpace(resource)
})

const openWithDefaultAppQuery = useRouteQuery('openWithDefaultApp')
const performLoaderTask = async () => {
  await loadResourcesTask.perform()
  scrollToResourceFromRoute(unref(items), 'files-app-bar')
  if (queryItemAsString(unref(openWithDefaultAppQuery)) === 'true') {
    openWithDefaultApp({
      space: unref(selectedShareSpace),
      resource: unref(selectedResources)[0]
    })
  }
}

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

const fileOwners = computed(() => {
  const flatList = unref(paginatedResources)
    .map((i) => i.sharedBy)
    .flat()
  return [...new Map(flatList.map((item) => [item.displayName, item])).values()]
})

onMounted(() => {
  performLoaderTask()
})
</script>
