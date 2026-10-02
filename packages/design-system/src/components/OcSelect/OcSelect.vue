<template>
  <div :class="{ 'flex items-center': inlineLabel }">
    <label
      v-if="!labelHidden"
      :aria-hidden="true"
      :for="id"
      class="inline-block"
      :class="{ 'mr-2': inlineLabel, 'mb-0.5': !inlineLabel }"
    >
      {{ label }}
      <span v-if="requiredMark" class="text-role-error" aria-hidden="true">*</span>
    </label>
    <oc-contextual-helper
      v-if="contextualHelper?.isEnabled"
      v-bind="contextualHelper?.data"
      class="pl-1"
    />
    <vue-select
      ref="selectRef"
      :input-id="id"
      :label="optionLabel"
      :get-option-label="resolveOptionLabel"
      :disabled="isDisabled"
      :filter="filter"
      :loading="loading"
      :searchable="searchable"
      :clearable="clearable"
      :multiple="multiple"
      class="oc-select"
      :class="{
        'oc-select-position-fixed': positionFixed,
        'oc-select-no-border': !hasBorder,
        'oc-select-keyboard-navigation': keyboardNavigation
      }"
      :dropdown-should-open="dropdownShouldOpen"
      :map-keydown="mapKeydown"
      v-bind="$attrs"
      @update:model-value="emit('update:modelValue', $event)"
      @click="dropdownEnabled = true"
      @search:blur="dropdownEnabled = false"
      @keydown="onKeydown"
      @mousemove="keyboardNavigation = false"
    >
      <template #search="{ attributes, events }">
        <input
          class="vs__search"
          v-bind="attributes"
          @input="emit('search:input', ($event.target as HTMLInputElement).value)"
          v-on="events"
        />
      </template>
      <template v-for="(_, name) in $slots" #[name]="data">
        <slot v-if="name !== 'search'" :name="name" v-bind="data" />
      </template>
      <template #no-options>
        <div v-text="$gettext('No options available.')" />
      </template>
      <template #spinner="{ loading: isLoading }">
        <oc-spinner v-if="isLoading" />
      </template>
      <template #selected-option-container="{ option, deselect }">
        <span class="vs__selected" :class="{ 'vs__selected-readonly': option.readonly }">
          <slot name="selected-option" v-bind="option">
            <oc-icon v-if="readOnly && !multiple" name="lock" class="mr-1" size-class="size-4" />
            {{ resolveOptionLabel(option) }}
          </slot>
          <span
            v-if="multiple && (option.readonly || readOnly || !disabled)"
            class="flex items-center ml-2 mr-1"
          >
            <oc-icon
              v-if="option.readonly || readOnly"
              class="vs__deselect-lock"
              name="lock"
              size-class="size-4"
            />
            <oc-button
              v-else
              appearance="raw"
              :title="$gettext('Deselect %{label}', { label: resolveOptionLabel(option) })"
              :aria-label="$gettext('Deselect %{label}', { label: resolveOptionLabel(option) })"
              class="vs__deselect mx-0"
              no-hover
              @mousedown.stop.prevent
              @click="deselect(option)"
            >
              <oc-icon name="close" size-class="size-4" />
            </oc-button>
          </span>
        </span>
      </template>
      <template #open-indicator>
        <oc-icon name="arrow-down-s" size-class="size-4" />
      </template>
    </vue-select>

    <div
      v-if="fixMessageLine || errorMessage || descriptionMessage"
      class="oc-text-input-message text-sm mt-1 min-h-4.5"
      :class="{
        'oc-text-input-description': !!descriptionMessage,
        'oc-text-input-danger': !!errorMessage
      }"
    >
      <oc-icon
        v-if="errorMessage"
        name="error-warning"
        size-class="size-4"
        fill-type="line"
        aria-hidden="true"
        class="mr-1"
      />
      <span
        :id="`${id}-message`"
        :class="{
          'oc-text-input-description': !!descriptionMessage,
          'oc-text-input-danger': !!errorMessage
        }"
        v-text="errorMessage || descriptionMessage"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Fuse from 'fuse.js'
import { ref, unref, nextTick, watch, computed, onMounted, useTemplateRef } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useEventListener } from '@vueuse/core'
import 'vue-select/dist/vue-select.css'
import { ContextualHelper, uniqueId } from '../../helpers'
// @ts-ignore
import VueSelect from 'vue-select'

export interface Props {
  /**
   * @docs The element ID of the select.
   */
  id?: string
  /**
   * @docs The filter function for the select. Defaults to searching by label.
   */
  filter?: (items: any[], search: string, { label }: { label?: string }) => unknown[]
  /**
   * @docs Determines if the select is disabled.
   * @default false
   */
  disabled?: boolean
  /**
   * @docs The label of the select input.
   */
  label: string
  /**
   * @docs Determines if the label will be displayed next to the select input field.
   * @default false
   * */
  inlineLabel?: boolean
  /**
   * @docs Determines if the label is visually hidden. Note that it will still be read by screen readers.
   * @default false
   */
  labelHidden?: boolean
  /**
   * @docs The contextual helper for the select. Please refer to the component source for the `ContextualHelper` type definition.
   */
  contextualHelper?: ContextualHelper
  /**
   * @docs The label key of the options object.
   * @default label
   */
  optionLabel?: string
  /**
   * @docs The getOptionLabel function of the options object. Takes precedence over the `optionLabel` prop.
   * @default function
   */
  getOptionLabel?: (option: unknown) => string
  /**
   * @docs Determines if the options of the select are searchable.
   * @default true
   */
  searchable?: boolean
  /**
   * @docs Determines if the select is clearable.
   * @default false
   */
  clearable?: boolean
  /**
   * @docs Determines if the select is in a loading state.
   * @default false
   */
  loading?: boolean
  /**
   * @docs The error message to be displayed below the select.
   */
  errorMessage?: string
  /**
   * @docs Determines if the message line should be fixed.
   * @default false
   */
  fixMessageLine?: boolean
  /**
   * @docs The description message to be displayed below the select.
   */
  descriptionMessage?: string
  /**
   * @docs Determines if the select allows multiple selections.
   * @default false
   */
  multiple?: boolean
  /**
   * @docs Determines if the select is read-only.
   * @default false
   */
  readOnly?: boolean
  /**
   * @docs Determines if the dropdown menu should be fixed to the viewport.
   * @default false
   */
  positionFixed?: boolean
  /**
   * @docs Determines if a required mark (*) should be displayed next to the label.
   * @default false
   */
  requiredMark?: boolean
  /**
   * @docs Determines if the select input field has a surrounding border.
   * @default true
   */
  hasBorder?: boolean
}

export interface Emits {
  /**
   * @docs Emitted when the user has typed.
   */
  (e: 'search:input', search: string): void

  /**
   * @docs Emitted when the user has selected an option.
   */
  (e: 'update:modelValue', value: any): void
}

export interface Slots {
  /**
   * @docs Slot for when an option is selected.
   */
  'selected-option'?: (option: any) => any

  /**
   * @docs This component inherits all slots from `vue-select`. See https://vue-select.org/api/slots for more information.
   */
  [dynamicSlot: string]: any
}

const {
  id = uniqueId('oc-select-'),
  filter = (items: unknown[], search: string, { label }: { label?: string }) => {
    if (!search.length) {
      return items
    }

    const fuse = new Fuse(items, {
      ...(label && { keys: [label] }),
      threshold: 0,
      ignoreLocation: true
    })
    return fuse.search(search).map(({ item }) => item)
  },
  disabled = false,
  label,
  inlineLabel = false,
  labelHidden = false,
  contextualHelper,
  optionLabel = 'label',
  getOptionLabel: getOptionLabelProp = null,
  searchable = true,
  clearable = false,
  loading = false,
  errorMessage,
  fixMessageLine = false,
  descriptionMessage,
  multiple = false,
  readOnly = false,
  positionFixed = false,
  requiredMark = false,
  hasBorder = true
} = defineProps<Props>()

const emit = defineEmits<Emits>()
defineSlots<Slots>()

const { $gettext } = useGettext()
const isDisabled = computed(() => disabled || readOnly)
const selectRef = useTemplateRef<typeof VueSelect>('selectRef')

function resolveOptionLabel(option: string | Record<string, unknown>): string {
  if (getOptionLabelProp) {
    return getOptionLabelProp(option)
  }
  return typeof option === 'object' ? ((option[optionLabel] as string) ?? '') : option
}

// the dropdown only opens on explicit user interaction, not when the select gets focused
const dropdownEnabled = ref(false)
const dropdownOpen = computed<boolean>(() => unref(selectRef)?.dropdownOpen)

function dropdownShouldOpen({ noDrop, open, mutableLoading }: Record<string, boolean>) {
  return !noDrop && open && !mutableLoading && unref(dropdownEnabled)
}

// highlights the active option with an outline while navigating via arrow keys
const keyboardNavigation = ref(false)

// vue-select still maps keydown handlers by the deprecated keyCode
const enterKeyCode = 13

function mapKeydown(map: Record<number, (e: KeyboardEvent) => void>) {
  return {
    ...map,
    [enterKeyCode]: (e: KeyboardEvent) => {
      if (!unref(dropdownEnabled)) {
        dropdownEnabled.value = true
        return
      }
      map[enterKeyCode](e)
      unref(selectRef).searchEl.focus()
    }
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    keyboardNavigation.value = true
  }
  if (e.key !== 'Enter' && e.key !== 'Tab') {
    dropdownEnabled.value = true
  }
}

function setDropdownPosition() {
  const menu: HTMLElement = unref(selectRef)?.$refs.dropdownMenu
  if (!menu) {
    return
  }

  const { bottom, left, width } = unref(selectRef).$refs.toggle.getBoundingClientRect()
  Object.assign(menu.style, {
    top: `${bottom + 1}px`,
    left: `${left}px`,
    width: `${width}px`,
    maxHeight: `${window.innerHeight - bottom - 25}px`
  })
}

watch(dropdownOpen, async (open) => {
  if (positionFixed && open) {
    await nextTick()
    setDropdownPosition()
  }
})

if (positionFixed) {
  useEventListener(window, 'resize', setDropdownPosition)
}

onMounted(() => {
  unref(selectRef)
    .$el.querySelector('div:first-child')
    ?.setAttribute('aria-label', `${label} - ${$gettext('Search for option')}`)
})
</script>

<style>
@reference '@opencloud-eu/design-system/tailwind';

/* not layered on purpose, otherwise the unlayered vue-select styles would always win */
.oc-select {
  --vs-font-size: inherit;
  --vs-line-height: inherit;
  --vs-controls-color: var(--oc-role-on-surface);
  --vs-controls--deselect-text-shadow: none;
  --vs-search-input-color: var(--oc-role-on-surface);
  --vs-search-input-placeholder-color: var(--oc-role-outline);
  --vs-selected-bg: var(--oc-role-surface-container);
  --vs-selected-color: var(--oc-role-on-surface);
  --vs-selected-border-color: var(--oc-role-outline-variant);
  --vs-border-radius: var(--radius-sm);
  --vs-dropdown-bg: var(--oc-role-surface);
  --vs-dropdown-color: var(--oc-role-on-surface);
  --vs-dropdown-option-padding: 6px 0.6rem;
  --vs-dropdown-option--active-bg: var(--oc-role-surface-container);
  --vs-dropdown-option--active-color: var(--oc-role-on-surface);
  --vs-disabled-bg: var(--oc-role-surface-container);
  --vs-disabled-color: var(--oc-role-on-surface);
  --vs-actions-padding: 0 4px;

  @apply text-role-on-surface;
}

.oc-select :is(.vs__dropdown-toggle, .vs__dropdown-menu) {
  @apply min-h-9 p-1 -mt-px rounded-sm border border-role-outline-variant bg-role-surface;
}

.oc-select:focus-within :is(.vs__dropdown-toggle, .vs__dropdown-menu) {
  @apply border-role-outline;
}

.oc-select .vs__selected-options {
  @apply p-0;
}

.oc-select .vs__selected-options > * {
  @apply m-0.5;
}

.oc-select :is(.vs__search, .vs__search:focus) {
  @apply z-0 px-1;
}

.oc-select .vs__actions {
  @apply gap-1 cursor-pointer;
}

.oc-select .vs__selected-readonly {
  @apply bg-role-surface-container-low;
}

.oc-select :is(.vs__dropdown-option, .vs__no-options) {
  @apply whitespace-normal rounded-sm;
}

.oc-select .vs__dropdown-option--selected {
  @apply bg-role-secondary-container;
}

.oc-select-keyboard-navigation .vs__dropdown-option--highlight {
  @apply outline outline-role-outline-variant;
}

.oc-select.vs--single.vs--open .vs__selected {
  @apply opacity-80;
}

.oc-select.vs--disabled .vs__dropdown-toggle {
  @apply bg-role-surface-container cursor-not-allowed;
}

.oc-select.vs--disabled .vs__actions {
  @apply opacity-30;
}

.oc-select-no-border .vs__dropdown-toggle {
  @apply border-none bg-transparent;
}

.oc-select-position-fixed .vs__dropdown-menu {
  @apply fixed;
}
</style>
