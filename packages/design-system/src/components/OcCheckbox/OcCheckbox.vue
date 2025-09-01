<template>
  <span @click="$emit('click', $event)">
    <input
      :id="id"
      v-model="model"
      type="checkbox"
      name="checkbox"
      class="oc-checkbox m-0.5 border-2 border-role-outline outline-0 focus-visible:outline outline-role-secondary rounded-sm checked:bg-white disabled:bg-role-surface-container-low indeterminate:bg-white bg-transparent inline-block overflow-hidden"
      :class="{
        'oc-checkbox-checked': isChecked,
        'bg-white': isChecked,
        'size-3': size === 'small',
        'size-4': size === 'medium',
        'size-5': size === 'large'
      }"
      :value="option"
      :disabled="disabled"
      :aria-label="labelHidden ? label : null"
      @keydown.enter="keydownEnter"
    />
    <label v-if="!labelHidden" :for="id" :class="labelClasses" class="ml-1" v-text="label" />
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

const model = defineModel<boolean | unknown[]>()

const labelClasses = computed(() => ({
  'oc-cursor-pointer': !disabled
}))

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
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-checkbox {
    @apply align-middle;
  }
}
</style>
<style lang="scss">
.oc-checkbox {
  -webkit-appearance: none;
  -moz-appearance: none;

  background-position: 50% 50% !important;
  background-repeat: no-repeat !important;

  &:hover {
    cursor: pointer;
  }

  &-checked,
  :checked {
    @include svg-fill($internal-form-checkbox-image, '#000', '#000');
  }

  &:indeterminate {
    @include svg-fill($internal-form-checkbox-indeterminate-image, '#000', '#000');
  }

  &:disabled {
    cursor: default;
    opacity: 0.4;
  }

  &:disabled:checked {
    @include svg-fill($internal-form-checkbox-image, '#000', $form-radio-disabled-icon-color);
  }

  &:disabled:indeterminate {
    @include svg-fill(
      $internal-form-checkbox-indeterminate-image,
      '#000',
      $form-radio-disabled-icon-color
    );
  }
}
</style>
