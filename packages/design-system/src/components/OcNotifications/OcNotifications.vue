<template>
  <div
    class="oc-notification z-1040 w-md max-w-full"
    :class="{
      fixed: position !== 'default',
      'top-2 left-2': position === 'top-left',
      'top-2 inset-x-0 mx-auto': position === 'top-center',
      'top-2 right-2': position === 'top-right'
    }"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
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
</script>
