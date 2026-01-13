<template>
  <div id="tiles-view" class="px-4 pt-2">
    <div class="flex items-center mb-2 pb-2 oc-tiles-controls">
      <oc-checkbox
        v-if="isSelectable && !isFilePicker"
        id="tiles-view-select-all"
        v-oc-tooltip="selectAllCheckboxLabel"
        class="ml-2"
        size="large"
        :label="selectAllCheckboxLabel"
        :label-hidden="true"
        :disabled="resources.length === disabledResources.length"
        :model-value="areAllResourcesSelected"
        @click.stop="toggleSelectionAll"
      />
      <div v-if="sortFields.length" class="oc-tiles-sort">
        <oc-filter-chip
          class="[&_.oc-filter-chip-label]:text-sm"
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
          :space="space"
          :resource-route="getResourceLink(resource)"
          :is-resource-selected="isResourceSelected(resource)"
          :is-resource-clickable="isResourceClickable(resource, areResourcesClickable)"
          :is-resource-disabled="isResourceDisabled(resource)"
          :is-extension-displayed="areFileExtensionsShown"
          :is-path-displayed="arePathsDisplayed"
          :resource-icon-size="resourceIconSize"
          :draggable="dragDrop"
          :lazy="areTilesLazy"
          :is-loading="isResourceInDeleteQueue(resource.id)"
          @vue:mounted="
            $emit('rowMounted', resource, tileRefs.tiles[resource.id], ImageDimension.Tile)
          "
          @contextmenu="
            showContextMenuOnRightClick(
              unref(tileRefs).tiles[resource.id],
              $event,
              resource,
              tileRefs.tiles[resource.id],
              'resource-tiles-btn-action-dropdown'
            )
          "
          @file-name-clicked.stop="(e: MouseEvent) => fileNameClicked({ resource, event: e })"
          @dragstart="dragStart(resource, $event)"
          @dragenter.prevent="setDropStyling(resource, false, $event)"
          @dragleave.prevent="setDropStyling(resource, true, $event)"
          @drop="fileDropped(resource, $event)"
          @dragover="$event.preventDefault()"
          @item-visible="$emit('itemVisible', resource)"
          @tile-clicked="fileContainerClicked({ resource, event: $event[1] })"
        >
          <template #selection>
            <oc-checkbox
              v-if="isSelectable && !isLocationPicker && !isFilePicker"
              :label="getResourceCheckboxLabel(resource)"
              :label-hidden="true"
              size="large"
              class="inline-flex p-2.5"
              :disabled="isResourceDisabled(resource)"
              :model-value="isResourceSelected(resource)"
              :data-test-selection-resource-name="resource.name"
              :data-test-selection-resource-path="resource.path"
              @click.stop.prevent="fileCheckboxClicked({ resource, event: $event })"
            />
          </template>
          <template #imageField>
            <slot name="image" :resource="resource" />
          </template>
          <template #indicators>
            <resource-status-indicators
              :space="space"
              class="ml-2"
              :resource="resource"
              :filter="(indicator) => ['system', 'sharing'].includes(indicator.category)"
              :disable-handler="isResourceDisabled(resource)"
            />
          </template>
          <template #actions>
            <slot name="actions" :resource="resource" />
          </template>
          <template #contextMenu>
            <context-menu-quick-action
              v-if="shouldShowContextDrop(resource)"
              :ref="(el) => (tileRefs.dropBtns[resource.id] = el as ContextMenuQuickActionRef)"
              :item="resource"
              :title="resource.name"
              class="resource-tiles-btn-action-dropdown"
              @quick-action-clicked="
                showContextMenuOnBtnClick($event, resource, unref(tileRefs).dropBtns[resource.id])
              "
            >
              <template #contextMenu>
                <slot name="contextMenu" :resource="resource" />
              </template>
            </context-menu-quick-action>
          </template>
          <template #additionalResourceContent>
            <slot name="additionalResourceContent" :resource="resource" />
          </template>
        </resource-tile>
      </li>
      <li
        v-for="index in ghostTilesCount"
        :key="`ghost-tile-${index}`"
        class="list-item"
        :aria-hidden="true"
      />
    </oc-list>
    <Teleport v-if="dragItem" to="body">
      <resource-ghost-element ref="ghostElement" :preview-items="[dragItem, ...dragSelection]" />
    </Teleport>
    <div class="p-1 text-sm">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  ComponentPublicInstance,
  onBeforeUnmount,
  onBeforeUpdate,
  onMounted,
  ref,
  unref,
  watch
} from 'vue'
import { useGettext } from 'vue3-gettext'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { ContextMenuQuickAction } from '../ContextActions'
import { ImageDimension } from '../../constants'
import ResourceTile from './ResourceTile.vue'
import ResourceGhostElement from './ResourceGhostElement.vue'
import {
  FolderViewModeConstants,
  SortDir,
  SortField,
  useTileSize,
  useResourcesStore,
  useViewSizeMax,
  useEmbedMode,
  useSideBar,
  FileActionOptions,
  useResourceViewHelpers
} from '../../composables'
import { SizeType } from '@opencloud-eu/design-system/helpers'
import ResourceStatusIndicators from './ResourceStatusIndicators.vue'
import { storeToRefs } from 'pinia'

type ResourceTileRef = ComponentPublicInstance<typeof ResourceTile>
type ContextMenuQuickActionRef = ComponentPublicInstance<typeof ContextMenuQuickAction>

const {
  resources = [],
  selectedIds = [],
  isSelectable = true,
  space,
  sortFields = [],
  sortBy,
  sortDir,
  viewSize = FolderViewModeConstants.tilesSizeDefault,
  dragDrop = false,
  lazy = true,
  areResourcesClickable = true,
  arePathsDisplayed = false
} = defineProps<{
  resources?: Resource[]
  selectedIds?: string[]
  isSelectable?: boolean
  space?: SpaceResource
  sortFields?: SortField[]
  sortBy?: string
  sortDir?: SortDir
  viewSize?: number
  dragDrop?: boolean
  lazy?: boolean
  areResourcesClickable?: boolean
  arePathsDisplayed?: boolean
}>()

const emit = defineEmits<{
  (e: 'fileClick', options: FileActionOptions): void
  (e: 'fileDropped', id: string): void
  (e: 'rowMounted', resource: Resource, compnent: ResourceTileRef, dimension: ImageDimension): void
  (e: 'sort', value: { sortBy: string; sortDir: SortDir }): void
  (e: 'itemVisible', resource: Resource): void
  (e: 'update:selectedIds', ids: string[]): void
}>()

defineSlots<{
  image?: (props: { resource: Resource }) => unknown
  actions?: (props: { resource: Resource }) => unknown
  contextMenu?: (props: { resource: Resource }) => unknown
  footer?: () => unknown
  additionalResourceContent?: (props: { resource: Resource }) => unknown
}>()

const { $gettext } = useGettext()
const resourcesStore = useResourcesStore()
const { areFileExtensionsShown } = storeToRefs(resourcesStore)
const { isLocationPicker, isFilePicker } = useEmbedMode()
const viewSizeMax = useViewSizeMax()
const viewSizeCurrent = computed(() => {
  return Math.min(unref(viewSizeMax), viewSize)
})
const { isSideBarOpen } = useSideBar()
const {
  disabledResources,
  isResourceSelected,
  fileContainerClicked,
  fileNameClicked,
  fileCheckboxClicked,
  isResourceDisabled,
  isResourceInDeleteQueue,
  isResourceClickable,
  getResourceLink,
  dragItem,
  dragSelection,
  dragStart,
  fileDropped,
  setDropStyling,
  shouldShowContextDrop,
  showContextMenuOnRightClick,
  showContextMenuOnBtnClick,
  selectAllCheckboxLabel,
  getResourceCheckboxLabel,
  toggleSelectionAll,
  areAllResourcesSelected
} = useResourceViewHelpers({
  space: computed(() => space),
  resources: computed(() => resources),
  selectedIds: computed(() => selectedIds),
  emit
})

// Disable lazy loading during E2E tests to avoid having to scroll in tests
const areTilesLazy = (window as any).__E2E__ === true ? false : lazy

const tileRefs = ref({
  tiles: {} as Record<string, ResourceTileRef>,
  dropBtns: {} as Record<string, ContextMenuQuickActionRef>
})

const currentSortField = computed(() => {
  return sortFields.find((o) => o.name === sortBy && o.sortDir === sortDir) || sortFields[0]
})
const selectSorting = (field: SortField) => {
  emit('sort', { sortBy: field.name, sortDir: unref(field.sortDir) })
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

watch(
  tileSizePixels,
  (px: number | undefined) => {
    if (px && !isNaN(px)) {
      document.documentElement.style.setProperty(`--oc-size-tiles-actual`, `${px}px`)
    }
  },
  { immediate: true }
)
watch(maxTilesAll, (all) => {
  viewSizeMax.value = Math.max(all.length, 1)
})
watch(isSideBarOpen, () => {
  updateViewWidth()
})

onMounted(() => {
  window.addEventListener('resize', updateViewWidth)
  updateViewWidth()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewWidth)
})
</script>
<style scoped>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-tiles {
    grid-template-columns: repeat(auto-fit, minmax(var(--oc-size-tiles-actual), 1fr));
  }
}
</style>
