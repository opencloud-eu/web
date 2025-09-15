<template>
  <span>
    <input
      :id="id"
      v-model="model"
      type="radio"
      name="radio"
      :class="{
        'size-3': size === 'small',
        'size-4': size === 'medium',
        'size-5': size === 'large'
      }"
      class="oc-radio checked:bg-role-secondary-container border rounded-[50%] focus:outline-0 overflow-hidden m-0 inline-block transition-[background-color,border] duration-200 ease-in-out not-disabled:cursor-pointer bg-no-repeat bg-center appearance-none"
      :aria-checked="option === modelValue"
      :value="option"
      :disabled="disabled"
    />
    <label
      :for="id"
      :class="{ 'cursor-pointer': !disabled, 'sr-only': hideLabel }"
      class="ml-1"
      v-text="label"
    />
  </span>
</template>

<script setup lang="ts">
import { uniqueId } from '../../helpers'

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
</script>
<style scoped>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-radio {
    @apply align-middle;
  }
}
</style>
