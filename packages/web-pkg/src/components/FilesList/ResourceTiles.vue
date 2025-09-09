<template>
  <div id="tiles-view" class="px-4 pt-2">
    <div class="flex items-center mb-2 pb-2 oc-tiles-controls">
      <oc-checkbox
        id="tiles-view-select-all"
        v-oc-tooltip="selectAllCheckboxLabel"
        class="ml-2"
        size="large"
        :label="selectAllCheckboxLabel"
        :label-hidden="true"
        :disabled="resources.length === disabledResourceIds.length"
        :model-value="areAllResourcesSelected"
        @click.stop="toggleSelectionAll"
      />
      <div v-if="sortFields.length" class="oc-tiles-sort">
        <oc-filter-chip
          class="oc-tiles-sort-filter-chip"
          :filter-label="$gettext('Sort by')"
          :selected-item-names="[currentSortField.label]"
          :has-active-state="false"
          close-on-click
          raw
        >
          <template #default>
            <oc-list>
              <li v-for="(option, index) in sortFields" :key="index">
                <oc-button
                  :appearance="currentSortField === option ? 'filled' : 'raw-inverse'"
                  :color-role="currentSortField === option ? 'secondaryContainer' : 'surface'"
                  :no-hover="currentSortField === option"
                  justify-content="space-between"
                  class="oc-tiles-sort-filter-chip-item"
                  @click="selectSorting(option)"
                >
                  <span>{{ option.label }}</span>
                  <div v-if="option === currentSortField" class="flex">
                    <oc-icon name="check" />
                  </div>
                </oc-button>
              </li>
            </oc-list>
          </template>
        </oc-filter-chip>
      </div>
    </div>
    <oc-list class="oc-tiles grid justify-start gap-3">
      <li
        v-for="resource in resources"
        :key="resource.id"
        class="oc-tiles-item has-item-context-menu"
      >
        <resource-tile
          :ref="(el) => (tileRefs.tiles[resource.id] = el as ResourceTileRef)"
          :resource="resource"
          :resource-route="getRoute(resource)"
          :is-resource-selected="isResourceSelected(resource)"
          :is-resource-clickable="isResourceClickable(resource)"
          :is-resource-disabled="isResourceDisabled(resource) || isSpaceResourceDisabled(resource)"
          :is-extension-displayed="areFileExtensionsShown"
          :resource-icon-size="resourceIconSize"
          :draggable="dragDrop"
          :lazy="areTilesLazy"
          :is-loading="isResourceInDeleteQueue(resource.id)"
          @vue:mounted="
            $emit('rowMounted', resource, tileRefs.tiles[resource.id], ImageDimension.Tile)
          "
          @contextmenu="showContextMenu($event, resource, tileRefs.tiles[resource.id])"
          @click.stop="(e: MouseEvent) => handleClickWithModifier(e, resource)"
          @dragstart="dragStart(resource, $event)"
          @dragenter.prevent="setDropStyling(resource, false, $event)"
          @dragleave.prevent="setDropStyling(resource, true, $event)"
          @drop="fileDropped(resource, $event)"
          @dragover="$event.preventDefault()"
          @item-visible="$emit('itemVisible', resource)"
        >
          <template #selection>
            <oc-checkbox
              v-if="!isLocationPicker && !isFilePicker"
              :label="getResourceCheckboxLabel(resource)"
              :label-hidden="true"
              size="large"
              class="inline-flex p-2"
              :disabled="isResourceDisabled(resource)"
              :model-value="isResourceSelected(resource)"
              :data-test-selection-resource-name="resource.name"
              :data-test-selection-resource-path="resource.path"
              @click.stop.prevent="toggleTile([resource, $event])"
            />
          </template>
          <template #imageField>
            <slot name="image" :resource="resource" />
          </template>
          <template #indicators>
            <resource-status-indicators
              :space="space"
              :resource="resource"
              :filter="(indicator) => indicator.category === 'system'"
              :disable-handler="isResourceDisabled(resource)"
            />
          </template>
          <template #actions>
            <slot name="actions" :resource="resource" />
          </template>
          <template #contextMenu>
            <context-menu-quick-action
              v-if="isSpaceResource(resource) || !isResourceDisabled(resource)"
              :ref="(el) => (tileRefs.dropBtns[resource.id] = el as ContextMenuQuickActionRef)"
              :item="resource"
              :title="resource.name"
              class="resource-tiles-btn-action-dropdown"
              @quick-action-clicked="showContextMenuOnBtnClick($event, resource, resource.id)"
            >
              <template #contextMenu="{ isOpen, dropRef }">
                <slot
                  name="contextMenu"
                  :resource="resource"
                  :is-open="isOpen"
                  :drop-ref="dropRef"
                />
              </template>
            </context-menu-quick-action>
          </template>
        </resource-tile>
      </li>
      <li
        v-for="index in ghostTilesCount"
        :key="`ghost-tile-${index}`"
        class="ghost-tile list-item"
        :aria-hidden="true"
      />
    </oc-list>
    <Teleport v-if="dragItem" to="body">
      <resource-ghost-element ref="ghostElementRef" :preview-items="[dragItem, ...dragSelection]" />
    </Teleport>
    <div class="oc-tiles-footer p-1 text-sm">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  ComponentPublicInstance,
  nextTick,
  onBeforeUnmount,
  onBeforeUpdate,
  onMounted,
  ref,
  unref,
  watch
} from 'vue'
import { useGettext } from 'vue3-gettext'
import { isSpaceResource, Resource, SpaceResource } from '@opencloud-eu/web-client'

// Constants should match what is being used in OcTable/ResourceTable
// Alignment regarding naming would be an API-breaking change and can
// Be done at a later point in time?
import { ContextMenuQuickAction } from '../ContextActions'
import { createLocationSpaces } from '../../router'
import {
  ContextMenuBtnClickEventData,
  createFileRouteOptions,
  CreateTargetRouteOptions,
  displayPositionedDropdown
} from '../../helpers'
import { eventBus } from '../../services'
import { ImageDimension } from '../../constants'
import ResourceTile from './ResourceTile.vue'
import ResourceGhostElement from './ResourceGhostElement.vue'
import {
  FolderViewModeConstants,
  SortDir,
  SortField,
  useResourceRouteResolver,
  useTileSize,
  useResourcesStore,
  useViewSizeMax,
  useEmbedMode,
  useCanBeOpenedWithSecureView,
  useFileActions,
  useGetMatchingSpace,
  embedModeFilePickMessageData,
  routeToContextQuery,
  useRouter
} from '../../composables'
import { useInterceptModifierClick } from '../../composables/keyboardActions'
import { SizeType } from '@opencloud-eu/design-system/helpers'
import ResourceStatusIndicators from './ResourceStatusIndicators.vue'

type ResourceTileRef = ComponentPublicInstance<typeof ResourceTile>
type ContextMenuQuickActionRef = ComponentPublicInstance<typeof ContextMenuQuickAction>

const {
  resources = [],
  selectedIds = [],
  targetRouteCallback,
  space,
  sortFields = [],
  sortBy,
  sortDir,
  viewSize = FolderViewModeConstants.tilesSizeDefault,
  dragDrop = false,
  lazy = true
} = defineProps<{
  resources?: Resource[]
  selectedIds?: string[]
  targetRouteCallback?: (arg: CreateTargetRouteOptions) => unknown
  space?: SpaceResource
  sortFields?: SortField[]
  sortBy?: string
  sortDir?: SortDir
  viewSize?: number
  dragDrop?: boolean
  lazy?: boolean
}>()

const emit = defineEmits<{
  (e: 'fileDropped', id: string): void
  (e: 'rowMounted', resource: Resource, compnent: ResourceTileRef, dimension: ImageDimension): void
  (e: 'sort', value: { sortBy: any; sortDir: any }): void
  (e: 'itemVisible', resource: Resource): void
  (e: 'update:selectedIds', ids: string[]): void
}>()

const { $gettext } = useGettext()
const router = useRouter()
const resourcesStore = useResourcesStore()
const { getDefaultAction } = useFileActions()
const { getMatchingSpace } = useGetMatchingSpace()
const { interceptModifierClick } = useInterceptModifierClick()
const { canBeOpenedWithSecureView } = useCanBeOpenedWithSecureView()
const {
  isEnabled: isEmbedModeEnabled,
  fileTypes: embedModeFileTypes,
  isLocationPicker,
  isFilePicker,
  postMessage
} = useEmbedMode()
const viewSizeMax = useViewSizeMax()
const viewSizeCurrent = computed(() => {
  return Math.min(unref(viewSizeMax), viewSize)
})

// Disable lazy loading during E2E tests to avoid having to scroll in tests
const areTilesLazy = (window as any).__E2E__ === true ? false : lazy

const areFileExtensionsShown = computed(() => resourcesStore.areFileExtensionsShown)

const selectAllCheckboxLabel = computed(() => {
  return unref(areAllResourcesSelected) ? $gettext('Clear selection') : $gettext('Select all')
})

const dragItem = ref()
const ghostElementRef = ref()

const tileRefs = ref({
  tiles: {} as Record<string, ResourceTileRef>,
  dropBtns: {} as Record<string, ContextMenuQuickActionRef>
})

const resourceRouteResolver = useResourceRouteResolver(
  {
    space: ref(space),
    targetRouteCallback: computed(() => targetRouteCallback)
  },
  { emit }
)

const getRoute = (resource: Resource) => {
  if (isSpaceResource(resource)) {
    return resource.disabled
      ? null
      : createLocationSpaces(
          'files-spaces-generic',
          createFileRouteOptions(resource as SpaceResource, {
            path: '',
            fileId: resource.fileId
          })
        )
  }

  if (resource.isFolder) {
    return resourceRouteResolver.createFolderLink({
      path: resource.path,
      fileId: resource.fileId,
      resource: resource
    })
  }

  let s = space
  if (!s) {
    s = getMatchingSpace(resource)
  }

  const action = getDefaultAction({ resources: [resource], space: s })
  if (!action?.route) {
    return null
  }

  return action.route({ space: s, resources: [resource] })
}

const emitTileClick = (resource: Resource, event?: MouseEvent) => {
  if (event && interceptModifierClick(event as MouseEvent, resource)) {
    return
  }

  if (unref(isEmbedModeEnabled) && unref(isFilePicker)) {
    return postMessage<embedModeFilePickMessageData>('opencloud-embed:file-pick', {
      resource: JSON.parse(JSON.stringify(resource)),
      locationQuery: JSON.parse(JSON.stringify(routeToContextQuery(unref(router.currentRoute))))
    })
  }

  if (event && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
    toggleSelection(resource)
  }

  if (resource.type !== 'space' && resource.type !== 'folder') {
    resourceRouteResolver.createFileAction(resource as Resource)
  }
}

const showContextMenuOnBtnClick = (
  data: ContextMenuBtnClickEventData,
  item: Resource,
  index: string
) => {
  const { dropdown, event } = data

  if (event && interceptModifierClick(event as MouseEvent, item)) {
    return
  }

  if (dropdown?.tippy === undefined) {
    return
  }
  resourcesStore.setSelection([item.id])
  displayPositionedDropdown(dropdown.tippy, event, unref(tileRefs).dropBtns[index])
}

const isResourceSelected = (resource: Resource) => {
  return selectedIds.includes(resource.id)
}

const selectedResources = computed(() => {
  return resources.filter((resource) => selectedIds.includes(resource.id))
})

const isResourceClickable = (resource: Resource) => {
  if (isResourceDisabled(resource) || isSpaceResourceDisabled(resource)) {
    return false
  }

  if (resource.isFolder) {
    return true
  }

  if (!resource.canDownload() && !canBeOpenedWithSecureView(resource)) {
    return false
  }

  if (unref(isEmbedModeEnabled) && !unref(isFilePicker)) {
    return false
  }

  return true
}

const isResourceDisabled = (resource: Resource) => {
  if (unref(isEmbedModeEnabled) && unref(embedModeFileTypes)?.length) {
    return (
      !unref(embedModeFileTypes).includes(resource.extension) &&
      !unref(embedModeFileTypes).includes(resource.mimeType) &&
      !resource.isFolder
    )
  }

  if (isResourceInDeleteQueue(resource.id)) {
    return true
  }

  return resource.processing === true
}

const isSpaceResourceDisabled = (resource: Resource) => {
  // a disabled space behaves a bit different than a disabled resource because
  // it still allows certain actions, hence we need to handle them separately.
  if (isResourceDisabled(resource)) {
    return true
  }

  return isSpaceResource(resource) && resource.disabled
}

const disabledResourceIds = computed(() => {
  return (
    resources
      ?.filter((resource) => isResourceDisabled(resource) === true)
      ?.map((resource) => resource.id) || []
  )
})

const emitSelect = (selectedIds: string[]) => {
  emit('update:selectedIds', selectedIds)
}

const toggleSelectionAll = () => {
  if (unref(areAllResourcesSelected)) {
    return emit('update:selectedIds', [])
  }

  emit(
    'update:selectedIds',
    resources
      .filter((resource) => !unref(disabledResourceIds).includes(resource.id))
      .map((resource) => resource.id)
  )
}

const showContextMenu = (
  event: MouseEvent | KeyboardEvent,
  item: Resource,
  reference: ComponentPublicInstance<unknown>
) => {
  if (event instanceof MouseEvent && interceptModifierClick(event, item)) {
    return
  }

  event.preventDefault()
  const drop = unref(tileRefs).tiles[item.id]?.$el.getElementsByClassName(
    'resource-tiles-btn-action-dropdown'
  )[0]

  if (drop === undefined) {
    return
  }
  if (!isResourceSelected(item)) {
    emitSelect([item.id])
  }
  displayPositionedDropdown(drop._tippy, event, reference)
}

const handleClickWithModifier = (event: MouseEvent, item: Resource) => {
  if (interceptModifierClick(event, item)) {
    toggleSelection(item)
    return
  }

  emitTileClick(item, event)
}

const toggleTile = (data: [Resource, MouseEvent | KeyboardEvent], event?: MouseEvent) => {
  const resource = data[0]
  const eventData = data[1]

  if (event && interceptModifierClick(event as MouseEvent, resource)) {
    return
  }

  if (eventData && eventData.metaKey) {
    return eventBus.publish('app.files.list.clicked.meta', resource)
  }
  if (!eventData.shiftKey && !eventData.metaKey && !eventData.ctrlKey) {
    eventBus.publish('app.files.shiftAnchor.reset')
  }
  if (eventData && eventData.shiftKey) {
    return eventBus.publish('app.files.list.clicked.shift', {
      resource,
      skipTargetSelection: false
    })
  }
  toggleSelection(resource)
}

const toggleSelection = (resource: Resource) => {
  const selected = !isResourceSelected(resource)
    ? [...selectedIds, resource.id]
    : selectedIds.filter((id) => id !== resource.id)
  emit('update:selectedIds', selected)
}

const getResourceCheckboxLabel = (resource: Resource) => {
  switch (resource.type) {
    case 'folder':
      return $gettext('Select folder')
    case 'space':
      return $gettext('Select space')
    default:
      return $gettext('Select file')
  }
}

const currentSortField = computed(() => {
  return sortFields.find((o) => o.name === sortBy && o.sortDir === sortDir) || sortFields[0]
})
const selectSorting = (field: SortField) => {
  emit('sort', { sortBy: field.name, sortDir: field.sortDir })
}

const resourceIconSize = computed<SizeType>(() => {
  const sizeMap: Record<number, string> = {
    1: 'xlarge',
    2: 'xlarge',
    3: 'xxlarge',
    4: 'xxlarge',
    5: 'xxxlarge',
    6: 'xxxlarge'
  }
  const size = unref(viewSizeCurrent)
  return (sizeMap[size] ?? 'xxlarge') as SizeType
})
onBeforeUpdate(() => {
  tileRefs.value = {
    tiles: {},
    dropBtns: {}
  }
})

const setDropStyling = (
  resource: Resource,
  leaving: boolean,
  event: MouseEvent | KeyboardEvent | DragEvent
) => {
  const hasFilePayload = ((event as DragEvent).dataTransfer?.types || []).some((e) => e === 'Files')
  if (
    hasFilePayload ||
    (event.currentTarget as HTMLElement)?.contains(
      (event as MouseEvent).relatedTarget as HTMLElement
    ) ||
    selectedIds.includes(resource.id) ||
    resource.type !== 'folder'
  ) {
    return
  }
  const el = unref(tileRefs).tiles[resource.id]
  if (leaving) {
    el.$el.classList.remove('bg-role-secondary-container')
    return
  }
  el.$el.classList.add('bg-role-secondary-container')
}
const dragSelection = computed(() => {
  return selectedIds.filter((id) => id !== unref(dragItem).id)
})
const setDragItem = async (item: Resource, event: DragEvent) => {
  dragItem.value = item
  await nextTick()
  unref(ghostElementRef).$el.ariaHidden = 'true'
  unref(ghostElementRef).$el.style.left = '-99999px'
  unref(ghostElementRef).$el.style.top = '-99999px'
  event.dataTransfer.setDragImage(unref(ghostElementRef).$el, 0, 0)
  event.dataTransfer.dropEffect = 'move'
  event.dataTransfer.effectAllowed = 'move'
}
const dragStart = async (resource: Resource, event: DragEvent) => {
  if (!isResourceSelected(resource)) {
    toggleSelection(resource)
  }
  await setDragItem(resource, event)
}

const fileDropped = (resource: Resource, event: DragEvent) => {
  const hasFilePayload = (event.dataTransfer.types || []).some((e) => e === 'Files')
  if (hasFilePayload) {
    return
  }
  dragItem.value = null
  setDropStyling(resource, true, event)
  emit('fileDropped', resource.id)
}

const viewWidth = ref(0)
const updateViewWidth = () => {
  const element = document.getElementById('tiles-view')
  const style = getComputedStyle(element)
  const paddingLeft = parseInt(style.getPropertyValue('padding-left'), 10) | 0
  const paddingRight = parseInt(style.getPropertyValue('padding-right'), 10) | 0
  viewWidth.value = element.clientWidth - paddingLeft - paddingRight
}
const gapSizePixels = computed(() => {
  return parseFloat(getComputedStyle(document.documentElement).fontSize)
})
const { calculateTileSizePixels } = useTileSize()
const maxTilesAll = computed<number[]>(() => {
  const viewSizes = [...Array(FolderViewModeConstants.tilesSizeMax).keys()].map((i) => i + 1)
  return [
    ...new Set<number>(
      viewSizes.map((viewSize) => {
        const pixels = calculateTileSizePixels(viewSize)
        return pixels ? Math.round(unref(viewWidth) / (pixels + unref(gapSizePixels))) : 0
      })
    )
  ]
})
const maxTilesCurrent = computed(() => {
  const maxTiles = unref(maxTilesAll)
  return maxTiles.length < unref(viewSizeCurrent)
    ? maxTiles[maxTiles.length - 1]
    : maxTiles[unref(viewSizeCurrent) - 1]
})
const ghostTilesCount = computed(() => {
  const remainder = unref(maxTilesCurrent) ? resources.length % unref(maxTilesCurrent) : 0
  if (!remainder) {
    return 0
  }
  return unref(maxTilesCurrent) - remainder
})

const tileSizePixels = computed(() => {
  return unref(viewWidth) / unref(maxTilesCurrent) - unref(gapSizePixels)
})

const areAllResourcesSelected = computed(() => {
  const allResourcesDisabled = unref(disabledResourceIds).length === resources.length
  const allSelected =
    unref(selectedResources).length === resources.length - unref(disabledResourceIds).length

  return !allResourcesDisabled && allSelected
})

const isResourceInDeleteQueue = (id: string): boolean => {
  return resourcesStore.deleteQueue.includes(id)
}

watch(
  tileSizePixels,
  (px: number) => {
    document.documentElement.style.setProperty(`--oc-size-tiles-actual`, `${px}px`)
  },
  { immediate: true }
)
watch(maxTilesAll, (all) => {
  viewSizeMax.value = Math.max(all.length, 1)
})

onMounted(() => {
  window.addEventListener('resize', updateViewWidth)
  updateViewWidth()
})

eventBus.subscribe('app.files.list.clicked.default', (resource) => {
  if (isResourceClickable(resource as Resource)) {
    emitSelect([(resource as Resource).id])
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewWidth)
})
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-tiles {
    grid-template-columns: repeat(auto-fit, minmax(var(--oc-size-tiles-actual), 1fr));
  }

  .oc-tiles-sort-filter-chip .oc-filter-chip-label {
    @apply text-sm;
  }
}
</style>
