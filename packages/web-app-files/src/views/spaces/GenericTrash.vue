<template>
  <div class="flex w-full">
    <files-view-wrapper>
      <app-bar
        ref="appBarRef"
        :breadcrumbs="breadcrumbs"
        :has-bulk-actions="true"
        :is-side-bar-open="isSideBarOpen"
        :space="space"
        :view-modes="viewModes"
      >
        <template #actions>
          <oc-button
            v-if="emptyTrashBinAction.isVisible({ resources: [space] })"
            :disabled="paginatedResources.length === 0"
            :action-options="{ resources: [space] }"
            :class="emptyTrashBinAction.class"
            size="medium"
            appearance="filled"
            class="mr-2"
            @click="emptyTrashBinAction.handler({ resources: [space] })"
          >
            <oc-icon :name="emptyTrashBinAction.icon" size="medium" />
            {{ emptyTrashBinAction.label() }}
          </oc-button>
        </template>
      </app-bar>
      <app-loading-spinner v-if="areResourcesLoading" />
      <template v-else>
        <no-content-message
          v-if="isEmpty"
          id="files-trashbin-empty"
          icon="delete-bin-7"
          icon-fill-type="line"
        >
          <template #message>
            <span v-text="$gettext('This trash bin is empty')" />
          </template>
        </no-content-message>
        <component
          :is="folderView.component"
          v-else
          v-model:selected-ids="selectedResourcesIds"
          :is-side-bar-open="isSideBarOpen"
          :fields-displayed="['name', 'ddate']"
          :are-paths-displayed="true"
          :resources="paginatedResources"
          :are-resources-clickable="false"
          :are-thumbnails-displayed="false"
          :header-position="fileListHeaderY"
          :sort-by="sortBy"
          :sort-dir="sortDir"
          :space="space"
          :view-mode="viewMode"
          :has-actions="showActions"
          :sort-fields="sortFields.filter((field) => field.name === 'name')"
          :view-size="viewSize"
          :style="folderViewStyle"
          @sort="handleSort"
        >
          <template #contextMenu="{ resource, isOpen }">
            <context-actions
              v-if="isOpen && isResourceInSelection(resource)"
              :action-options="{ space, resources: selectedResources }"
            />
          </template>
          <template #footer>
            <pagination :pages="paginationPages" :current-page="paginationPage" />
            <list-info v-if="paginatedResources.length > 0" class="w-full my-2" />
          </template>
        </component>
      </template>
    </files-view-wrapper>
    <file-side-bar :is-open="isSideBarOpen" :active-panel="sideBarActivePanel" :space="space" />
  </div>
</template>

<script setup lang="ts">
import {
  ComponentPublicInstance,
  computed,
  onBeforeUnmount,
  onMounted,
  unref,
  useTemplateRef
} from 'vue'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'
import {
  AppBar,
  AppLoadingSpinner,
  ContextActions,
  createLocationTrash,
  eventBus,
  FileSideBar,
  Pagination,
  NoContentMessage,
  useDocumentTitle,
  useFileActionsEmptyTrashBin,
  useUserStore,
  useExtensionRegistry
} from '@opencloud-eu/web-pkg'

import FilesViewWrapper from '../../components/FilesViewWrapper.vue'
import ListInfo from '../../components/FilesList/ListInfo.vue'
import { useResourcesViewDefaults } from '../../composables'
import { isProjectSpaceResource, SpaceResource } from '@opencloud-eu/web-client'
import { folderViewsTrashExtensionPoint } from '../../extensionPoints'

const props = defineProps<{
  space?: SpaceResource | null
  itemId?: string | number | null
}>()

const { $gettext } = useGettext()

const userStore = useUserStore()
const { user } = storeToRefs(userStore)
const resourcesViewDefaults = useResourcesViewDefaults()

const {
  areResourcesLoading,
  paginatedResources,
  paginationPages,
  paginationPage,
  selectedResourcesIds,
  isSideBarOpen,
  fileListHeaderY,
  sortBy,
  sortDir,
  handleSort,
  sideBarActivePanel,
  selectedResources,
  isResourceInSelection,
  viewMode,
  viewSize,
  sortFields
} = resourcesViewDefaults

const extensionRegistry = useExtensionRegistry()
const viewModes = computed(() => {
  return [
    ...extensionRegistry.requestExtensions(folderViewsTrashExtensionPoint).map((e) => e.folderView)
  ]
})

const folderView = computed(() => {
  const viewMode = unref(resourcesViewDefaults.viewMode)
  return unref(viewModes).find((v) => v.name === viewMode)
})
const appBarRef = useTemplateRef<ComponentPublicInstance<typeof AppBar>>('appBarRef')
const folderViewStyle = computed(() => {
  return {
    ...(unref(folderView)?.isScrollable === false && {
      height: `calc(100% - ${unref(appBarRef)?.$el.getBoundingClientRect().height}px)`
    })
  }
})

const isEmpty = computed(() => unref(resourcesViewDefaults.paginatedResources).length < 1)

const { actions: emptyTrashBinActions } = useFileActionsEmptyTrashBin()
const emptyTrashBinAction = computed(() => unref(emptyTrashBinActions)[0])

const breadcrumbs = computed(() => {
  let currentNodeName = props.space?.name
  if (props.space?.driveType === 'personal') {
    currentNodeName = $gettext('Personal')
  }
  return [
    {
      text: $gettext('Deleted files'),
      to: createLocationTrash('files-trash-overview')
    },
    {
      text: currentNodeName,
      onClick: () => eventBus.publish('app.files.list.load')
    }
  ]
})

const showActions = computed(() => {
  return (
    !isProjectSpaceResource(props.space) ||
    props.space.canDeleteFromTrashBin({ user: user.value }) ||
    props.space.canRestoreFromTrashbin({ user: user.value })
  )
})

const titleSegments = computed(() => {
  const segments = [$gettext('Deleted files')]
  if (props.space?.name) {
    segments.unshift(props.space.name)
  }
  return segments
})
useDocumentTitle({ titleSegments })

const performLoaderTask = async () => {
  if (!props.space) return
  await resourcesViewDefaults.loadResourcesTask.perform(props.space)
  resourcesViewDefaults.refreshFileListHeaderPosition()
  resourcesViewDefaults.scrollToResourceFromRoute(
    unref(resourcesViewDefaults.paginatedResources),
    'files-app-bar'
  )
}

let loadResourcesEventToken: string

onMounted(() => {
  performLoaderTask()
  loadResourcesEventToken = eventBus.subscribe('app.files.list.load', () => {
    performLoaderTask()
  })
})

onBeforeUnmount(() => {
  eventBus.unsubscribe('app.files.list.load', loadResourcesEventToken)
})
</script>
