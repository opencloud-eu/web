<template>
  <div class="flex">
    <files-view-wrapper class="flex-col">
      <app-bar :has-bulk-actions="true" :view-modes="viewModes" :breadcrumbs="breadcrumbs">
        <template #navigation>
          <SharesNavigation />
        </template>
        <template #actions>
          <div class="flex flex-wrap gap-2 justify-between w-full mt-2 mb-4 items-center">
            <div class="flex flex-wrap gap-2">
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
                :loading="areResourcesLoading"
                :option-filter-label="$gettext('Filter share types')"
                :show-option-filter="true"
                :no-items-message="
                  $gettext('No shares yet. Available share types will appear here.')
                "
                id-attribute="key"
                class="share-type-filter"
                display-name-attribute="label"
                filter-name="shareType"
              >
                <template #item="{ item, term }">
                  <span class="ml-2"><oc-filter-highlight :text="item.label" :term="term" /></span>
                </template>
              </item-filter>
              <item-filter
                :allow-multiple="true"
                :filter-label="$gettext('Shared By')"
                :filterable-attributes="['displayName']"
                :items="fileOwners"
                :loading="areResourcesLoading"
                :option-filter-label="$gettext('Filter shared by')"
                :show-option-filter="true"
                :no-items-message="
                  $gettext(
                    'No shares yet. People who share files and folders with you will appear here.'
                  )
                "
                id-attribute="id"
                class="shared-by-filter"
                display-name-attribute="displayName"
                filter-name="sharedBy"
              >
                <template #image="{ item }">
                  <user-avatar :user-id="item.id" :user-name="item.displayName" :width="32" />
                </template>
                <template #item="{ item, term }">
                  <span class="ml-2"
                    ><oc-filter-highlight :text="item.displayName" :term="term"
                  /></span>
                </template>
              </item-filter>
            </div>
            <oc-search-bar
              is-filter
              v-model="filterTerm"
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
          id="files-shared-with-me-view"
          class="h-full"
          :file-list-header-y="fileListHeaderY"
          :items="paginatedResources"
          :has-shares="storeItems.length > 0"
          :sort-by="sortBy"
          :sort-dir="sortDir"
          :sort-handler="handleSort"
          :pagination-pages="paginationPages"
          :pagination-page="paginationPage"
          :folder-view="folderView"
          :title="shareSectionTitle"
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
import { useResourcesViewDefaults } from '../../composables'
import {
  useKeyboardFileNavigation,
  useKeyboardFileMouseActions
} from '../../composables/keyboardActions'

import {
  AppLoadingSpinner,
  FileSideBar,
  InlineFilterOption,
  ItemFilter,
  useAppsStore,
  useResourcesStore,
  UserAvatar,
  useKeyboardActions
} from '@opencloud-eu/web-pkg'
import { eventBus } from '@opencloud-eu/web-pkg'
import { AppBar, ItemFilterInline } from '@opencloud-eu/web-pkg'
import { queryItemAsString, useRoute, useRouteQuery, useRouter } from '@opencloud-eu/web-pkg'
import SharedWithMeSection from '../../components/Shares/SharedWithMeSection.vue'
import { computed, onBeforeUnmount, onMounted, ref, unref, watch } from 'vue'
import FilesViewWrapper from '../../components/FilesViewWrapper.vue'
import { useGetMatchingSpace } from '@opencloud-eu/web-pkg'
import SharesNavigation from '../../components/AppBar/SharesNavigation.vue'
import { useGettext } from 'vue3-gettext'
import { defaultFuseOptions } from '@opencloud-eu/web-pkg'
import { IncomingShareResource, ShareTypes } from '@opencloud-eu/web-client'
import { uniq } from 'lodash-es'
import { folderViewsSharedWithMeExtensionPoint } from '../../extensionPoints'
import { v4 as uuidV4 } from 'uuid'
import { OcFilterHighlight } from '@opencloud-eu/design-system/components'

const appsStore = useAppsStore()
const resourcesStore = useResourcesStore()
const router = useRouter()
const route = useRoute()

const areHiddenFilesShown = ref(false)
const filterTerm = ref('')
const selectedShareTypesQuery = useRouteQuery('q_shareType')
const selectedSharedByQuery = useRouteQuery('q_sharedBy')

function filterShares(shares: IncomingShareResource[]) {
  let result = shares.filter(({ hidden }) => !!hidden === unref(areHiddenFilesShown))

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
    result = usersSearchEngine.search(unref(filterTerm)).map((r) => r.item)
  }

  return result
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
  storeItems,
  sortedResources,
  paginatedResources,
  paginationPages,
  paginationPage,
  scrollToResourceFromRoute
} = useResourcesViewDefaults<IncomingShareResource, any, any>({
  folderViewExtensionPoint: folderViewsSharedWithMeExtensionPoint,
  filterResources: filterShares
})

const { $gettext } = useGettext()

const breadcrumbs = computed(() => {
  return [
    {
      id: uuidV4(),
      text: $gettext('Shares'),
      onClick: () => loadResourcesTask.perform(),
      isStaticNav: true
    }
  ]
})

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

watch(filterTerm, async () => {
  await router.push({ ...unref(route), query: { ...unref(route).query, page: '1' } })
})

const keyActions = useKeyboardActions()
useKeyboardFileNavigation(keyActions, paginatedResources, viewMode)
useKeyboardFileMouseActions(keyActions, viewMode)

const { getMatchingSpace } = useGetMatchingSpace()

const selectedShareSpace = computed(() => {
  if (unref(selectedResources).length !== 1) {
    return null
  }
  const resource = unref(selectedResources)[0]
  return getMatchingSpace(resource)
})

const performLoaderTask = async () => {
  await loadResourcesTask.perform()
  scrollToResourceFromRoute(unref(sortedResources), 'files-app-bar')
}

const shareTypes = computed(() => {
  const uniqueShareTypes = uniq(unref(storeItems).flatMap((i) => i.shareTypes))

  const ocmAvailable = appsStore.appIds.includes('open-cloud-mesh')
  if (ocmAvailable && !uniqueShareTypes.includes(ShareTypes.remote.value)) {
    uniqueShareTypes.push(ShareTypes.remote.value)
  }

  return ShareTypes.getByValues(uniqueShareTypes)
    .filter(Boolean)
    .map((shareType) => {
      return {
        key: shareType.key,
        value: shareType.value,
        label: $gettext(shareType.label)
      }
    })
})

const fileOwners = computed(() => {
  const flatList = unref(storeItems)
    .filter((i) => i.sharedBy)
    .map((i) => i.sharedBy)
    .flat()
  return [...new Map(flatList.map((item) => [item.displayName, item])).values()]
})

let loadResourcesEventToken: string
onMounted(() => {
  performLoaderTask()
  loadResourcesEventToken = eventBus.subscribe('app.files.list.load', performLoaderTask)
})

onBeforeUnmount(() => {
  eventBus.unsubscribe('app.files.list.load', loadResourcesEventToken)
})
</script>
