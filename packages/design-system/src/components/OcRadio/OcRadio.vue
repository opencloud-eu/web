<template>
  <span>
    <input
      :id="id"
      v-model="model"
      type="radio"
      name="radio"
      :class="classes"
      :aria-checked="option === modelValue"
      :value="option"
      :disabled="disabled"
    />
    <label :for="id" :class="labelClasses" v-text="label" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getSizeClass, uniqueId } from '../../helpers'

export interface Props {
  /**
   * @docs The label of the radio button.
   */
  label: string
  /**
   * @docs Determines if the radio button is disabled.
   * @default false
   */
  disabled?: boolean
  /**
   * @docs Determines if the label should be visually hidden. Note that it will still be accessible to screen readers.
   * @default false
   */
  hideLabel?: boolean
  /**
   * @docs The element ID of the radio button.
   */
  id?: string
  /**
   * @docs The value of the radio button.
   */
  option?: unknown
  /**
   * @docs The size of the radio button.
   * @default medium
   */
  size?: 'small' | 'medium' | 'large'
}

const {
  label,
  disabled = false,
  hideLabel = false,
  id = uniqueId('oc-radio-'),
  option,
  size = 'medium'
} = defineProps<Props>()

const model = defineModel<boolean | unknown>()

const classes = computed(() => ['oc-radio', 'oc-radio-' + getSizeClass(size)])

const labelClasses = computed(() => ({
  'oc-invisible-sr': hideLabel,
  'oc-cursor-pointer': !disabled
}))
</script>

<style lang="scss">
@mixin oc-form-check-size($factor) {
  height: $oc-size-form-check-default * $factor;
  width: $oc-size-form-check-default * $factor;
}

.oc-radio {
  -webkit-appearance: none;
  -moz-appearance: none;

  border: 1px solid var(--oc-role-outline-variant);
  border-radius: 50%;
  box-sizing: border-box;
  background-position: 50% 50%;
  background-repeat: no-repeat;

  display: inline-block;
  margin: 0;
  overflow: hidden;

  transition: 0.2s ease-in-out;
  transition-property: background-color, border;
  vertical-align: middle;
  width: 1rem;

  &:not(:disabled) {
    cursor: pointer;
  }

  &:checked {
    background-color: var(--oc-role-secondary-container) !important;
  }

  &.oc-radio-s {
    @include oc-form-check-size(0.7);
  }

  &.oc-radio-m {
    @include oc-form-check-size(1);
  }

  &.oc-radio-l {
    @include oc-form-check-size(1.5);
  }
}

label > .oc-radio + span {
  margin-left: var(--oc-space-xsmall);
}
</style>
