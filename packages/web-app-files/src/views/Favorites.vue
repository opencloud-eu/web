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

<script lang="ts">
import { computed, defineComponent, onBeforeUnmount, onMounted, unref, watch } from 'vue'
import { isProjectSpaceResource, Resource } from '@opencloud-eu/web-client'
import {
  useClientService,
  useConfigStore,
  useSpacesStore,
  useResourcesStore,
  useLoadPreview,
  createLocationCommon
} from '@opencloud-eu/web-pkg'
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
import { useGettext } from 'vue3-gettext'
import { v4 as uuidV4 } from 'uuid'

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
    const { loadGraphPermissions } = useSpacesStore()
    const clientService = useClientService()
    const { $gettext } = useGettext()
    const { options: configOptions } = storeToRefs(configStore)

    const resourcesStore = useResourcesStore()

    const resourcesViewDefaults = useResourcesViewDefaults<Resource, any, any[]>({
      folderViewExtensionPoint: folderViewsFavoritesExtensionPoint
    })

    const { selectedResources, selectedResourcesIds, viewMode } = resourcesViewDefaults

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

    return {
      ...useFileActions(),
      ...resourcesViewDefaults,
      configOptions,
      getMatchingSpace,
      loadPreview,
      breadcrumbs
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
