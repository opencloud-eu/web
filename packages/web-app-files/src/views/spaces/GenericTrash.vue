<template>
  <div class="oc-flex oc-width-1-1">
    <files-view-wrapper>
      <app-bar
        :breadcrumbs="breadcrumbs"
        :has-bulk-actions="true"
        :is-side-bar-open="isSideBarOpen"
        :space="space"
      >
        <template #actions>
          <oc-button
            v-if="emptyTrashBinAction.isVisible({ resources: [space] })"
            :disabled="paginatedResources.length === 0"
            :action-options="{ resources: [space] }"
            :class="emptyTrashBinAction.class"
            size="medium"
            appearance="filled"
            class="oc-mr-s"
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
          class="files-empty"
          icon="delete-bin-7"
          icon-fill-type="line"
        >
          <template #message>
            <span>{{ noContentMessage }}</span>
          </template>
        </no-content-message>
        <resource-table
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
          :has-actions="showActions"
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
            <list-info v-if="paginatedResources.length > 0" class="oc-width-1-1 oc-my-s" />
          </template>
        </resource-table>
      </template>
    </files-view-wrapper>
    <file-side-bar :is-open="isSideBarOpen" :active-panel="sideBarActivePanel" :space="space" />
  </div>
</template>

<script lang="ts">
import { storeToRefs } from 'pinia'

import {
  AppBar,
  AppLoadingSpinner,
  ContextActions,
  createLocationTrash,
  eventBus,
  FileSideBar,
  NoContentMessage,
  Pagination,
  ResourceTable,
  useDocumentTitle,
  useFileActionsEmptyTrashBin,
  useUserStore
} from '@opencloud-eu/web-pkg'
import FilesViewWrapper from '../../components/FilesViewWrapper.vue'
import ListInfo from '../../components/FilesList/ListInfo.vue'
import { useResourcesViewDefaults } from '../../composables'
import { computed, defineComponent, onBeforeUnmount, onMounted, PropType, unref } from 'vue'
import { isProjectSpaceResource, Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'

export default defineComponent({
  name: 'GenericTrash',

  components: {
    AppBar,
    AppLoadingSpinner,
    ContextActions,
    FileSideBar,
    FilesViewWrapper,
    ListInfo,
    NoContentMessage,
    Pagination,
    ResourceTable
  },

  props: {
    space: {
      type: Object as PropType<SpaceResource>,
      required: false,
      default: null
    },
    itemId: {
      type: [String, Number],
      required: false,
      default: null
    }
  },

  setup(props) {
    const { $gettext } = useGettext()

    const userStore = useUserStore()
    const { user } = storeToRefs(userStore)

    const { actions: emptyTrashBinActions } = useFileActionsEmptyTrashBin()
    const emptyTrashBinAction = computed(() => unref(emptyTrashBinActions)[0])

    let loadResourcesEventToken: string
    const noContentMessage = computed(() => {
      return props.space.driveType === 'personal'
        ? $gettext('You have no deleted files')
        : $gettext('Space has no deleted files')
    })

    const titleSegments = computed(() => {
      const segments = [$gettext('Deleted files')]
      segments.unshift(props.space.name)

      return segments
    })
    useDocumentTitle({ titleSegments })

    const resourcesViewDefaults = useResourcesViewDefaults<Resource, any, any[]>()
    const performLoaderTask = async () => {
      await resourcesViewDefaults.loadResourcesTask.perform(props.space)
      resourcesViewDefaults.refreshFileListHeaderPosition()
      resourcesViewDefaults.scrollToResourceFromRoute(
        unref(resourcesViewDefaults.paginatedResources),
        'files-app-bar'
      )
    }

    onMounted(() => {
      performLoaderTask()
      loadResourcesEventToken = eventBus.subscribe('app.files.list.load', () => {
        performLoaderTask()
      })
    })

    onBeforeUnmount(() => {
      eventBus.unsubscribe('app.files.list.load', loadResourcesEventToken)
    })

    return {
      ...resourcesViewDefaults,
      user,
      noContentMessage,
      emptyTrashBinAction
    }
  },

  computed: {
    isEmpty() {
      return this.paginatedResources.length < 1
    },

    breadcrumbs() {
      let currentNodeName = this.space?.name
      if (this.space.driveType === 'personal') {
        currentNodeName = this.$gettext('Personal')
      }
      return [
        {
          text: this.$gettext('Deleted files'),
          to: createLocationTrash('files-trash-overview')
        },
        {
          text: currentNodeName,
          onClick: () => eventBus.publish('app.files.list.load')
        }
      ]
    },

    showActions() {
      return (
        !isProjectSpaceResource(this.space) ||
        this.space.canDeleteFromTrashBin({ user: this.user }) ||
        this.space.canRestoreFromTrashbin({ user: this.user })
      )
    }
  }
})
</script>
