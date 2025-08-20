<template>
  <div
    class="oc-filter-chip oc-flex"
    :class="{ 'oc-filter-chip-toggle': isToggle, 'oc-filter-chip-raw': raw }"
  >
    <oc-button
      :id="id"
      class="oc-filter-chip-button oc-pill py-1 px-2 text-xs"
      :class="{ 'oc-filter-chip-button-selected': filterActive }"
      appearance="raw-inverse"
      color-role="surface"
      @click="isToggle ? emit('toggleFilter') : false"
    >
      <oc-icon
        :class="filterActive ? 'oc-filter-check-icon-active' : 'oc-filter-check-icon-inactive'"
        name="check"
        size="small"
      />
      <span
        class="oc-text-truncate oc-filter-chip-label"
        v-text="!!selectedItemNames.length ? selectedItemNames[0] : filterLabel"
      />
      <span v-if="selectedItemNames.length > 1" v-text="` +${selectedItemNames.length - 1}`" />
      <oc-icon v-if="!filterActive && !isToggle" name="arrow-down-s" size="small" />
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
      class="oc-filter-chip-clear px-1"
      appearance="raw"
      :aria-label="$gettext('Clear filter')"
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

defineExpose({ hideDrop })
</script>

<style lang="scss">
.oc-filter-chip {
  &-button.oc-pill {
    align-items: center;
    border: 1px solid var(--oc-role-outline);
    box-sizing: border-box;
    display: inline-flex;
    gap: var(--oc-space-xsmall);
    text-decoration: none;
    max-width: 150px;
    height: 100%;
  }
  &-button-selected.oc-pill,
  &-button-selected.oc-pill:hover {
    background-color: var(--oc-role-secondary-container) !important;
    color: var(--oc-role-on-secondary-container) !important;
    border-top-left-radius: 99px !important;
    border-bottom-left-radius: 99px !important;
    border-top-right-radius: 0px !important;
    border-bottom-right-radius: 0px !important;
    border: 0;
  }
  &-clear,
  &-clear:hover {
    background-color: var(--oc-role-secondary-container) !important;
    color: var(--oc-role-on-secondary-container) !important;
    border-top-left-radius: 0px !important;
    border-bottom-left-radius: 0px !important;
    border-top-right-radius: 99px !important;
    border-bottom-right-radius: 99px !important;
  }
  &-clear:not(.oc-filter-chip-toggle .oc-filter-chip-clear),
  &-clear:hover:not(.oc-filter-chip-toggle .oc-filter-chip-clear) {
    margin-left: 1px;
  }
}
.oc-filter-chip-raw {
  .oc-filter-chip-button {
    background-color: transparent !important;
    border: none !important;
  }
}
.oc-filter-check-icon-active {
  transition: all 0.25s ease-in;
  transform: scale(1) !important;
}
.oc-filter-check-icon-inactive {
  transition: all 0.25 ease-in;
  transform: scale(0) !important;
  width: 0 !important;
}

// the focussed button needs to stay above the other to correctly display the focus outline
.oc-filter-chip-button,
.oc-filter-chip-clear {
  &:focus {
    z-index: 9;
  }
}
</style>
