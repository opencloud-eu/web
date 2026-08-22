<template>
  <div class="flex">
    <files-view-wrapper>
      <app-bar :view-modes="viewModes" :has-bulk-actions="true" :breadcrumbs="breadcrumbs">
        <template #actions>
          <div v-if="displayFilter" class="files-favorites-filter flex flex-wrap my-2">
            <item-filter
              v-if="availableMediaTypeValues.length"
              ref="mediaTypeFilter"
              :allow-multiple="true"
              :filter-label="$gettext('Type')"
              :filterable-attributes="['label']"
              :items="availableMediaTypeValues"
              class="mr-2"
              display-name-attribute="label"
              filter-name="mediaType"
            >
              <template #image="{ item }">
                <div
                  class="flex items-center"
                  :data-test-id="`media-type-${item.id.toLowerCase()}`"
                >
                  <resource-icon :resource="getFakeResourceForIcon(item)" />
                  <span class="ml-2">{{ item.label }}</span>
                </div>
              </template>
            </item-filter>
            <item-filter
              v-if="availableLastModifiedValues.length"
              ref="lastModifiedFilter"
              :filter-label="$gettext('Last Modified')"
              :filterable-attributes="['label']"
              :items="availableLastModifiedValues"
              :show-option-filter="false"
              :close-on-click="true"
              class="files-favorites-filter-last-modified mr-2"
              display-name-attribute="label"
              filter-name="lastModified"
            >
              <template #item="{ item }">
                <span v-text="item.label" />
              </template>
            </item-filter>
          </div>
        </template>
      </app-bar>
      <app-loading-spinner v-if="areResourcesLoading" />
      <template v-else>
        <no-content-message
          v-if="isEmpty"
          id="files-favorites-empty"
          img-src="images/empty-states/empty-favorites.svg"
        >
          <template #message>
            <span v-text="$gettext('Nothing marked as favorite, yet')" />
          </template>
          <template #callToAction>
            <span v-text="emptyStateDescription" />
          </template>
        </no-content-message>
        <component
          :is="folderView.component"
          v-else
          :are-paths-displayed="true"
          :resources="paginatedResources"
          :view-mode="viewMode"
          :header-position="fileListHeaderY"
          :sort-by="sortBy"
          :sort-dir="sortDir"
          :sort-fields="sortFields"
          :view-size="viewSize"
          v-bind="folderView.componentAttrs?.()"
          @file-click="triggerDefaultAction"
          @item-visible="
            loadPreview({
              space: getMatchingSpace($event),
              resource: $event,
              ...(isProjectSpaceResource($event) && { processor: ProcessorType.enum.fit })
            })
          "
          @item-hidden="dropPreview($event)"
          @sort="handleSort"
          @update:selected-ids="selectedResourcesIds = $event"
        >
          <template #quickActions="props">
            <quick-actions class="hidden sm:block" :item="props.resource" />
          </template>
          <template #contextMenu="{ resource }">
            <context-actions
              v-if="isResourceInSelection(resource)"
              :action-options="{ space: getMatchingSpace(resource), resources: selectedResources }"
            />
          </template>
          <template #footer>
            <pagination :pages="paginationPages" :current-page="paginationPage" />
            <list-info v-if="paginatedResources.length > 0" class="w-full my-2" />
          </template>
        </component>
      </template>
    </files-view-wrapper>
    <file-side-bar :space="selectedResourceSpace" />
  </div>
</template>

<script setup lang="ts">
import {
  ComponentPublicInstance,
  computed,
  onBeforeUnmount,
  onMounted,
  unref,
  useTemplateRef,
  watch
} from 'vue'
import { isProjectSpaceResource, Resource } from '@opencloud-eu/web-client'
import {
  useClientService,
  useSpacesStore,
  useResourcesStore,
  useLoadPreview,
  createLocationCommon,
  AppLoadingSpinner,
  FileSideBar,
  NoContentMessage,
  Pagination,
  eventBus,
  AppBar,
  useGetMatchingSpace,
  ContextActions,
  useFileActions,
  ItemFilter,
  ResourceIcon,
  ProcessorType,
  useCapabilityStore,
  useRouteQuery,
  getLastModifiedFilterOptions,
  getMediaTypeFilterOptions,
  SearchMediaTypeFilterOption
} from '@opencloud-eu/web-pkg'
import QuickActions from '../components/FilesList/QuickActions.vue'
import ListInfo from '../components/FilesList/ListInfo.vue'
import FilesViewWrapper from '../components/FilesViewWrapper.vue'
import { useResourcesViewDefaults } from '../composables'
import { folderViewsFavoritesExtensionPoint } from '../extensionPoints'
import { useGettext } from 'vue3-gettext'
import { v4 as uuidV4 } from 'uuid'

const { getMatchingSpace } = useGetMatchingSpace()
const { loadGraphPermissions } = useSpacesStore()
const clientService = useClientService()
const { $gettext } = useGettext()
const capabilityStore = useCapabilityStore()

const resourcesStore = useResourcesStore()

const mediaTypeFilter =
  useTemplateRef<ComponentPublicInstance<typeof ItemFilter>>('mediaTypeFilter')
const lastModifiedFilter =
  useTemplateRef<ComponentPublicInstance<typeof ItemFilter>>('lastModifiedFilter')

const lastModifiedParam = useRouteQuery('q_lastModified')
const mediaTypeParam = useRouteQuery('q_mediaType')

const availableLastModifiedValues = computed(() =>
  getLastModifiedFilterOptions(capabilityStore.searchLastMofifiedDate.keywords, $gettext)
)

const availableMediaTypeValues = computed(() => {
  return getMediaTypeFilterOptions(capabilityStore.searchMediaType.keywords, $gettext)
})

function getFakeResourceForIcon(item: SearchMediaTypeFilterOption) {
  return { type: 'file', extension: item.icon, isFolder: item.icon == 'folder' } as Resource
}

const displayFilter = computed(() => {
  return (
    unref(availableLastModifiedValues).length || capabilityStore.searchMediaType.keywords?.length
  )
})

const emptyStateDescription = computed(() => {
  if (unref(lastModifiedParam) || unref(mediaTypeParam)) {
    return $gettext('Try refining the search term or filters to get results')
  }
  return $gettext('All your favorites will show up here')
})

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
} = useResourcesViewDefaults<Resource, any, any[]>({
  folderViewExtensionPoint: folderViewsFavoritesExtensionPoint
})

const { triggerDefaultAction } = useFileActions()

const { loadPreview, dropPreview } = useLoadPreview(viewMode)

const breadcrumbs = computed(() => {
  return [
    {
      id: uuidV4(),
      text: $gettext('Favorites'),
      to: createLocationCommon('files-common-favorites'),
      isStaticNav: true
    }
  ]
})

let loadResourcesEventToken: string
onMounted(async () => {
  loadResourcesEventToken = eventBus.subscribe(
    'app.files.list.removeFromFavorites',
    (resourceId: string) => {
      resourcesStore.removeResources([{ id: resourceId }] as Resource[])
    }
  )

  await loadResourcesTask.perform()
  scrollToResourceFromRoute(unref(paginatedResources), 'files-app-bar')
})

onBeforeUnmount(() => {
  eventBus.unsubscribe('app.files.list.removeFromFavorites', loadResourcesEventToken)
})

watch(selectedResourcesIds, async (ids) => {
  if (!ids.length) {
    return
  }

  const projectSpaceIds = unref(selectedResources)
    .filter(isProjectSpaceResource)
    .map((space) => space.id)
  if (!projectSpaceIds.length) {
    return
  }

  await loadGraphPermissions({
    ids: projectSpaceIds,
    graphClient: clientService.graphAuthenticated
  })
})

watch(
  [lastModifiedParam, mediaTypeParam],
  async () => {
    await loadResourcesTask.perform()
  },
  { deep: true }
)

const isEmpty = computed(() => {
  return unref(paginatedResources).length < 1
})
</script>
