<template>
  <span class="oc-recipient p-1">
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

<style lang="scss">
.oc-recipient {
  align-items: center;
  background-color: var(--oc-role-surface-container);
  border: 1px solid var(--oc-role-outline);
  border-radius: 6px;
  display: flex;
  gap: var(--oc-space-xsmall);
  justify-content: flex-start;
  width: auto;

  &-icon > svg {
    fill: var(--oc-role-on-surface);
  }

  &-name {
    color: var(--oc-role-on-surface);
  }
}
</style>
