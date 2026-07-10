<template>
  <div class="flex">
    <files-view-wrapper>
      <app-bar :view-modes="viewModes" :has-bulk-actions="true" :breadcrumbs="breadcrumbs" />
      <app-loading-spinner v-if="areResourcesLoading" />
      <template v-else>
        <no-content-message
          v-if="isEmpty"
          id="files-favorites-empty"
          img-src="/images/empty-states/empty-favorites.svg"
        >
          <template #message>
            <span v-text="$gettext('Nothing marked as favorite, yet')" />
          </template>
          <template #callToAction>
            <span v-text="$gettext('All your favorites will show up here')" />
          </template>
        </no-content-message>
        <component
          :is="folderView.component"
          v-else
          v-model:selected-ids="selectedResourcesIds"
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
          @item-visible="loadPreview({ space: getMatchingSpace($event), resource: $event })"
          @sort="handleSort"
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
import { computed, onBeforeUnmount, onMounted, unref, watch } from 'vue'
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
  useFileActions
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
} = useResourcesViewDefaults<Resource, any, any[]>({
  folderViewExtensionPoint: folderViewsFavoritesExtensionPoint
})

const { triggerDefaultAction } = useFileActions()

const { loadPreview } = useLoadPreview(viewMode)

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

const isEmpty = computed(() => {
  return unref(paginatedResources).length < 1
})
</script>
