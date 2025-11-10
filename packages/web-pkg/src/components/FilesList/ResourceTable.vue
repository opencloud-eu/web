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
      <slot name="footer" />
    </template>
  </oc-table>
  <Teleport v-if="dragItem" to="body">
    <resource-ghost-element ref="ghostElement" :preview-items="[dragItem, ...dragSelection]" />
  </Teleport>
</template>

<script setup lang="ts">
import { ComponentPublicInstance, computed, nextTick, ref, unref, useTemplateRef } from 'vue'
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
import { ImageDimension } from '../../constants'
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
import { ClipboardActions } from '../../helpers/clipboardActions'
import { determineResourceTableSortFields } from '../../helpers/ui/resourceTable'
import { FileActionOptions, useFileActionsRename } from '../../composables/actions'
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

const {
  resources,
  resourceDomSelector = (resource: Resource) => extractDomSelector(resource.id),
  arePathsDisplayed = false,
  selectedIds = [],
  hasActions = true,
  showRenameQuickAction = true,
  targetRouteCallback = undefined,
  areResourcesClickable = true,
  headerPosition = 0,
  isSelectable = true,
  isSideBarOpen = false,
  dragDrop = false,
  viewMode = FolderViewModeConstants.defaultModeName,
  hover = true,
  sortBy = undefined,
  fieldsDisplayed = undefined,
  sortDir = undefined,
  space = undefined,
  resourceType = 'file',
  lazy = true,
  groupingSettings = undefined
} = defineProps<{
  resources: Resource[]
  resourceDomSelector?: (resource: Resource) => string
  arePathsDisplayed?: boolean
  selectedIds?: string[]
  hasActions?: boolean
  showRenameQuickAction?: boolean
  targetRouteCallback?: (arg: CreateTargetRouteOptions) => unknown
  areResourcesClickable?: boolean
  headerPosition?: number
  isSelectable?: boolean
  isSideBarOpen?: boolean
  dragDrop?: boolean
  viewMode?:
    | typeof FolderViewModeConstants.name.condensedTable
    | typeof FolderViewModeConstants.name.table
  hover?: boolean
  sortBy?: string
  fieldsDisplayed?: string[]
  sortDir?: SortDir
  space?: SpaceResource
  resourceType?: 'file' | 'space'
  lazy?: boolean
  groupingSettings?: Record<string, unknown>
}>()

const emit = defineEmits<{
  (e: 'fileClick', options: FileActionOptions): void
  (e: 'sort', options: { sortBy: string; sortDir: SortDir }): void
  (
    e: 'rowMounted',
    item: Resource,
    rowElement: ComponentPublicInstance<typeof OcTableTr>,
    dimension: ImageDimension
  ): void
  (e: 'fileDropped', id: string): void
  (e: 'update:selectedIds', selectedIds: string[]): void
  (e: 'update:modelValue', value: Resource[]): void
}>()

defineSlots<{
  image?: (props: { resource: Resource }) => unknown
  additionalResourceContent?: (props: { resource: Resource }) => unknown
  syncEnabled?: (props: { resource: Resource }) => unknown
  manager?: (props: { resource: Resource }) => unknown
  members?: (props: { resource: Resource }) => unknown
  totalQuota?: (props: { resource: Resource }) => unknown
  usedQuota?: (props: { resource: Resource }) => unknown
  remainingQuota?: (props: { resource: Resource }) => unknown
  quickActions?: (props: { resource: Resource }) => unknown
  contextMenu?: (props: { resource: Resource }) => unknown
  footer?: () => unknown
}>()

const router = useRouter()
const capabilityStore = useCapabilityStore()
const { getMatchingSpace } = useGetMatchingSpace()
const { canBeOpenedWithSecureView } = useCanBeOpenedWithSecureView()
const { interceptModifierClick } = useInterceptModifierClick()
const {
  getParentFolderLink,
  getParentFolderLinkIconAdditionalAttributes,
  getParentFolderName,
  getPathPrefix,
  getFolderLink
} = useFolderLink({
  space: ref(space),
  targetRouteCallback: computed(() => targetRouteCallback)
})
const { isSticky } = useIsTopBarSticky()
const { $gettext, $ngettext, current: currentLanguage } = useGettext()
const { isMobile } = useIsMobile()
const {
  isLocationPicker,
  isFilePicker,
  postMessage,
  isEnabled: isEmbedModeEnabled,
  fileTypes: embedModeFileTypes
} = useEmbedMode()
const { getDefaultAction } = useFileActions()

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

const disabledResources = computed(() => {
  return resources?.filter(isResourceDisabled)?.map((resource) => resource.id) || []
})

const isResourceClickable = (resource: Resource) => {
  if (!areResourcesClickable) {
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
  emit('update:selectedIds', selectedIds)
}

const toggleSelection = (resourceId: string) => {
  resourcesStore.toggleSelection(resourceId)
  emitSelect([...resourcesStore.selectedIds])
}

const getResourceLink = (resource: Resource) => {
  if (resource.isFolder) {
    return getFolderLink(resource)
  }

  let matchingSpace = space
  if (!matchingSpace) {
    matchingSpace = getMatchingSpace(resource)
  }

  const action = getDefaultAction({ resources: [resource], space: matchingSpace })

  if (!action?.route) {
    return
  }

  return action.route({ space: matchingSpace, resources: [resource] })
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

const fields = computed(() => {
  if (resources.length === 0) {
    return []
  }
  const firstResource = resources[0]
  const fields: FieldType[] = []
  if (isSelectable) {
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
          title: $gettext('Name'),
          type: 'slot',
          width: 'expand',
          wrap: 'truncate'
        },

        {
          name: 'manager',
          prop: 'members',
          title: $gettext('Manager'),
          type: 'slot'
        },
        {
          name: 'members',
          title: $gettext('Members'),
          prop: 'members',
          type: 'slot'
        },
        {
          name: 'totalQuota',
          prop: 'spaceQuota.total',
          title: $gettext('Total quota'),
          type: 'slot',
          sortable: true
        },
        {
          name: 'usedQuota',
          prop: 'spaceQuota.used',
          title: $gettext('Used quota'),
          type: 'slot',
          sortable: true
        },
        {
          name: 'remainingQuota',
          prop: 'spaceQuota.remaining',
          title: $gettext('Remaining quota'),
          type: 'slot',
          sortable: true
        },
        {
          name: 'indicators',
          title: $gettext('Status'),
          type: 'slot',
          alignH: 'right',
          wrap: 'nowrap',
          width: 'shrink'
        },
        {
          name: 'size',
          title: $gettext('Size'),
          type: 'slot',
          alignH: 'right',
          wrap: 'nowrap',
          width: 'shrink'
        },
        {
          name: 'syncEnabled',
          title: $gettext('Info'),
          type: 'slot',
          alignH: 'right',
          wrap: 'nowrap',
          width: 'shrink'
        },
        {
          name: 'tags',
          title: $gettext('Tags'),
          type: 'slot',
          alignH: 'right',
          wrap: 'nowrap',
          width: 'shrink'
        },
        {
          name: 'sharedBy',
          title: $gettext('Shared by'),
          type: 'slot',
          alignH: 'right',
          wrap: 'nowrap',
          width: 'shrink'
        },
        {
          name: 'sharedWith',
          title: $gettext('Shared with'),
          type: 'slot',
          alignH: 'right',
          wrap: 'nowrap',
          width: 'shrink'
        },
        {
          name: 'mdate',
          title: $gettext('Modified'),
          type: 'slot',
          alignH: 'right',
          wrap: 'nowrap',
          width: 'shrink',
          accessibleLabelCallback: (item) =>
            formatDateRelative((item as Resource).mdate) +
            ' (' +
            formatDate((item as Resource).mdate) +
            ')'
        },
        {
          name: 'sdate',
          title: $gettext('Shared on'),
          type: 'slot',
          alignH: 'right',
          wrap: 'nowrap',
          width: 'shrink',
          accessibleLabelCallback: (item) =>
            formatDateRelative((item as IncomingShareResource).sdate) +
            ' (' +
            formatDate((item as IncomingShareResource).sdate) +
            ')'
        },
        {
          name: 'ddate',
          title: $gettext('Deleted'),
          type: 'slot',
          alignH: 'right',
          wrap: 'nowrap',
          width: 'shrink',
          accessibleLabelCallback: (item) =>
            formatDateRelative((item as TrashResource).ddate) +
            ' (' +
            formatDate((item as TrashResource).ddate) +
            ')'
        }
      ] as FieldType[]
    )
      .filter((field) => {
        if (field.name === 'tags' && !unref(hasTags)) {
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
        if (!fieldsDisplayed) {
          return hasField
        }

        return hasField && fieldsDisplayed.includes(field.name)
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
  if (hasActions) {
    fields.push({
      name: 'actions',
      title: $gettext('Actions'),
      type: 'slot',
      alignH: 'right',
      wrap: 'nowrap',
      width: 'shrink'
    })
  }

  return fields
})
const areAllResourcesSelected = computed(() => {
  const allResourcesDisabled = unref(disabledResources).length === resources.length
  const allSelected =
    unref(selectedResources).length === resources.length - unref(disabledResources).length

  return !allResourcesDisabled && allSelected
})
const selectAllCheckboxLabel = computed(() => {
  return unref(areAllResourcesSelected) ? $gettext('Clear selection') : $gettext('Select all')
})
const selectedResources = computed(() => {
  return resources.filter((resource) => unref(selectedIds).includes(resource.id))
})
const dragSelection = computed(() => {
  const selection = [...unref(selectedResources)]
  selection.splice(
    selection.findIndex((i) => i.id === unref(dragItem).id),
    1
  )
  return selection
})

const isResourceSelected = (item: Resource) => {
  return unref(selectedIds).includes(item.id)
}
const isResourceCut = (resource: Resource) => {
  if (unref(clipboardAction) !== ClipboardActions.Cut) {
    return false
  }
  return unref(clipboardResources).some((r) => r.id === resource.id)
}
const getTagLink = (tag: string) => {
  const currentTerm = unref(router.currentRoute).query?.term
  return createLocationCommon('files-common-search', {
    query: { provider: 'files.sdk', q_tags: tag, ...(currentTerm && { term: currentTerm }) }
  })
}
const getTagComponentAttrs = (tag: string) => {
  if (!unref(userContextReady)) {
    return {}
  }

  return {
    to: getTagLink(tag)
  }
}
const isLatestSelectedItem = (item: Resource) => {
  return item.id === unref(latestSelectedId)
}
const hasRenameAction = (item: Resource) => {
  if (!showRenameQuickAction) {
    return false
  }

  if (isProjectSpaceResource(item)) {
    return unref(renameActionsSpace).filter((menuItem) => menuItem.isVisible({ resources: [item] }))
      .length
  }

  return unref(renameActions).filter((menuItem) => menuItem.isVisible({ space, resources: [item] }))
    .length
}
const openRenameDialog = (item: Resource) => {
  if (isProjectSpaceResource(item)) {
    return unref(renameHandlerSpace)({
      resources: [item]
    })
  }
  unref(renameHandler)({
    space: getMatchingSpace(item),
    resources: [item]
  })
}
const openTagsSidebar = () => {
  eventBus.publish(SideBarEventTopics.open)
}

const fileDragged = async (file: Resource, event: DragEvent) => {
  if (!dragDrop) {
    return
  }

  await setDragItem(file, event)
  addSelectedResource(file)
}
const fileDropped = (selector: string, event: DragEvent) => {
  if (!dragDrop) {
    return
  }
  const hasFilePayload = (event.dataTransfer.types || []).some((e) => e === 'Files')
  if (hasFilePayload) {
    return
  }
  dragItem.value = null
  const dropTarget = event.target as HTMLElement
  const dropTargetTr = dropTarget.closest('tr')
  const dropItemId = dropTargetTr.dataset.itemId
  dropRowStyling(selector, true, event)

  emit('fileDropped', dropItemId)
}
const setDragItem = async (item: Resource, event: DragEvent) => {
  dragItem.value = item
  await nextTick()
  ghostElement.value.$el.ariaHidden = 'true'
  ghostElement.value.$el.style.left = '-99999px'
  ghostElement.value.$el.style.top = '-99999px'
  event.dataTransfer.setDragImage(unref(ghostElement).$el, 0, 0)
  event.dataTransfer.dropEffect = 'move'
  event.dataTransfer.effectAllowed = 'move'
}
const dropRowStyling = (selector: string, leaving: boolean, event: DragEvent) => {
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
}
const sort = (opts: { sortBy: string; sortDir: SortDir }) => {
  emit('sort', opts)
}
const addSelectedResource = (file: Resource) => {
  if (!isResourceSelected(file)) {
    toggleSelection(file.id)
  }
}
const showContextMenuOnBtnClick = (data: ContextMenuBtnClickEventData, item: Resource) => {
  const { dropdown, event } = data

  if (event instanceof MouseEvent && interceptModifierClick(event, item)) {
    return
  }

  if (isResourceDisabled(item)) {
    return false
  }

  if (dropdown?.tippy === undefined) {
    return
  }
  if (!isResourceSelected(item)) {
    emitSelect([item.id])
  }
  displayPositionedDropdown(dropdown.tippy, event, unref(contextMenuButton))
}
const showContextMenu = (
  row: ComponentPublicInstance<unknown>,
  event: MouseEvent,
  item: Resource
) => {
  if (event instanceof MouseEvent && interceptModifierClick(event, item)) {
    return
  }
  event.preventDefault()
  if (isResourceDisabled(item)) {
    return false
  }

  const instance = row.$el.getElementsByClassName('resource-table-btn-action-dropdown')[0]
  if (instance === undefined) {
    return
  }
  if (!isResourceSelected(item)) {
    emitSelect([item.id])
  }

  if (unref(isMobile)) {
    // we can't use displayPositionedDropdown() on mobile because we need to open the bottom drawer.
    // this can be triggered by clicking the context menu button of the current row.
    const el = document.getElementById(`context-menu-trigger-${item.getDomSelector()}`)
    el?.click()
    return
  }

  displayPositionedDropdown(instance._tippy, event, unref(contextMenuButton))
}
const rowMounted = (resource: Resource, component: ComponentPublicInstance<typeof OcTableTr>) => {
  emit('rowMounted', resource, component, ImageDimension.Thumbnail)
}
const fileClicked = (data: [Resource, MouseEvent]) => {
  const resource = data[0]

  if (isResourceDisabled(resource)) {
    return
  }

  if (unref(isEmbedModeEnabled) && unref(isFilePicker) && !resource.isFolder) {
    return postMessage<embedModeFilePickMessageData>('opencloud-embed:file-pick', {
      resource: JSON.parse(JSON.stringify(resource)),
      locationQuery: JSON.parse(JSON.stringify(routeToContextQuery(unref(router.currentRoute))))
    })
  }

  const eventData = data[1]

  if (!eventData.shiftKey && !eventData.metaKey && !eventData.ctrlKey) {
    eventBus.publish('app.files.shiftAnchor.reset')
  }

  const isCheckboxClicked = (eventData?.target as HTMLElement).getAttribute('type') === 'checkbox'
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

  if (isResourceSelected(resource)) {
    return
  }

  return emitSelect([resource.id])
}
const formatDate = (date: string) => {
  return formatDateFromJSDate(new Date(date), currentLanguage)
}
const formatDateRelative = (date: string) => {
  return formatRelativeDateFromJSDate(new Date(date), currentLanguage)
}
const toggleSelectionAll = () => {
  if (unref(areAllResourcesSelected)) {
    return emitSelect([])
  }
  emitSelect(
    resources
      .filter((resource) => !unref(disabledResources).includes(resource.id))
      .map((resource) => resource.id)
  )
}
const emitFileClick = (resource: Resource, event?: MouseEvent) => {
  if (interceptModifierClick(event, resource)) {
    return
  }

  emit('fileClick', { space: getMatchingSpace(resource), resources: [resource] })
}
const getResourceCheckboxLabel = (resource: Resource) => {
  if (resource.type === 'folder') {
    return $gettext('Select folder')
  }
  return $gettext('Select file')
}
const getSharedWithAvatarDescription = (resource: Resource) => {
  if (!isShareResource(resource)) {
    return
  }
  const resourceType = resource.type === 'folder' ? $gettext('folder') : $gettext('file')

  const shareCount = resource.sharedWith.filter(({ shareType }) =>
    ShareTypes.authenticated.includes(ShareTypes.getByValue(shareType))
  ).length

  if (!shareCount) {
    return ''
  }

  return $ngettext(
    'This %{ resourceType } is shared via %{ shareCount } invite',
    'This %{ resourceType } is shared via %{ shareCount } invites',
    shareCount,
    {
      resourceType,
      shareCount: shareCount.toString()
    }
  )
}
const getSharedByAvatarDescription = (resource: Resource) => {
  if (!isShareResource(resource)) {
    return ''
  }

  const resourceType = resource.type === 'folder' ? $gettext('folder') : $gettext('file')
  return $gettext('This %{ resourceType } is shared by %{ user }', {
    resourceType,
    user: resource.sharedBy.map(({ displayName }) => displayName).join(', ')
  })
}
const getSharedByAvatarItems = (resource: Resource) => {
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
}
const getSharedWithAvatarItems = (resource: Resource) => {
  if (!isShareResource(resource)) {
    return []
  }

  return resource.sharedWith
    .filter(({ shareType }) => ShareTypes.authenticated.includes(ShareTypes.getByValue(shareType)))
    .map((s) => ({
      displayName: s.displayName,
      name: s.displayName,
      avatarType: ShareTypes.getByValue(s.shareType).key,
      username: s.id,
      userId: s.id
    }))
}
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
