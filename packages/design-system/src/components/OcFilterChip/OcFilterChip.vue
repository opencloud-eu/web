<template>
  <div
    class="oc-filter-chip flex"
    :class="{ 'oc-filter-chip-toggle': isToggle, 'oc-filter-chip-raw': raw }"
  >
    <oc-button
      :id="id"
      :gap-size="filterActive ? 'small' : 'none'"
      class="oc-filter-chip-button oc-pill py-1 text-xs rounded-full h-[26px] max-w-40 focus:z-90 transition-[gap]"
      :class="{
        'oc-filter-chip-button-selected rounded-l-full rounded-r-none pr-2 pl-3': filterActive,
        'px-3': !filterActive
      }"
      :appearance="buttonAppearance"
      :color-role="buttonColorRole"
      :no-hover="filterActive || !hasActiveState"
      @click="isToggle ? emit('toggleFilter') : false"
    >
      <oc-icon
        :class="{
          'transform-[scale(1)] ease-in': filterActive,
          'transform-[scale(0)] ease-out w-0': !filterActive
        }"
        class="transition-all duration-250"
        name="check"
        size="small"
      />
      <span
        class="truncate oc-filter-chip-label"
        v-text="!!selectedItemNames.length ? selectedItemNames[0] : filterLabel"
      />
      <span v-if="selectedItemNames.length > 1" v-text="` +${selectedItemNames.length - 1}`" />
      <oc-icon
        v-if="!filterActive && !isToggle"
        name="arrow-down-s"
        size="small"
        fill-type="line"
        class="ml-1"
      />
    </oc-button>
    <oc-drop
      v-if="!isToggle"
      ref="dropRef"
      :toggle="'#' + id"
      :title="filterLabel"
      class="oc-filter-chip-drop"
      mode="click"
      padding-size="small"
      :close-on-click="closeOnClick"
      @hide-drop="emit('hideDrop')"
      @show-drop="emit('showDrop')"
    >
      <slot />
    </oc-drop>
    <oc-button
      v-if="filterActive"
      v-oc-tooltip="$gettext('Clear filter')"
      class="oc-filter-chip-clear px-1 rounded-r-full h-[26px] not-[.oc-filter-chip-toggle_.oc-filter-chip-clear]:ml-[1px] focus:z-90"
      appearance="filled"
      color-role="secondaryContainer"
      :aria-label="$gettext('Clear filter')"
      :no-hover="filterActive"
      @click="emit('clearFilter')"
    >
      <oc-icon name="close" size="small" />
    </oc-button>
  </div>
</template>

<script setup lang="ts">
import { computed, unref, useTemplateRef } from 'vue'
import { uniqueId } from '../../helpers'
import OcDrop from '../OcDrop/OcDrop.vue'

export interface Props {
  /**
   * @docs The label of the filter.
   */
  filterLabel: string
  /**
   * @docs Determines if the drop should close when an item is clicked.
   * @default false
   */
  closeOnClick?: boolean
  /**
   * @docs The element ID of the filter.
   */
  id?: string
  /**
   * @docs Determines if the filter is a binary toggle.
   * @default false
   */
  isToggle?: boolean
  /**
   * @docs Determines if the toggle is active.
   * @default false
   */
  isToggleActive?: boolean
  /**
   * @docs Determines if the filter has a raw appearance.
   * @default false
   */
  raw?: boolean
  /**
   * @docs Determines if the filter has an active state (e.g. if one or more items are selected).
   * @default true
   */
  hasActiveState?: boolean
  /**
   * @docs The names of the selected items.
   */
  selectedItemNames?: string[]
}

export interface Emits {
  /**
   * @docs Emitted when the filter has been cleared.
   */
  (e: 'clearFilter'): void
  /**
   * @docs Emitted when the drop has been hidden.
   */
  (e: 'hideDrop'): void
  /**
   * @docs Emitted when the drop has been displayed.
   */
  (e: 'showDrop'): void
  /**
   * @docs Emitted when the filter has been toggled.
   */
  (e: 'toggleFilter'): void
}

export interface Slot {
  /**
   * @docs The content of the filter chip.
   */
  default: () => unknown
}

const {
  filterLabel,
  closeOnClick = false,
  id = uniqueId('oc-filter-chip-'),
  isToggle = false,
  isToggleActive = false,
  raw = false,
  hasActiveState = true,
  selectedItemNames = []
} = defineProps<Props>()

const emit = defineEmits<Emits>()
defineSlots<Slot>()

const dropRef = useTemplateRef<typeof OcDrop>('dropRef')

const filterActive = computed(() => {
  if (!hasActiveState) {
    return false
  }
  if (isToggle) {
    return isToggleActive
  }
  return !!selectedItemNames.length
})

const hideDrop = () => {
  unref(dropRef)?.hide()
}

const buttonAppearance = computed(() => {
  if (unref(filterActive)) {
    return 'filled'
  }
  if (raw) {
    return 'raw-inverse'
  }
  return 'outline'
})

const buttonColorRole = computed(() => {
  if (unref(filterActive)) {
    return 'secondaryContainer'
  }
  if (raw) {
    return 'surface'
  }
  return 'secondary'
})

defineExpose({ hideDrop })
</script>
