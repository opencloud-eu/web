<template>
  <div class="flex">
    <files-view-wrapper>
      <app-bar :view-modes="viewModes">
        <template #navigation>
          <SharesNavigation />
        </template>
      </app-bar>
      <app-loading-spinner v-if="areResourcesLoading" />
      <template v-else>
        <no-content-message
          v-if="isEmpty"
          id="files-shared-via-link-empty"
          img-src="/images/empty-states/shares.png"
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
          :resources="paginatedResources"
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
            <list-info v-if="paginatedResources.length > 0" class="w-full my-2" />
          </template>
        </component>
      </template>
    </files-view-wrapper>
    <file-side-bar :space="selectedResourceSpace" />
  </div>
</template>

<script lang="ts">
import {
  FileSideBar,
  useConfigStore,
  useFileActions,
  useLoadPreview,
  useResourcesStore
} from '@opencloud-eu/web-pkg'
import { AppLoadingSpinner } from '@opencloud-eu/web-pkg'
import { NoContentMessage } from '@opencloud-eu/web-pkg'
import { AppBar } from '@opencloud-eu/web-pkg'
import ListInfo from '../../components/FilesList/ListInfo.vue'
import { ContextActions } from '@opencloud-eu/web-pkg'
import FilesViewWrapper from '../../components/FilesViewWrapper.vue'
import { ResourceTable } from '@opencloud-eu/web-pkg'
import { Pagination } from '@opencloud-eu/web-pkg'

import { useResourcesViewDefaults } from '../../composables'
import { defineComponent, unref } from 'vue'
import { useGetMatchingSpace } from '@opencloud-eu/web-pkg'
import SharesNavigation from '../../../src/components/AppBar/SharesNavigation.vue'
import { storeToRefs } from 'pinia'
import { OutgoingShareResource } from '@opencloud-eu/web-client'
import { folderViewsSharedViaLinkExtensionPoint } from '../../extensionPoints'

export default defineComponent({
  components: {
    SharesNavigation,
    FilesViewWrapper,
    AppBar,
    ResourceTable,
    AppLoadingSpinner,
    NoContentMessage,
    ListInfo,
    Pagination,
    ContextActions,
    FileSideBar
  },

  setup() {
    const { getMatchingSpace } = useGetMatchingSpace()
    const configStore = useConfigStore()
    const { options: configOptions } = storeToRefs(configStore)

    const resourcesStore = useResourcesStore()
    const { totalResourcesCount } = storeToRefs(resourcesStore)

    const resourcesViewDefaults = useResourcesViewDefaults<OutgoingShareResource, any, any[]>({
      folderViewExtensionPoint: folderViewsSharedViaLinkExtensionPoint
    })
    const { loadResourcesTask, selectedResourcesIds, paginatedResources, viewMode } =
      resourcesViewDefaults

    const { loadPreview } = useLoadPreview(viewMode)

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

    return {
      ...useFileActions(),
      ...resourcesViewDefaults,
      configOptions,
      getMatchingSpace,
      totalResourcesCount,
      loadPreview
    }
  },

  computed: {
    helpersEnabled() {
      return this.configOptions.contextHelpers
    },

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
