<template>
  <span
    class="oc-range-wrapper flex w-full"
    :class="[
      inlineLabel ? 'items-center justify-between gap-3' : 'flex-col gap-2',
      hideLabel && 'gap-0',
      $attrs.class
    ]"
  >
    <label :for="id" :class="{ 'sr-only': hideLabel }" v-text="label" />
    <input
      :id="id"
      v-bind="inputAttributes"
      :value="modelValue"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      class="oc-range h-1.5 appearance-none rounded-sm bg-role-surface-container-high outline-0 outline-role-secondary hover:opacity-100 focus-visible:outline not-disabled:cursor-pointer disabled:cursor-not-allowed"
      :class="[inlineLabel ? 'grow basis-0' : 'w-full', inputClass]"
      @input="onInput"
      @change="onChange"
    />
  </span>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { omit } from 'lodash-es'
import { uniqueId } from '../../helpers'

defineOptions({
  inheritAttrs: false
})

export interface Props {
  /**
   * @docs The label of the range input.
   */
  label: string
  /**
   * @docs The minimum value of the range input.
   */
  min: number
  /**
   * @docs The maximum value of the range input.
   */
  max: number
  /**
   * @docs The element ID of the range input.
   */
  id?: string
  /**
   * @docs The value of the range input.
   */
  modelValue?: number
  /**
   * @docs The step interval of the range input.
   */
  step?: number
  /**
   * @docs Determines if the range input is disabled.
   * @default false
   */
  disabled?: boolean
  /**
   * @docs Determines if the label will be displayed next to the range input.
   * @default false
   */
  inlineLabel?: boolean
  /**
   * @docs Determines if the label should be visually hidden. Note that it will still be accessible to screen readers.
   * @default false
   */
  hideLabel?: boolean
  /**
   * @docs The classes to be applied on the range input itself, e.g. to constrain its width.
   * @default ''
   */
  inputClass?: string | string[] | Record<string, boolean> | Record<string, boolean>[]
}

export interface Emits {
  /**
   * @docs Emitted when the range value has updated.
   */
  (event: 'update:modelValue', value: number): void
  /**
   * @docs Emitted when the range value has changed.
   */
  (event: 'change', value: number): void
}

const {
  id = uniqueId('oc-range-'),
  label,
  modelValue = 0,
  min,
  max,
  step = 1,
  disabled = false,
  inlineLabel = false,
  hideLabel = false,
  inputClass = ''
} = defineProps<Props>()

const emit = defineEmits<Emits>()
const attrs = useAttrs()

// the class is bound to the wrapper, everything else falls through to the input
const inputAttributes = computed(() => omit(attrs, 'class'))

function getEventValue(event: Event): number {
  return Number((event.target as HTMLInputElement).value)
}

function onInput(event: Event) {
  emit('update:modelValue', getEventValue(event))
}

function onChange(event: Event) {
  emit('change', getEventValue(event))
}
</script>

<style scoped>
.oc-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  background: var(--oc-role-on-surface);
  border-radius: 50%;
  cursor: pointer;
  height: 1rem;
  width: 1rem;
}

.oc-range:disabled::-webkit-slider-thumb {
  background: var(--oc-role-on-surface-variant);
  cursor: not-allowed;
}

.oc-range::-moz-range-thumb {
  background: var(--oc-role-on-surface);
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  height: 1rem;
  width: 1rem;
}

.oc-range:disabled::-moz-range-thumb {
  background: var(--oc-role-on-surface-variant);
  cursor: not-allowed;
}
</style>
