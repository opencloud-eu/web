<template>
  <span
    :key="`oc-switch-${checked.toString()}`"
    class="oc-switch items-center gap-2"
    :class="{ 'opacity-40': disabled }"
  >
    <span :id="labelId" v-text="label" />
    <button
      data-testid="oc-switch-btn"
      class="oc-switch-btn block relative border border-role-outline rounded-3xl w-8 before:size-3 h-4.5 disabled:cursor-default"
      :class="{ 'cursor-pointer': !disabled }"
      role="switch"
      :aria-checked="checked"
      :aria-labelledby="labelId"
      :disabled="disabled"
      @click="toggle"
    />
  </span>
</template>

<script setup lang="ts">
import { uniqueId } from '../../helpers'

export interface Props {
  /**
   * @docs Determines if the switch is checked.
   */
  checked?: boolean
  /**
   * @docs The label of the switch.
   */
  label: string
  /**
   * @docs The element ID of the label.
   */
  labelId?: string
  /**
   * @docs Determines if the switch is disabled.
   */
  disabled?: boolean
}

export interface Emits {
  /**
   * @docs Emitted when the switch has been toggled.
   */
  (e: 'update:checked', value: boolean): void
}

const {
  checked = false,
  label,
  labelId = uniqueId('oc-switch-label-'),
  disabled = false
} = defineProps<Props>()

const emit = defineEmits<Emits>()

const toggle = () => {
  if (disabled) {
    return
  }
  emit('update:checked', !checked)
}
</script>
<style scoped>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-switch-btn::before {
    @apply bg-role-on-secondary-container absolute;
    left: 1px;
    top: 2px;
    content: '';
    border-radius: 50%;
  }
  .oc-switch-btn[aria-checked='false'] {
    @apply bg-role-surface-container;
    left: 2px;
  }
  .oc-switch-btn[aria-checked='true'] {
    @apply bg-role-secondary-container;
    left: 1px;
  }
  .oc-switch-btn[aria-checked='false']::before {
    transform: translateX(0);
  }
  .oc-switch-btn[aria-checked='true']::before {
    transform: translateX(calc(100% + 2px));
  }
}
</style>
