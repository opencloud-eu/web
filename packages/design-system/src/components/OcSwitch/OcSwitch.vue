<template>
  <span :key="`oc-switch-${checked.toString()}`" class="oc-switch">
    <span :id="labelId" v-text="label" />
    <button
      data-testid="oc-switch-btn"
      class="oc-switch-btn block border border-role-outline rounded-3xl w-8 before:size-3 h-4.5"
      role="switch"
      :aria-checked="checked"
      :aria-labelledby="labelId"
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
}

export interface Emits {
  /**
   * @docs Emitted when the switch has been toggled.
   */
  (e: 'update:checked', value: boolean): void
}

const { checked = false, label, labelId = uniqueId('oc-switch-label-') } = defineProps<Props>()

const emit = defineEmits<Emits>()

const toggle = () => {
  emit('update:checked', !checked)
}
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-switch-btn::before {
    @apply bg-role-on-secondary-container;
  }
  .oc-switch-btn[aria-checked='false'] {
    @apply bg-role-surface-container;
  }
  .oc-switch-btn[aria-checked='true'] {
    @apply bg-role-secondary-container;
  }
}
</style>
<style lang="scss">
.oc-switch {
  gap: var(--oc-space-small);

  &-btn {
    cursor: pointer;
    position: relative;
    transition: background-color 0.25s;

    &::before {
      box-shadow: rgb(0 0 0 / 25%) 0px 0px 2px 1px;
      border-radius: 50%;
      content: '';
      left: 1px;
      position: absolute;
      top: 2px;
      transition: transform 0.25s;
    }

    &[aria-checked='false'] {
      &::before {
        transform: translateX(0);
        left: 2px;
      }
    }

    &[aria-checked='true'] {
      &::before {
        transform: translateX(calc(100% + 2px));
        left: 1px;
      }
    }
  }
}
</style>
