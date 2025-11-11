<template>
  <oc-table
    v-bind="$attrs"
    id="files-space-table"
    :class="[
      {
        condensed: viewMode === FolderViewModeConstants.name.condensedTable,
        'files-table': resourceType === 'file',
        'files-table-squashed': resourceType === 'file' && isSideBarOpen,

        'spaces-table': resourceType === 'space',
        'spaces-table-squashed': resourceType === 'space' && isSideBarOpen
      }
    ]"
    :data="resources"
    :fields="fields"
    :highlighted="selectedIds"
    :disabled="disabledResources"
    :sticky="isSticky"
    :header-position="headerPosition"
    :drag-drop="dragDrop"
    :hover="hover"
    :item-dom-selector="resourceDomSelector"
    :selection="selectedResources"
    :sort-by="sortBy"
    :sort-dir="sortDir"
    :lazy="lazy"
    :grouping-settings="groupingSettings"
    padding-x="medium"
    @highlight="fileClicked"
    @row-mounted="rowMounted"
    @contextmenu-clicked="showContextMenu"
    @item-dropped="fileDropped"
    @item-dragged="fileDragged"
    @drop-row-styling="dropRowStyling"
    @sort="sort"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template v-if="!isLocationPicker && !isFilePicker" #selectHeader>
      <div class="resource-table-select-all flex justify-center items-center">
        <oc-checkbox
          id="resource-table-select-all"
          v-oc-tooltip="{ content: selectAllCheckboxLabel, placement: 'bottom' }"
          size="large"
          :label="selectAllCheckboxLabel"
          :disabled="resources.length === disabledResources.length"
          :label-hidden="true"
          :model-value="areAllResourcesSelected"
          @click.stop="toggleSelectionAll"
        />
      </div>
    </template>
    <template v-if="!isLocationPicker && !isFilePicker" #select="{ item }">
      <oc-spinner
        v-if="isResourceInDeleteQueue(item.id)"
        class="inline-flex ml-1"
        size="medium"
        :aria-label="$gettext('File is being processed')"
      />

      <oc-checkbox
        v-else
        :id="`resource-table-select-${resourceDomSelector(item)}`"
        :label="getResourceCheckboxLabel(item)"
        :label-hidden="true"
        size="large"
        :disabled="isResourceDisabled(item)"
        :model-value="isResourceSelected(item)"
        :outline="isLatestSelectedItem(item)"
        :data-test-selection-resource-name="item.name"
        :data-test-selection-resource-path="item.path"
        @click.stop="
          (e: MouseEvent) => {
            if (!interceptModifierClick(e, item)) {
              toggleSelection(item.id)
            }
          }
        "
      />
    </template>
    <template #name="{ item }">
      <div
        class="resource-table-resource-wrapper flex items-center"
        :class="[{ 'resource-table-resource-wrapper-limit-max-width': hasRenameAction(item) }]"
      >
        <slot name="image" :resource="item" />
        <resource-list-item
          :key="`${item.path}-${resourceDomSelector(item)}-${item.thumbnail}`"
          :resource="item"
          :path-prefix="getPathPrefix(item)"
          :is-path-displayed="arePathsDisplayed"
          :parent-folder-name="getParentFolderName(item)"
          :is-icon-displayed="!$slots['image']"
          :is-extension-displayed="areFileExtensionsShown"
          :is-resource-clickable="isResourceClickable(item)"
          :link="getResourceLink(item)"
          :parent-folder-link="getParentFolderLink(item)"
          :parent-folder-link-icon-additional-attributes="
            getParentFolderLinkIconAdditionalAttributes(item)
          "
          :class="{ 'opacity-70': isResourceCut(item) }"
          @click="emitFileClick(item)"
        />
        <oc-button
          v-if="hasRenameAction(item)"
          class="resource-table-edit-name inline-flex raw-hover-surface p-1 ml-1"
          appearance="raw"
          :aria-label="$gettext('Rename file »%{name}«', { name: item.name })"
          :title="$gettext('Rename')"
          @click.stop="
            (e: MouseEvent) => {
              if (interceptModifierClick(e, item)) {
                return
              }
              openRenameDialog(item)
            }
          "
        >
          <oc-icon name="edit-2" fill-type="line" size="small" color="var(--oc-role-on-surface)" />
        </oc-button>
      </div>
      <slot name="additionalResourceContent" :resource="item" />
    </template>
    <template #syncEnabled="{ item }">
      <!-- @slot syncEnabled column -->
      <slot name="syncEnabled" :resource="item" />
    </template>
    <template #size="{ item }">
      <resource-size :size="item.size || Number.NaN" />
    </template>
    <template #tags="{ item }">
      <component
        :is="userContextReady ? 'router-link' : 'span'"
        v-for="tag in item.tags.slice(0, 2)"
        :key="tag"
        v-bind="getTagComponentAttrs(tag)"
        class="resource-table-tag-wrapper"
      >
        <oc-tag
          v-oc-tooltip="getTagToolTip(tag)"
          class="resource-table-tag ml-1 max-w-20"
          :rounded="true"
          size="small"
        >
          <oc-icon name="price-tag-3" size="small" />
          <span class="truncate">{{ tag }}</span>
        </oc-tag>
      </component>
      <oc-tag
        v-if="item.tags.length > 2"
        size="small"
        class="resource-table-tag-more align-text-bottom cursor-pointer"
        @click="openTagsSidebar()"
      >
        + {{ item.tags.length - 2 }}
      </oc-tag>
    </template>
    <template #manager="{ item }">
      <slot name="manager" :resource="item" />
    </template>
    <template #members="{ item }">
      <slot name="members" :resource="item" />
    </template>
    <template #totalQuota="{ item }">
      <slot name="totalQuota" :resource="item" />
    </template>
    <template #usedQuota="{ item }">
      <slot name="usedQuota" :resource="item" />
    </template>
    <template #remainingQuota="{ item }">
      <slot name="remainingQuota" :resource="item" />
    </template>
    <template #mdate="{ item }">
      <span
        v-oc-tooltip="formatDate(item.mdate)"
        tabindex="0"
        v-text="formatDateRelative(item.mdate)"
      />
    </template>
    <template #indicators="{ item }">
      <resource-status-indicators
        :space="space"
        :resource="item"
        :disable-handler="isResourceDisabled(item)"
      />
    </template>
    <template #sdate="{ item }">
      <span
        v-oc-tooltip="formatDate(item.sdate)"
        tabindex="0"
        v-text="formatDateRelative(item.sdate)"
      />
    </template>
    <template #ddate="{ item }">
      <p
        v-oc-tooltip="formatDate(item.ddate)"
        tabindex="0"
        class="m-0"
        v-text="formatDateRelative(item.ddate)"
      />
    </template>
    <template #sharedBy="{ item }">
      <oc-avatars
        class="flex items-center justify-end flex-row flex-nowrap"
        :is-tooltip-displayed="true"
        :items="getSharedByAvatarItems(item)"
        :accessible-description="getSharedByAvatarDescription(item)"
        hover-effect
      >
        <template #userAvatars="{ avatars, width }">
          <user-avatar
            v-for="avatar in avatars"
            :key="avatar.userId"
            :user-id="avatar.userId"
            :user-name="avatar.displayName"
            :width="width"
          />
        </template>
      </oc-avatars>
    </template>
    <template #sharedWith="{ item }">
      <oc-avatars
        class="flex items-center justify-end flex-row flex-nowrap"
        data-testid="resource-table-shared-with"
        :items="getSharedWithAvatarItems(item)"
        :stacked="true"
        :max-displayed="3"
        :is-tooltip-displayed="true"
        :accessible-description="getSharedWithAvatarDescription(item)"
        hover-effect
      >
        <template #userAvatars="{ avatars, width }">
          <user-avatar
            v-for="avatar in avatars"
            :key="avatar.userId"
            :user-id="avatar.userId"
            :user-name="avatar.displayName"
            :width="width"
          />
        </template>
      </oc-avatars>
    </template>
    <template #actions="{ item }">
      <div v-if="showContextDrop(item)" class="flex items-center justify-end flex-row flex-nowrap">
        <!-- @slot Add quick actions before the `context-menu / three dot` button in the actions column -->
        <slot name="quickActions" :resource="item" />
        <context-menu-quick-action
          ref="contextMenuButton"
          :title="item.name"
          :item="item"
          :resource-dom-selector="resourceDomSelector"
          class="resource-table-btn-action-dropdown"
          @quick-action-clicked="showContextMenuOnBtnClick($event, item)"
        >
          <template #contextMenu>
            <slot name="contextMenu" :resource="item" />
          </template>
        </context-menu-quick-action>
      </div>
    </template>
    <template v-if="$slots.footer" #footer>
      <!-- @slot Footer of the files table -->
      <slot name="footer" />
    </template>
  </oc-table>
  <Teleport v-if="dragItem" to="body">
    <resource-ghost-element ref="ghostElement" :preview-items="[dragItem, ...dragSelection]" />
  </Teleport>
</template>

<script lang="ts">
import {
  ComponentPublicInstance,
  computed,
  ComputedRef,
  defineComponent,
  PropType,
  ref,
  unref,
  useTemplateRef
} from 'vue'
import { useWindowSize } from '@vueuse/core'
import {
  extractDomSelector,
  IncomingShareResource,
  isProjectSpaceResource,
  isShareResource,
  Resource,
  ShareTypes,
  SpaceResource,
  TrashResource
} from '@opencloud-eu/web-client'

import {
  embedModeFilePickMessageData,
  FolderViewModeConstants,
  routeToContextQuery,
  SortDir,
  useActiveLocation,
  useAuthStore,
  useCanBeOpenedWithSecureView,
  useCapabilityStore,
  useClipboardStore,
  useConfigStore,
  useEmbedMode,
  useFileActions,
  useFolderLink,
  useGetMatchingSpace,
  useIsTopBarSticky,
  useResourcesStore,
  useRouter,
  useSpaceActionsRename
} from '../../composables'
import ResourceListItem from './ResourceListItem.vue'
import ResourceGhostElement from './ResourceGhostElement.vue'
import ResourceSize from './ResourceSize.vue'
import { EVENT_FILE_DROPPED, EVENT_TROW_MOUNTED, ImageDimension } from '../../constants'
import { eventBus } from '../../services'
import {
  ContextMenuBtnClickEventData,
  CreateTargetRouteOptions,
  displayPositionedDropdown,
  formatDateFromJSDate,
  formatRelativeDateFromJSDate
} from '../../helpers'
import { SideBarEventTopics } from '../../composables/sideBar'
import ContextMenuQuickAction from '../ContextActions/ContextMenuQuickAction.vue'
import { useInterceptModifierClick } from '../../composables/keyboardActions'

import { useResourceRouteResolver } from '../../composables/filesList/useResourceRouteResolver'
import { ClipboardActions } from '../../helpers/clipboardActions'
import { determineResourceTableSortFields } from '../../helpers/ui/resourceTable'
import { useFileActionsRename } from '../../composables/actions'
import { createLocationCommon, isLocationTrashActive } from '../../router'
import get from 'lodash-es/get'
import { storeToRefs } from 'pinia'
import { OcButton, OcSpinner, OcTable, OcTableTr } from '@opencloud-eu/design-system/components'
import { FieldType } from '@opencloud-eu/design-system/helpers'
import ResourceStatusIndicators from './ResourceStatusIndicators.vue'
import { useGettext } from 'vue3-gettext'
import { UserAvatar } from '../Avatars'
import { useIsMobile } from '@opencloud-eu/design-system/composables'

const TAGS_MINIMUM_SCREEN_WIDTH = 850

export default defineComponent({
  name: 'ResourceTable',
  components: {
    UserAvatar,
    ContextMenuQuickAction,
    ResourceGhostElement,
    ResourceListItem,
    ResourceSize,
    ResourceStatusIndicators,
    OcSpinner,
    OcTable
  },
  props: {
    /**
     * Resources to be displayed in the table.
     * Required fields:
     * - name: The name of the resource containing the file extension in case of a file
     * - path: The full path of the resource
     * - type: The type of the resource. Can be `file` or `folder`
     * Optional fields:
     * - thumbnail
     * - size: The size of the resource
     * - modificationDate: The date of the last modification of the resource
     * - shareDate: The date when the share was created
     * - deletionDate: The date when the resource has been deleted
     * - syncEnabled: The sync status of the share
     */
    resources: {
      type: Array as PropType<Resource[]>,
      required: true
    },
    /**
     * Closure function to mutate the resource id into a valid DOM selector.
     */
    resourceDomSelector: {
      type: Function as PropType<(resource: Resource) => string>,
      required: false,
      default: (resource: Resource) => extractDomSelector(resource.id)
    },
    /**
     * Asserts whether resources path should be shown in the resource name
     */
    arePathsDisplayed: {
      type: Boolean,
      required: false,
      default: false
    },
    /**
     * Asserts whether icons should be replaced with thumbnails for resources which provide them
     */
    areThumbnailsDisplayed: {
      type: Boolean,
      required: false,
      default: true
    },
    /**
     * V-model for the selection
     */
    selectedIds: {
      type: Array as PropType<string[]>,
      default: (): string[] => []
    },
    /**
     * Asserts whether actions are available
     */
    hasActions: {
      type: Boolean,
      required: false,
      default: true
    },
    /**
     * Asserts whether rename quick action is available
     */
    showRenameQuickAction: {
      type: Boolean,
      required: false,
      default: true
    },
    /**
     * Accepts a `path` and a `resource` param and returns a corresponding route object.
     */
    targetRouteCallback: {
      type: Function as PropType<(arg: CreateTargetRouteOptions) => unknown>,
      required: false,
      default: undefined
    },
    /**
     * Asserts whether clicking on the resource name triggers any action
     */
    areResourcesClickable: {
      type: Boolean,
      required: false,
      default: true
    },
    /**
     * Top position of header used when the header is sticky in pixels
     */
    headerPosition: {
      type: Number,
      required: false,
      default: 0
    },
    /**
     * Asserts whether resources in the table can be selected
     */
    isSelectable: {
      type: Boolean,
      required: false,
      default: true
    },
    /**
     * Sets specific css classes for when the side bar is (not) open
     */
    isSideBarOpen: {
      type: Boolean,
      required: false,
      default: false
    },
    /**
     * Sets the padding size for x axis
     * @values xsmall, small, medium, large, xlarge
     */
    paddingX: {
      type: String,
      required: false,
      default: 'small',
      validator: (size: string) => /(xsmall|small|medium|large|xlarge)/.test(size)
    },
    /**
     * Enable Drag & Drop events
     */
    dragDrop: {
      type: Boolean,
      required: false,
      default: false
    },
    /**
     * The active view mode.
     */
    viewMode: {
      type: String as PropType<
        | typeof FolderViewModeConstants.name.condensedTable
        | typeof FolderViewModeConstants.name.table
      >,
      default: () => FolderViewModeConstants.defaultModeName,
      validator: (
        value:
          | typeof FolderViewModeConstants.name.condensedTable
          | typeof FolderViewModeConstants.name.table
      ) =>
        [FolderViewModeConstants.name.condensedTable, FolderViewModeConstants.name.table].includes(
          value
        )
    },
    /**
     * Enable hover effect
     */
    hover: {
      type: Boolean,
      required: false,
      default: true
    },
    /**
     * Show that the table is sorted by this column (no actual sorting takes place)
     */
    sortBy: {
      type: String,
      required: false,
      default: undefined
    },
    /**
     * Define what fields should be displayed in the table
     * If null, all fields are displayed
     */
    fieldsDisplayed: {
      type: Array,
      required: false,
      default: null
    },
    /**
     * Show that the table is sorted ascendingly/descendingly (no actual sorting takes place)
     */
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
    /**
     * Space resource the provided resources originate from. Not required on meta pages like favorites, search, ...
     */
    space: {
      type: Object as PropType<SpaceResource>,
      required: false,
      default: null
    },
    resourceType: {
      type: String as PropType<'file' | 'space'>,
      default: 'file'
    },
    /**
     * Determines if the table content should be loaded lazily.
     */
    lazy: {
      type: Boolean,
      default: true
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
  emits: [
    'fileClick',
    'sort',
    'rowMounted',
    EVENT_FILE_DROPPED,
    'update:selectedIds',
    'update:modelValue'
  ],
  setup(props, context) {
    const router = useRouter()
    const capabilityStore = useCapabilityStore()
    const { getMatchingSpace } = useGetMatchingSpace()
    const { canBeOpenedWithSecureView } = useCanBeOpenedWithSecureView()
    const { interceptModifierClick } = useInterceptModifierClick()
    const folderLinkUtils = useFolderLink({
      space: ref(props.space),
      targetRouteCallback: computed(() => props.targetRouteCallback)
    })
    const { isSticky } = useIsTopBarSticky()
    const { $gettext } = useGettext()
    const { isMobile } = useIsMobile()
    const {
      isLocationPicker,
      isFilePicker,
      postMessage,
      isEnabled: isEmbedModeEnabled,
      fileTypes: embedModeFileTypes
    } = useEmbedMode()
    const { getDefaultAction } = useFileActions()
    const configStore = useConfigStore()
    const { options: configOptions } = storeToRefs(configStore)

    const clipboardStore = useClipboardStore()
    const { resources: clipboardResources, action: clipboardAction } = storeToRefs(clipboardStore)

    const authStore = useAuthStore()
    const { userContextReady } = storeToRefs(authStore)

    const resourcesStore = useResourcesStore()
    const { areFileExtensionsShown, latestSelectedId, deleteQueue } = storeToRefs(resourcesStore)

    const dragItem = ref<Resource>()
    const ghostElement =
      useTemplateRef<ComponentPublicInstance<typeof ResourceGhostElement>>('ghostElement')
    const contextMenuButton =
      useTemplateRef<ComponentPublicInstance<typeof OcButton>>('contextMenuButton')

    const { width } = useWindowSize()
    const hasTags = computed(
      () => capabilityStore.filesTags && width.value >= TAGS_MINIMUM_SCREEN_WIDTH
    )

    const isTrashOverviewRoute = useActiveLocation(isLocationTrashActive, 'files-trash-overview')

    const { actions: renameActions } = useFileActionsRename()
    const { actions: renameActionsSpace } = useSpaceActionsRename()
    const renameHandler = computed(() => unref(renameActions)[0].handler)
    const renameHandlerSpace = computed(() => unref(renameActionsSpace)[0].handler)

    const getTagToolTip = (tag: string) => $gettext(`Search for tag %{tag}`, { tag })

    const isResourceDisabled = (resource: Resource) => {
      if (unref(isEmbedModeEnabled) && unref(embedModeFileTypes)?.length) {
        return (
          !unref(embedModeFileTypes).includes(resource.extension) &&
          !unref(embedModeFileTypes).includes(resource.mimeType) &&
          !resource.isFolder
        )
      }
      return resource.processing === true || isResourceInDeleteQueue(resource.id)
    }

    const disabledResources: ComputedRef<Array<Resource['id']>> = computed(() => {
      return (
        props.resources
          ?.filter((resource) => isResourceDisabled(resource) === true)
          ?.map((resource) => resource.id) || []
      )
    })

    const isResourceClickable = (resource: Resource) => {
      if (!props.areResourcesClickable) {
        return false
      }

      if (isProjectSpaceResource(resource) && resource.disabled) {
        return false
      }

      if (!resource.isFolder) {
        if (!resource.canDownload() && !canBeOpenedWithSecureView(resource)) {
          return false
        }

        if (unref(isEmbedModeEnabled) && !unref(isFilePicker)) {
          return false
        }
      }

      return !unref(disabledResources).includes(resource.id)
    }

    const emitSelect = (selectedIds: string[]) => {
      eventBus.publish('app.files.list.clicked')
      context.emit('update:selectedIds', selectedIds)
    }

    const toggleSelection = (resourceId: string) => {
      resourcesStore.toggleSelection(resourceId)
      emitSelect([...resourcesStore.selectedIds])
    }

    const getResourceLink = (resource: Resource) => {
      if (resource.isFolder) {
        return folderLinkUtils.getFolderLink(resource)
      }

      let space = props.space
      if (!space) {
        space = getMatchingSpace(resource)
      }

      const action = getDefaultAction({ resources: [resource], space })

      if (!action?.route) {
        return
      }

      return action.route({ space, resources: [resource] })
    }

    const isResourceInDeleteQueue = (id: string): boolean => {
      return unref(deleteQueue).includes(id)
    }

    const showContextDrop = (item: Resource | SpaceResource) => {
      if (unref(isTrashOverviewRoute) && isProjectSpaceResource(item) && item.disabled) {
        return false
      }

      return !isResourceDisabled(item)
    }

    return {
      router,
      configOptions,
      dragItem,
      ghostElement,
      contextMenuButton,
      getTagToolTip,
      renameActions,
      renameActionsSpace,
      renameHandler,
      renameHandlerSpace,
      FolderViewModeConstants,
      hasTags,
      disabledResources,
      isResourceDisabled,
      userContextReady,
      getMatchingSpace,
      clipboardResources,
      clipboardAction,
      ...useResourceRouteResolver(
        {
          space: ref(props.space),
          targetRouteCallback: computed(() => props.targetRouteCallback)
        },
        context
      ),
      ...folderLinkUtils,
      postMessage,
      isFilePicker,
      isLocationPicker,
      isEmbedModeEnabled,
      emitSelect,
      toggleSelection,
      eventBus,
      interceptModifierClick,
      areFileExtensionsShown,
      latestSelectedId,
      isResourceClickable,
      getResourceLink,
      isSticky,
      isResourceInDeleteQueue,
      ShareTypes,
      showContextDrop,
      isMobile
    }
  },
  data() {
    return {
      constants: {
        ImageDimension,
        EVENT_TROW_MOUNTED
      }
    }
  },
  computed: {
    fields() {
      if (this.resources.length === 0) {
        return []
      }
      const firstResource = this.resources[0]
      const fields: FieldType[] = []
      if (this.isSelectable) {
        fields.push({
          name: 'select',
          title: '',
          type: 'slot',
          headerType: 'slot',
          width: 'shrink'
        })
      }

      const sortFields = determineResourceTableSortFields(firstResource)
      fields.push(
        ...(
          [
            {
              name: 'name',
              title: this.$gettext('Name'),
              type: 'slot',
              width: 'expand',
              wrap: 'truncate'
            },

            {
              name: 'manager',
              prop: 'members',
              title: this.$gettext('Manager'),
              type: 'slot'
            },
            {
              name: 'members',
              title: this.$gettext('Members'),
              prop: 'members',
              type: 'slot'
            },
            {
              name: 'totalQuota',
              prop: 'spaceQuota.total',
              title: this.$gettext('Total quota'),
              type: 'slot',
              sortable: true
            },
            {
              name: 'usedQuota',
              prop: 'spaceQuota.used',
              title: this.$gettext('Used quota'),
              type: 'slot',
              sortable: true
            },
            {
              name: 'remainingQuota',
              prop: 'spaceQuota.remaining',
              title: this.$gettext('Remaining quota'),
              type: 'slot',
              sortable: true
            },
            {
              name: 'indicators',
              title: this.$gettext('Status'),
              type: 'slot',
              alignH: 'right',
              wrap: 'nowrap',
              width: 'shrink'
            },
            {
              name: 'size',
              title: this.$gettext('Size'),
              type: 'slot',
              alignH: 'right',
              wrap: 'nowrap',
              width: 'shrink'
            },
            {
              name: 'syncEnabled',
              title: this.$gettext('Info'),
              type: 'slot',
              alignH: 'right',
              wrap: 'nowrap',
              width: 'shrink'
            },
            {
              name: 'tags',
              title: this.$gettext('Tags'),
              type: 'slot',
              alignH: 'right',
              wrap: 'nowrap',
              width: 'shrink'
            },
            {
              name: 'sharedBy',
              title: this.$gettext('Shared by'),
              type: 'slot',
              alignH: 'right',
              wrap: 'nowrap',
              width: 'shrink'
            },
            {
              name: 'sharedWith',
              title: this.$gettext('Shared with'),
              type: 'slot',
              alignH: 'right',
              wrap: 'nowrap',
              width: 'shrink'
            },
            {
              name: 'mdate',
              title: this.$gettext('Modified'),
              type: 'slot',
              alignH: 'right',
              wrap: 'nowrap',
              width: 'shrink',
              accessibleLabelCallback: (item) =>
                this.formatDateRelative((item as Resource).mdate) +
                ' (' +
                this.formatDate((item as Resource).mdate) +
                ')'
            },
            {
              name: 'sdate',
              title: this.$gettext('Shared on'),
              type: 'slot',
              alignH: 'right',
              wrap: 'nowrap',
              width: 'shrink',
              accessibleLabelCallback: (item) =>
                this.formatDateRelative((item as IncomingShareResource).sdate) +
                ' (' +
                this.formatDate((item as IncomingShareResource).sdate) +
                ')'
            },
            {
              name: 'ddate',
              title: this.$gettext('Deleted'),
              type: 'slot',
              alignH: 'right',
              wrap: 'nowrap',
              width: 'shrink',
              accessibleLabelCallback: (item) =>
                this.formatDateRelative((item as TrashResource).ddate) +
                ' (' +
                this.formatDate((item as TrashResource).ddate) +
                ')'
            }
          ] as FieldType[]
        )
          .filter((field) => {
            if (field.name === 'tags' && !this.hasTags) {
              return false
            }

            if (field.name === 'indicators') {
              return true
            }

            let hasField: boolean
            if (field.prop) {
              hasField = get(firstResource, field.prop) !== undefined
            } else {
              hasField = Object.prototype.hasOwnProperty.call(firstResource, field.name)
            }
            if (!this.fieldsDisplayed) {
              return hasField
            }

            return hasField && this.fieldsDisplayed.includes(field.name)
          })
          .map((field) => {
            const sortField = sortFields.find((f) => f.name === field.name)
            if (sortField) {
              Object.assign(field, {
                sortable: sortField.sortable,
                sortDir: sortField.sortDir
              })
            }
            return field
          })
      )
      if (this.hasActions) {
        fields.push({
          name: 'actions',
          title: this.$gettext('Actions'),
          type: 'slot',
          alignH: 'right',
          wrap: 'nowrap',
          width: 'shrink'
        })
      }

      return fields
    },
    areAllResourcesSelected() {
      const allResourcesDisabled = this.disabledResources.length === this.resources.length
      const allSelected =
        this.selectedResources.length === this.resources.length - this.disabledResources.length

      return !allResourcesDisabled && allSelected
    },
    selectAllCheckboxLabel() {
      return this.areAllResourcesSelected
        ? this.$gettext('Clear selection')
        : this.$gettext('Select all')
    },
    selectedResources() {
      return this.resources.filter((resource) => this.selectedIds.includes(resource.id))
    },
    contextMenuLabel() {
      return this.$gettext('Show context menu')
    },
    dragSelection() {
      const selection = [...this.selectedResources]
      selection.splice(
        selection.findIndex((i) => i.id === this.dragItem.id),
        1
      )
      return selection
    }
  },
  methods: {
    isResourceSelected(item: Resource) {
      return this.selectedIds.includes(item.id)
    },
    isResourceCut(resource: Resource) {
      if (this.clipboardAction !== ClipboardActions.Cut) {
        return false
      }
      return this.clipboardResources.some((r) => r.id === resource.id)
    },
    getTagLink(tag: string) {
      const currentTerm = unref(this.router.currentRoute).query?.term
      return createLocationCommon('files-common-search', {
        query: { provider: 'files.sdk', q_tags: tag, ...(currentTerm && { term: currentTerm }) }
      })
    },
    getTagComponentAttrs(tag: string) {
      if (!this.userContextReady) {
        return {}
      }

      return {
        to: this.getTagLink(tag)
      }
    },
    isLatestSelectedItem(item: Resource) {
      return item.id === this.latestSelectedId
    },
    hasRenameAction(item: Resource) {
      if (!this.showRenameQuickAction) {
        return false
      }

      if (isProjectSpaceResource(item)) {
        return this.renameActionsSpace.filter((menuItem) =>
          menuItem.isVisible({ resources: [item] })
        ).length
      }

      return this.renameActions.filter((menuItem) =>
        menuItem.isVisible({ space: this.space, resources: [item] })
      ).length
    },
    openRenameDialog(item: Resource) {
      if (isProjectSpaceResource(item)) {
        return this.renameHandlerSpace({
          resources: [item]
        })
      }
      this.renameHandler({
        space: this.getMatchingSpace(item),
        resources: [item]
      })
    },
    openTagsSidebar() {
      eventBus.publish(SideBarEventTopics.open)
    },
    handleFileClick(e: MouseEvent, resource: Resource) {
      if (this.interceptModifierClick(e, resource)) {
        return
      }
      this.$emit('fileClick', { space: this.getMatchingSpace(resource), resources: [resource] })
    },
    async fileDragged(file: Resource, event: DragEvent) {
      if (!this.dragDrop) {
        return
      }

      await this.setDragItem(file, event)

      this.addSelectedResource(file)
    },
    fileDropped(selector: string, event: DragEvent) {
      if (!this.dragDrop) {
        return
      }
      const hasFilePayload = (event.dataTransfer.types || []).some((e) => e === 'Files')
      if (hasFilePayload) {
        return
      }
      this.dragItem = null
      const dropTarget = event.target as HTMLElement
      const dropTargetTr = dropTarget.closest('tr')
      const dropItemId = dropTargetTr.dataset.itemId
      this.dropRowStyling(selector, true, event)

      this.$emit(EVENT_FILE_DROPPED, dropItemId)
    },
    async setDragItem(item: Resource, event: DragEvent) {
      this.dragItem = item
      await this.$nextTick()
      this.ghostElement.$el.ariaHidden = 'true'
      this.ghostElement.$el.style.left = '-99999px'
      this.ghostElement.$el.style.top = '-99999px'
      event.dataTransfer.setDragImage(this.ghostElement.$el, 0, 0)
      event.dataTransfer.dropEffect = 'move'
      event.dataTransfer.effectAllowed = 'move'
    },
    dropRowStyling(selector: string, leaving: boolean, event: DragEvent) {
      const hasFilePayload = (event.dataTransfer?.types || []).some((e) => e === 'Files')
      if (hasFilePayload) {
        return
      }
      if ((event.currentTarget as HTMLElement)?.contains(event.relatedTarget as HTMLElement)) {
        return
      }

      const classList = document.getElementsByClassName(`oc-tbody-tr-${selector}`)[0].classList
      const className = 'highlightedDropTarget'
      leaving ? classList.remove(className) : classList.add(className)
    },
    sort(opts: { sortBy: string; sortDir: SortDir }) {
      this.$emit('sort', opts)
    },
    addSelectedResource(file: Resource) {
      const isSelected = this.isResourceSelected(file)
      if (isSelected) {
        return
      }
      this.toggleSelection(file.id)
    },
    showContextMenuOnBtnClick(data: ContextMenuBtnClickEventData, item: Resource) {
      const { dropdown, event } = data

      if (event instanceof MouseEvent && this.interceptModifierClick(event, item)) {
        return
      }

      if (this.isResourceDisabled(item)) {
        return false
      }

      if (dropdown?.tippy === undefined) {
        return
      }
      if (!this.isResourceSelected(item)) {
        this.emitSelect([item.id])
      }
      displayPositionedDropdown(dropdown.tippy, event, this.contextMenuButton)
    },
    showContextMenu(row: ComponentPublicInstance<unknown>, event: MouseEvent, item: Resource) {
      if (event instanceof MouseEvent && this.interceptModifierClick(event, item)) {
        return
      }
      event.preventDefault()
      if (this.isResourceDisabled(item)) {
        return false
      }

      const instance = row.$el.getElementsByClassName('resource-table-btn-action-dropdown')[0]
      if (instance === undefined) {
        return
      }
      if (!this.isResourceSelected(item)) {
        this.emitSelect([item.id])
      }

      if (this.isMobile) {
        // we can't use displayPositionedDropdown() on mobile because we need to open the bottom drawer.
        // this can be triggered by clicking the context menu button of the current row.
        const el = document.getElementById(`context-menu-trigger-${item.getDomSelector()}`)
        el?.click()
        return
      }

      displayPositionedDropdown(instance._tippy, event, this.contextMenuButton)
    },
    rowMounted(resource: Resource, component: typeof OcTableTr) {
      /**
       * Triggered whenever a row is mounted
       * @property {object} resource The resource which was mounted as table row
       * @property {object} component The table row component
       */
      this.$emit('rowMounted', resource, component, this.constants.ImageDimension.Thumbnail)
    },
    fileClicked(data: [Resource, MouseEvent]) {
      /**
       * Triggered when the file row is clicked
       * @property {object} resource The resource for which the event is triggered
       */
      const resource = data[0]

      if (this.isResourceDisabled(resource)) {
        return
      }

      if (this.isEmbedModeEnabled && this.isFilePicker && !resource.isFolder) {
        return this.postMessage<embedModeFilePickMessageData>('opencloud-embed:file-pick', {
          resource: JSON.parse(JSON.stringify(resource)),
          locationQuery: JSON.parse(
            JSON.stringify(routeToContextQuery(unref(this.router.currentRoute)))
          )
        })
      }

      const eventData = data[1]

      if (!eventData.shiftKey && !eventData.metaKey && !eventData.ctrlKey) {
        eventBus.publish('app.files.shiftAnchor.reset')
      }

      const isCheckboxClicked =
        (eventData?.target as HTMLElement).getAttribute('type') === 'checkbox'
      const contextActionClicked =
        (eventData?.target as HTMLElement)?.closest('div')?.id === 'oc-files-context-menu'
      if (contextActionClicked) {
        return
      }
      if (eventData && eventData.metaKey) {
        return eventBus.publish('app.files.list.clicked.meta', resource)
      }
      if (eventData && eventData.shiftKey) {
        return eventBus.publish('app.files.list.clicked.shift', {
          resource,
          skipTargetSelection: false
        })
      }
      if (isCheckboxClicked) {
        return
      }

      if (this.isResourceSelected(resource)) {
        return
      }

      return this.emitSelect([resource.id])
    },
    formatDate(date: string) {
      return formatDateFromJSDate(new Date(date), this.$language.current)
    },
    formatDateRelative(date: string) {
      return formatRelativeDateFromJSDate(new Date(date), this.$language.current)
    },
    toggleSelectionAll() {
      if (this.areAllResourcesSelected) {
        return this.emitSelect([])
      }
      this.emitSelect(
        this.resources
          .filter((resource) => !this.disabledResources.includes(resource.id))
          .map((resource) => resource.id)
      )
    },
    emitFileClick(resource: Resource, event?: MouseEvent) {
      if (this.interceptModifierClick(event, resource)) {
        return
      }
      const space = this.getMatchingSpace(resource)
      /**
       * Triggered when a default action is triggered on a file
       * @property {object} resource resource for which the event is triggered
       */
      this.$emit('fileClick', { space, resources: [resource] })
    },
    getResourceCheckboxLabel(resource: Resource) {
      if (resource.type === 'folder') {
        return this.$gettext('Select folder')
      }
      return this.$gettext('Select file')
    },
    getSharedWithAvatarDescription(resource: Resource) {
      if (!isShareResource(resource)) {
        return
      }
      const resourceType =
        resource.type === 'folder' ? this.$gettext('folder') : this.$gettext('file')

      const shareCount = resource.sharedWith.filter(({ shareType }) =>
        ShareTypes.authenticated.includes(ShareTypes.getByValue(shareType))
      ).length

      if (!shareCount) {
        return ''
      }

      return this.$ngettext(
        'This %{ resourceType } is shared via %{ shareCount } invite',
        'This %{ resourceType } is shared via %{ shareCount } invites',
        shareCount,
        {
          resourceType,
          shareCount: shareCount.toString()
        }
      )
    },
    getSharedByAvatarDescription(resource: Resource) {
      if (!isShareResource(resource)) {
        return ''
      }

      const resourceType =
        resource.type === 'folder' ? this.$gettext('folder') : this.$gettext('file')
      return this.$gettext('This %{ resourceType } is shared by %{ user }', {
        resourceType,
        user: resource.sharedBy.map(({ displayName }) => displayName).join(', ')
      })
    },
    getSharedByAvatarItems(resource: Resource) {
      if (!isShareResource(resource)) {
        return []
      }

      return resource.sharedBy.map((s) => ({
        displayName: s.displayName,
        name: s.displayName,
        avatarType: ShareTypes.user.key,
        username: s.id,
        userId: s.id
      }))
    },
    getSharedWithAvatarItems(resource: Resource) {
      if (!isShareResource(resource)) {
        return []
      }

      return resource.sharedWith
        .filter(({ shareType }) =>
          ShareTypes.authenticated.includes(ShareTypes.getByValue(shareType))
        )
        .map((s) => ({
          displayName: s.displayName,
          name: s.displayName,
          avatarType: ShareTypes.getByValue(s.shareType).key,
          username: s.id,
          userId: s.id
        }))
    }
  }
})
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer utilities {
  /* ---------------- SPACES TABLE ---------------- */
  /* Mdate, Manager, RemainingQuota, Members, Status: visible from lg */
  .spaces-table .oc-table-header-cell-mdate,
  .spaces-table .oc-table-data-cell-mdate {
    @apply hidden md:table-cell;
  }

  /* Manager, RemainingQuota, Members, Status: visible from lg */
  .spaces-table .oc-table-header-cell-manager,
  .spaces-table .oc-table-data-cell-manager,
  .spaces-table .oc-table-header-cell-remainingQuota,
  .spaces-table .oc-table-data-cell-remainingQuota,
  .spaces-table .oc-table-header-cell-members,
  .spaces-table .oc-table-data-cell-members,
  .spaces-table .oc-table-header-cell-status,
  .spaces-table .oc-table-data-cell-status {
    @apply hidden lg:table-cell;
  }

  /* TotalQuota, UsedQuota: visible from xl */
  .spaces-table .oc-table-header-cell-totalQuota,
  .spaces-table .oc-table-data-cell-totalQuota,
  .spaces-table .oc-table-header-cell-usedQuota,
  .spaces-table .oc-table-data-cell-usedQuota {
    @apply hidden xl:table-cell;
  }

  /* Squashed variant */
  .spaces-table-squashed .oc-table-header-cell-status,
  .spaces-table-squashed .oc-table-data-cell-status,
  .spaces-table-squashed .oc-table-header-cell-manager,
  .spaces-table-squashed .oc-table-data-cell-manager,
  .spaces-table-squashed .oc-table-header-cell-totalQuota,
  .spaces-table-squashed .oc-table-data-cell-totalQuota,
  .spaces-table-squashed .oc-table-header-cell-usedQuota,
  .spaces-table-squashed .oc-table-data-cell-usedQuota,
  .spaces-table-squashed .oc-table-header-cell-members,
  .spaces-table-squashed .oc-table-data-cell-members {
    @apply hidden lg:table-cell;
  }

  .spaces-table-squashed .oc-table-header-cell-mdate,
  .spaces-table-squashed .oc-table-data-cell-mdate,
  .spaces-table-squashed .oc-table-header-cell-remainingQuota,
  .spaces-table-squashed .oc-table-data-cell-remainingQuota {
    @apply hidden xl:table-cell;
  }

  /* ---------------- FILES TABLE ---------------- */
  /* Size, SharedWith, SharedBy, Status: visible from sm */
  .files-table .oc-table-header-cell-size,
  .files-table .oc-table-data-cell-size,
  .files-table .oc-table-header-cell-sharedWith,
  .files-table .oc-table-data-cell-sharedWith,
  .files-table .oc-table-header-cell-sharedBy,
  .files-table .oc-table-data-cell-sharedBy,
  .files-table .oc-table-header-cell-status,
  .files-table .oc-table-data-cell-status {
    @apply hidden sm:table-cell;
  }

  /* Mdate, Sdate, Ddate: visible from md */
  .files-table .oc-table-header-cell-mdate,
  .files-table .oc-table-data-cell-mdate,
  .files-table .oc-table-header-cell-sdate,
  .files-table .oc-table-data-cell-sdate,
  .files-table .oc-table-header-cell-ddate,
  .files-table .oc-table-data-cell-ddate {
    @apply hidden md:table-cell;
  }

  /* Tags, Indicators: visible from lg */
  .files-table .oc-table-header-cell-tags,
  .files-table .oc-table-data-cell-tags,
  .files-table .oc-table-header-cell-indicators,
  .files-table .oc-table-data-cell-indicators {
    @apply hidden lg:table-cell;
  }

  /* SharedBy: visible from xl */
  .files-table .oc-table-header-cell-sharedBy,
  .files-table .oc-table-data-cell-sharedBy,
  .files-table .oc-table-header-cell-tags,
  .files-table .oc-table-data-cell-tags,
  .files-table .oc-table-header-cell-indicators,
  .files-table .oc-table-data-cell-indicators {
    @apply hidden lg:table-cell;
  }

  /* Squashed variant */
  .files-table-squashed .oc-table-header-cell-size,
  .files-table-squashed .oc-table-data-cell-size,
  .files-table-squashed .oc-table-header-cell-sharedWith,
  .files-table-squashed .oc-table-data-cell-sharedWith,
  .files-table-squashed .oc-table-header-cell-sharedBy,
  .files-table-squashed .oc-table-data-cell-sharedBy,
  .files-table-squashed .oc-table-header-cell-status,
  .files-table-squashed .oc-table-data-cell-status {
    @apply hidden md:table-cell;
  }

  .files-table-squashed .oc-table-header-cell-mdate,
  .files-table-squashed .oc-table-data-cell-mdate,
  .files-table-squashed .oc-table-header-cell-sdate,
  .files-table-squashed .oc-table-data-cell-sdate,
  .files-table-squashed .oc-table-header-cell-ddate,
  .files-table-squashed .oc-table-data-cell-ddate {
    @apply hidden lg:table-cell;
  }

  .files-table-squashed .oc-table-header-cell-sharedBy,
  .files-table-squashed .oc-table-data-cell-sharedBy,
  .files-table-squashed .oc-table-header-cell-tags,
  .files-table-squashed .oc-table-data-cell-tags,
  .files-table-squashed .oc-table-header-cell-indicators,
  .files-table-squashed .oc-table-data-cell-indicators {
    @apply hidden xl:table-cell;
  }

  /* ---------------- SHARED WITH ME VIEW ---------------- */
  /* Show SharedBy, SyncEnabled from sm */
  #files-shared-with-me-view .files-table .oc-table-header-cell-sharedBy,
  #files-shared-with-me-view .files-table .oc-table-data-cell-sharedBy,
  #files-shared-with-me-view .files-table .oc-table-header-cell-syncEnabled,
  #files-shared-with-me-view .files-table .oc-table-data-cell-syncEnabled {
    @apply sm:table-cell;
  }

  /* Hide SharedWith, SyncEnabled below xl */
  #files-shared-with-me-view .files-table .oc-table-header-cell-sharedWith,
  #files-shared-with-me-view .files-table .oc-table-data-cell-sharedWith,
  #files-shared-with-me-view .files-table .oc-table-header-cell-syncEnabled,
  #files-shared-with-me-view .files-table .oc-table-data-cell-syncEnabled {
    @apply hidden lg:table-cell;
  }

  .resource-table-resource-wrapper-limit-max-width {
    max-width: calc(100% - 4 * var(--spacing));
  }
  .oc-table.condensed > tbody > tr {
    @apply h-8;
  }
}
</style>
