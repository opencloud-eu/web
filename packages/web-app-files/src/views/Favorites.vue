<template>
  <div class="flex">
    <files-view-wrapper>
      <app-bar :view-modes="viewModes" :is-side-bar-open="isSideBarOpen" />
      <app-loading-spinner v-if="areResourcesLoading" />
      <template v-else>
        <no-content-message v-if="isEmpty" id="files-favorites-empty" icon="star">
          <template #message>
            <span v-text="$gettext('There are no resources marked as favorite')" />
          </template>
        </no-content-message>
        <component
          :is="folderView.component"
          v-else
          v-model:selected-ids="selectedResourcesIds"
          :is-side-bar-open="isSideBarOpen"
          :are-paths-displayed="true"
          :resources="paginatedResources"
          :header-position="fileListHeaderY"
          :sort-by="sortBy"
          :sort-dir="sortDir"
          v-bind="folderView.componentAttrs?.()"
          @file-click="triggerDefaultAction"
          @item-visible="loadPreview({ space: getMatchingSpace($event), resource: $event })"
          @sort="handleSort"
        >
          <template #quickActions="props">
            <quick-actions class="hidden sm:block" :item="props.resource" />
          </template>
          <template #contextMenu="{ resource, isOpen }">
            <context-actions
              v-if="isOpen && isResourceInSelection(resource)"
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
    <file-side-bar
      :is-open="isSideBarOpen"
      :active-panel="sideBarActivePanel"
      :space="selectedResourceSpace"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, onBeforeUnmount, onMounted } from 'vue'
import { Resource } from '@opencloud-eu/web-client'
import { useConfigStore, useResourcesStore, useLoadPreview } from '@opencloud-eu/web-pkg'
import { AppLoadingSpinner } from '@opencloud-eu/web-pkg'
import { FileSideBar, NoContentMessage } from '@opencloud-eu/web-pkg'
import { Pagination } from '@opencloud-eu/web-pkg'
import { eventBus } from '@opencloud-eu/web-pkg'
import { useGetMatchingSpace } from '@opencloud-eu/web-pkg'

import { AppBar } from '@opencloud-eu/web-pkg'
import QuickActions from '../components/FilesList/QuickActions.vue'
import ListInfo from '../components/FilesList/ListInfo.vue'
import { ContextActions } from '@opencloud-eu/web-pkg'
import { ResourceTable } from '@opencloud-eu/web-pkg'
import FilesViewWrapper from '../components/FilesViewWrapper.vue'
import { useResourcesViewDefaults } from '../composables'
import { useFileActions } from '@opencloud-eu/web-pkg'
import { storeToRefs } from 'pinia'
import { folderViewsFavoritesExtensionPoint } from '../extensionPoints'

export default defineComponent({
  components: {
    FilesViewWrapper,
    AppBar,
    FileSideBar,
    ResourceTable,
    QuickActions,
    AppLoadingSpinner,
    Pagination,
    NoContentMessage,
    ListInfo,
    ContextActions
  },

  setup() {
    const { getMatchingSpace } = useGetMatchingSpace()
    const configStore = useConfigStore()
    const { options: configOptions } = storeToRefs(configStore)

    const resourcesStore = useResourcesStore()

    const resourcesViewDefaults = useResourcesViewDefaults<Resource, any, any[]>({
      folderViewExtensionPoint: folderViewsFavoritesExtensionPoint
    })
    const { loadPreview } = useLoadPreview(resourcesViewDefaults.viewMode)

    let loadResourcesEventToken: string
    onMounted(() => {
      loadResourcesEventToken = eventBus.subscribe(
        'app.files.list.removeFromFavorites',
        (resourceId: string) => {
          resourcesStore.removeResources([{ id: resourceId }] as Resource[])
        }
      )
    })

    onBeforeUnmount(() => {
      eventBus.unsubscribe('app.files.list.removeFromFavorites', loadResourcesEventToken)
    })

    return {
      ...useFileActions(),
      ...resourcesViewDefaults,
      configOptions,
      getMatchingSpace,
      loadPreview
    }
  },

  computed: {
    isEmpty() {
      return this.paginatedResources.length < 1
    }
  },

  async created() {
    await this.loadResourcesTask.perform()
    this.scrollToResourceFromRoute(this.paginatedResources, 'files-app-bar')
  }
})
</script>
