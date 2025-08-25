<template>
  <span
    class="oc-recipient bg-role-surface-container flex align-center justify-center border border-role-outline rounded-md"
  >
    <slot name="avatar">
      <oc-avatar-item
        :width="16.8"
        :icon="recipient.icon.name"
        :name="recipient.icon.label"
        :accessible-label="recipient.icon.label"
        icon-size="xsmall"
        data-testid="recipient-icon"
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
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-recipient {
    @apply p-1;
  }
}
</style>
<style lang="scss">
.oc-recipient {
  gap: var(--oc-space-xsmall);
  width: auto;

  &-icon > svg {
    fill: var(--oc-role-on-surface);
  }
}
</style>
