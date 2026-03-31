<template>
  <span class="inline-flex items-center" @click="$emit('click', $event)">
    <input
      :id="id"
      v-model="model"
      type="checkbox"
      name="checkbox"
      :class="[
        'oc-checkbox',
        'relative',
        'inline-block',
        'align-middle',
        'm-0.5',
        'border-2',
        'border-role-outline',
        'outline-0',
        'outline-role-secondary',
        'focus-visible:outline',
        'rounded-md',
        'checked:bg-role-primary',
        'checked:border-role-primary',
        'indeterminate:bg-white',
        'bg-transparent',
        'overflow-hidden',
        'cursor-pointer',
        'disabled:opacity-40',
        'disabled:cursor-default',
        'disabled:bg-role-surface-container-low',
        'appearance-none',
        isChecked && 'oc-checkbox-checked bg-white',
        size === 'small' && 'size-3',
        size === 'medium' && 'size-4',
        size === 'large' && 'size-5'
      ]"
      :value="option"
      :disabled="disabled"
      :aria-label="labelHidden ? label : null"
      @keydown.enter="keydownEnter"
    />
    <label
      v-if="!labelHidden"
      :for="id"
      :class="{ 'cursor-pointer': !disabled }"
      class="ml-1"
      v-text="label"
    />
  </span>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { isEqual } from 'lodash-es'
import { uniqueId } from '../../helpers'

export interface Props {
  /**
   * @docs The label of the checkbox element.
   */
  label: string
  /**
   * @docs Determines if the checkbox is disabled.
   *
   */
  disabled?: boolean
  /**
   * @docs The element ID of the checkbox.
   */
  id?: string
  /**
   * @docs Determines if the label is hidden visually. Note that the label will still be read by screen readers.
   * @default false
   */
  labelHidden?: boolean
  /**
   * @docs The option value of the checkbox.
   */
  option?: unknown
  /**
   * @docs The size of the checkbox.
   * @default medium
   */
  size?: 'small' | 'medium' | 'large'
}

export interface Emits {
  /**
   * @docs Emitted when the checkbox has been clicked.
   */
  (e: 'click', event: MouseEvent | KeyboardEvent): void
}

const {
  label,
  disabled = false,
  id = uniqueId('oc-checkbox-'),
  option,
  labelHidden = false,
  size = 'medium'
} = defineProps<Props>()

const emit = defineEmits<Emits>()

const model = defineModel<boolean>()

const isChecked = computed(() => {
  const val = unref(model)
  if (Array.isArray(val)) {
    return val.some((m) => isEqual(m, option))
  }
  return val
})

const keydownEnter = (event: KeyboardEvent) => {
  model.value = !model.value
  emit('click', event)
}
</script>

<style scoped>
.oc-checkbox::before {
  content: '';
  display: block;
  position: absolute;
  inset: 0;
}

.oc-checkbox-checked::before,
.oc-checkbox:checked::before {
  background-color: var(--oc-role-on-primary);
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='4,12.5 9.5,18 20,6'/%3E%3C/svg%3E");
  mask-size: 90%;
  mask-repeat: no-repeat;
  mask-position: center;
}

.oc-checkbox:indeterminate::before {
  background-color: var(--oc-role-on-primary);
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round'%3E%3Cline x1='6' y1='12' x2='18' y2='12'/%3E%3C/svg%3E");
  mask-size: 90%;
  mask-repeat: no-repeat;
  mask-position: center;
}

.oc-checkbox:disabled:checked::before {
  background-color: var(--oc-role-on-surface-variant);
}

.oc-checkbox:disabled:indeterminate::before {
  background-color: var(--oc-role-on-surface-variant);
}
</style>
