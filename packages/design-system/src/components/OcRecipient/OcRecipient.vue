<template>
  <span
    class="oc-recipient bg-role-surface-container flex items-center justify-center outline outline-role-outline rounded-md"
  >
    <slot name="avatar">
      <oc-avatar-item
        :width="16.8"
        :icon="recipient.icon.name"
        :name="recipient.icon.label"
        :accessible-label="recipient.icon.label"
        icon-size="xsmall"
        data-testid="recipient-icon"
        icon-color="var(--oc-role-on-surface)"
      />
    </slot>
    <p class="oc-recipient-name m-0" data-testid="recipient-name" v-text="recipient.name" />
    <!-- @slot Append content (actions, additional info, etc.)  -->
    <slot name="append" />
  </span>
</template>

<script setup lang="ts">
import { Recipient } from '../../helpers'
import OcAvatarItem from '../OcAvatarItem/OcAvatarItem.vue'

export interface Props {
  /**
   * @docs The recipient object. Please refer to the component source for the `Recipient` type definition.
   */
  recipient: Recipient
}

export interface Slots {
  /**
   * @docs Append content for additional info.
   */
  append?: () => unknown
  avatar?: () => unknown
}

const { recipient } = defineProps<Props>()
defineSlots<Slots>()
</script>
<style scoped>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-recipient {
    @apply p-1 w-auto gap-1;
  }
}
</style>
