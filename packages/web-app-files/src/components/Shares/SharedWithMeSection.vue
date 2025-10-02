<template>
  <div>
    <h2 class="px-4 py-2 sr-only">
      {{ title }}
      <span class="text-base">({{ items.length }})</span>
    </h2>

    <no-content-message v-if="!items.length" class="files-empty" icon="share-forward">
      <template #message>
        <span>{{ emptyMessage }}</span>
      </template>
    </no-content-message>
    <resource-table
      v-else
      v-model:selected-ids="selectedResourcesIds"
      :is-side-bar-open="isSideBarOpen"
      :fields-displayed="displayedFields"
      :resources="resourceItems"
      :are-resources-clickable="resourceClickable"
      :target-route-callback="resourceTargetRouteCallback"
      :header-position="fileListHeaderY"
      :sort-by="sortBy"
      :sort-dir="sortDir"
      :grouping-settings="groupingSettings"
      @file-click="triggerDefaultAction"
      @item-visible="loadPreview({ space: getMatchingSpace($event), resource: $event })"
      @sort="sortHandler"
    >
      <template #syncEnabled="{ resource }">
        <div
          :key="resource.getDomSelector()"
          class="whitespace-nowrap flex items-center justify-end"
        >
          <oc-icon
            v-if="resource.shareRoles?.length"
            v-oc-tooltip="$gettext(resource.shareRoles[0].displayName)"
            :accessible-label="$gettext(resource.shareRoles[0].description)"
            :name="resource.shareRoles[0].icon"
            fill-type="line"
            size="small"
          />
          <oc-icon
            v-else-if="isExternalShare(resource)"
            v-oc-tooltip="ShareTypes.remote.label"
            :accessible-label="ShareTypes.remote.label"
            :name="ShareTypes.remote.icon"
            fill-type="line"
            size="small"
          />
          <oc-icon
            v-if="resource.syncEnabled"
            v-oc-tooltip="$gettext('Synced with your devices')"
            :accessible-label="$gettext('Synced with your devices')"
            name="loop-right"
            class="sync-enabled ml-2"
            size="small"
          />
        </div>
      </template>
      <template #contextMenu="{ resource, isOpen }">
        <context-actions
          v-if="isOpen && isResourceInSelection(resource)"
          :action-options="{ space: getMatchingSpace(resource), resources: selectedResources }"
        />
      </template>
      <template #quickActions="{ resource }">
        <oc-button
          v-oc-tooltip="hideShareAction.label({ space: null, resources: [resource] })"
          :aria-label="hideShareAction.label({ space: null, resources: [resource] })"
          appearance="raw"
          :class="['p-1', hideShareAction.class, 'raw-hover-surface']"
          @click.stop="hideShareAction.handler({ space: null, resources: [resource] })"
        >
          <oc-icon
            :name="resource.hidden ? 'eye' : 'eye-off'"
            fill-type="line"
            aria-hidden="true"
          />
        </oc-button>
      </template>
      <template #footer>
        <div v-if="showMoreToggle && hasMore" class="w-full text-center mt-4">
          <oc-button
            id="files-shared-with-me-show-all"
            appearance="raw"
            gap-size="xsmall"
            size="small"
            :data-test-expand="(!showMore).toString()"
            @click="toggleShowMore"
          >
            {{ toggleMoreLabel }}
            <oc-icon :name="'arrow-' + (showMore ? 'up' : 'down') + '-s'" fill-type="line" />
          </oc-button>
        </div>
        <list-info v-else class="w-full my-2" />
      </template>
    </resource-table>
  </div>
</template>

<script lang="ts">
import {
  ResourceTable,
  useCapabilityStore,
  useConfigStore,
  useFileActions,
  useFileActionsToggleHideShare,
  useLoadPreview,
  useResourcesStore
} from '@opencloud-eu/web-pkg'
import { computed, defineComponent, PropType, unref } from 'vue'
import { SortDir, useGetMatchingSpace } from '@opencloud-eu/web-pkg'
import { createLocationSpaces } from '@opencloud-eu/web-pkg'
import ListInfo from '../../components/FilesList/ListInfo.vue'
import { IncomingShareResource, ShareTypes } from '@opencloud-eu/web-client'
import { ContextActions } from '@opencloud-eu/web-pkg'
import { NoContentMessage } from '@opencloud-eu/web-pkg'
import { useSelectedResources } from '@opencloud-eu/web-pkg'
import { RouteLocationNamedRaw } from 'vue-router'
import { CreateTargetRouteOptions } from '@opencloud-eu/web-pkg'
import { createFileRouteOptions } from '@opencloud-eu/web-pkg'

export default defineComponent({
  components: {
    ResourceTable,
    ContextActions,
    ListInfo,
    NoContentMessage
  },

  props: {
    title: {
      type: String,
      required: true
    },
    emptyMessage: {
      type: String,
      required: false,
      default: ''
    },
    items: {
      type: Array as PropType<IncomingShareResource[]>,
      required: true
    },
    sortBy: {
      type: String,
      required: false,
      default: undefined
    },
    sortDir: {
      type: String as PropType<SortDir>,
      required: false,
      default: undefined,
      validator: (value: string) => {
        return (
          value === undefined || [SortDir.Asc.toString(), SortDir.Desc.toString()].includes(value)
        )
      }
    },
    sortHandler: {
      type: Function as PropType<any>,
      required: true
    },
    showMoreToggle: {
      type: Boolean,
      default: false
    },
    showMoreToggleCount: {
      type: Number,
      default: 3
    },
    resourceClickable: {
      type: Boolean,
      default: true
    },
    isSideBarOpen: {
      type: Boolean,
      default: false
    },
    fileListHeaderY: {
      type: Number,
      default: 0
    },
    /**
     * This is only relevant for CERN and can be ignored in any other cases.
     */
    groupingSettings: {
      type: Object,
      required: false,
      default: null
    }
  },
  setup() {
    const capabilityStore = useCapabilityStore()
    const configStore = useConfigStore()
    const { getMatchingSpace } = useGetMatchingSpace()
    const { loadPreview } = useLoadPreview()

    const { triggerDefaultAction } = useFileActions()
    const { actions: hideShareActions } = useFileActionsToggleHideShare()
    const hideShareAction = computed(() => unref(hideShareActions)[0])

    const { updateResourceField } = useResourcesStore()

    const isExternalShare = (resource: IncomingShareResource) => {
      return resource.shareTypes.includes(ShareTypes.remote.value)
    }

    const resourceTargetRouteCallback = ({
      path,
      fileId,
      resource
    }: CreateTargetRouteOptions): RouteLocationNamedRaw => {
      return createLocationSpaces(
        'files-spaces-generic',
        createFileRouteOptions(getMatchingSpace(resource), { path, fileId })
      )
    }

    return {
      capabilityStore,
      configStore,
      triggerDefaultAction,
      hideShareAction,
      resourceTargetRouteCallback,
      ...useSelectedResources(),
      getMatchingSpace,
      updateResourceField,
      isExternalShare,
      ShareTypes,
      loadPreview
    }
  },

  data: () => ({
    showMore: false
  }),

  computed: {
    displayedFields() {
      return ['name', 'syncEnabled', 'sharedBy', 'sdate', 'sharedWith']
    },
    toggleMoreLabel() {
      return this.showMore ? this.$gettext('Show less') : this.$gettext('Show more')
    },
    hasMore() {
      return this.items.length > this.showMoreToggleCount
    },
    resourceItems() {
      if (!this.showMoreToggle || this.showMore) {
        return this.items
      }
      return this.items.slice(0, this.showMoreToggleCount)
    }
  },
  methods: {
    toggleShowMore() {
      this.showMore = !this.showMore
    }
  }
})
</script>
