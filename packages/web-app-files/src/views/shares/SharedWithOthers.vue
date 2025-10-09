<template>
  <div class="flex">
    <files-view-wrapper>
      <app-bar ref="appBarRef" :is-side-bar-open="isSideBarOpen" :view-modes="viewModes">
        <template #navigation>
          <SharesNavigation />
        </template>
      </app-bar>
      <app-loading-spinner v-if="areResourcesLoading" />
      <template v-else>
        <div v-if="shareTypes.length > 1" class="flex m-4">
          <div class="mr-4 flex items-center">
            <oc-icon name="filter-2" class="mr-1" />
            <span v-text="$gettext('Filter:')" />
          </div>
          <item-filter
            :allow-multiple="true"
            :filter-label="$gettext('Share Type')"
            :filterable-attributes="['label']"
            :items="shareTypes"
            :option-filter-label="$gettext('Filter share types')"
            :show-option-filter="true"
            id-attribute="key"
            class="share-type-filter mx-2"
            display-name-attribute="label"
            filter-name="shareType"
          >
            <template #item="{ item }">
              <span class="ml-2" v-text="item.label" />
            </template>
          </item-filter>
        </div>
        <no-content-message v-if="isEmpty" id="files-shared-with-others-empty" icon="reply">
          <template #message>
            <span v-text="$gettext('You have not shared any resources with other people.')" />
          </template>
        </no-content-message>
        <component
          :is="folderView.component"
          v-else
          v-model:selected-ids="selectedResourcesIds"
          :is-side-bar-open="isSideBarOpen"
          :fields-displayed="['name', 'sharedWith', 'sdate']"
          :are-paths-displayed="true"
          :resources="filteredItems"
          :header-position="fileListHeaderY"
          :sort-by="sortBy"
          :sort-dir="sortDir"
          :sort-fields="sortFields.filter((field) => field.name === 'name')"
          :view-mode="viewMode"
          :view-size="viewSize"
          :style="folderViewStyle"
          :grouping-settings="groupingSettings"
          @file-click="triggerDefaultAction"
          @item-visible="loadPreview({ space: getMatchingSpace($event), resource: $event })"
          @sort="handleSort"
        >
          <template #contextMenu="{ resource, isOpen }">
            <context-actions
              v-if="isOpen && isResourceInSelection(resource)"
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
    <file-side-bar
      :is-open="isSideBarOpen"
      :active-panel="sideBarActivePanel"
      :space="selectedResourceSpace"
    />
  </div>
</template>

<script lang="ts">
import {
  queryItemAsString,
  useAppsStore,
  useCapabilityStore,
  useConfigStore,
  useExtensionRegistry,
  useFileActions,
  useLoadPreview,
  useResourcesStore,
  useRouteQuery
} from '@opencloud-eu/web-pkg'
import { ItemFilter } from '@opencloud-eu/web-pkg'
import { uniq } from 'lodash-es'

import { FileSideBar, ResourceTable } from '@opencloud-eu/web-pkg'
import { AppLoadingSpinner } from '@opencloud-eu/web-pkg'
import { NoContentMessage } from '@opencloud-eu/web-pkg'
import { AppBar } from '@opencloud-eu/web-pkg'
import ListInfo from '../../components/FilesList/ListInfo.vue'
import { Pagination } from '@opencloud-eu/web-pkg'
import { ContextActions } from '@opencloud-eu/web-pkg'
import FilesViewWrapper from '../../components/FilesViewWrapper.vue'

import { useResourcesViewDefaults } from '../../composables'
import { defineComponent, computed, unref, useTemplateRef, ComponentPublicInstance } from 'vue'
import { useGroupingSettings } from '@opencloud-eu/web-pkg'
import { useGetMatchingSpace } from '@opencloud-eu/web-pkg'
import SharesNavigation from '../../components/AppBar/SharesNavigation.vue'
import { OutgoingShareResource, ShareTypes } from '@opencloud-eu/web-client'
import { storeToRefs } from 'pinia'
import { useGettext } from 'vue3-gettext'
import { folderViewsSharedWithOthers } from '../../extensionPoints'

export default defineComponent({
  components: {
    SharesNavigation,
    FilesViewWrapper,
    AppBar,
    FileSideBar,
    ResourceTable,
    AppLoadingSpinner,
    NoContentMessage,
    ListInfo,
    Pagination,
    ContextActions,
    ItemFilter
  },

  setup() {
    const capabilityStore = useCapabilityStore()
    const { getMatchingSpace } = useGetMatchingSpace()
    const configStore = useConfigStore()
    const appsStore = useAppsStore()
    const { options: configOptions } = storeToRefs(configStore)
    const { $gettext } = useGettext()

    const resourcesStore = useResourcesStore()

    const resourcesViewDefaults = useResourcesViewDefaults<OutgoingShareResource, any, any[]>()
    const {
      sortBy,
      sortDir,
      loadResourcesTask,
      selectedResourcesIds,
      paginatedResources,
      viewMode
    } = resourcesViewDefaults
    const { loadPreview } = useLoadPreview(viewMode)

    const extensionRegistry = useExtensionRegistry()

    const folderView = computed(() => {
      const viewMode = unref(resourcesViewDefaults.viewMode)
      return unref(viewModes).find((v) => v.name === viewMode)
    })

    const viewModes = computed(() => {
      return [
        ...extensionRegistry.requestExtensions(folderViewsSharedWithOthers).map((e) => e.folderView)
      ]
    })

    const appBarRef = useTemplateRef<ComponentPublicInstance<typeof AppBar>>('appBarRef')
    const folderViewStyle = computed(() => {
      return {
        ...(unref(folderView)?.isScrollable === false && {
          height: `calc(100% - ${unref(appBarRef)?.$el.getBoundingClientRect().height}px)`
        })
      }
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
    const filteredItems = computed(() => {
      const selectedShareTypes = queryItemAsString(unref(selectedShareTypesQuery))?.split('+')
      if (!selectedShareTypes || selectedShareTypes.length === 0) {
        return unref(paginatedResources)
      }
      return unref(paginatedResources).filter((item) => {
        return ShareTypes.getByKeys(selectedShareTypes)
          .map(({ value }) => value)
          .some((t) => item.shareTypes.includes(t))
      })
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

    return {
      ...useFileActions(),
      ...resourcesViewDefaults,
      configStore,
      configOptions,
      capabilityStore,
      filteredItems,
      shareTypes,
      getMatchingSpace,
      loadPreview,
      folderView,
      folderViewStyle,
      viewModes,
      appBarRef,

      // CERN
      ...useGroupingSettings({ sortBy, sortDir })
    }
  },

  computed: {
    isEmpty() {
      return this.filteredItems.length < 1
    }
  },

  async created() {
    await this.loadResourcesTask.perform()
    this.scrollToResourceFromRoute(this.filteredItems, 'files-app-bar')
  }
})
</script>
