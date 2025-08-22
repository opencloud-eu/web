<template>
  <span :key="`oc-switch-${checked.toString()}`" class="oc-switch">
    <span :id="labelId" v-text="label" />
    <button
      data-testid="oc-switch-btn"
      class="oc-switch-btn border border-role-outline"
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
  align-items: center;
  display: inline-flex;
  gap: var(--oc-space-small);

  &-btn {
    border-radius: 20px;
    cursor: pointer;
    display: block;
    height: 18px;
    position: relative;
    transition: background-color 0.25s;
    width: 31px;

    &::before {
      box-shadow: rgb(0 0 0 / 25%) 0px 0px 2px 1px;
      border-radius: 50%;
      content: '';
      height: 12px;
      left: 1px;
      position: absolute;
      top: 2px;
      transition: transform 0.25s;
      width: 12px;
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
