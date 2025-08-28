<template>
  <div class="oc-notification mb-2 w-md max-w-full" :class="classes">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface Props {
  /**
   * @docs The position of the notification.
   * @default default
   */
  position?: 'default' | 'top-left' | 'top-center' | 'top-right'
}

export interface Slots {
  /**
   * @docs The content of the notification. This is usually the `OcNotificationMessage` component.
   */
  default?: () => unknown
}

const { position = 'default' } = defineProps<Props>()
defineSlots<Slots>()

const classes = computed(() =>
  [`oc-notification-${position}`, position !== 'default' ? 'fixed' : ''].join(' ')
)
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-notification-top-center {
    @apply mx-auto;
  }
}
</style>
<style lang="scss">
.oc-notification {
  box-sizing: border-box;
  z-index: 1040;

  &-top-left {
    top: var(--oc-space-small);
    left: var(--oc-space-small);
  }

  &-top-center {
    top: var(--oc-space-small);
    left: 0;
    right: 0;
  }

  &-top-right {
    top: var(--oc-space-small);
    right: var(--oc-space-small);
  }
}
</style>
