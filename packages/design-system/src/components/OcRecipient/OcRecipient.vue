<template>
  <span class="oc-recipient">
    <template v-if="recipient.hasAvatar">
      <oc-spinner
        v-if="recipient.isLoadingAvatar"
        key="recipient-avatar-spinner"
        size="small"
        :aria-label="$gettext('Loading avatar')"
        data-testid="recipient-avatar-spinner"
      />
      <oc-avatar
        v-else
        :key="recipient.avatar || recipient.name"
        data-testid="recipient-avatar"
        class="oc-recipient-avatar"
        :src="recipient.avatar"
        :user-name="recipient.name"
        :width="16.8"
      />
    </template>
    <oc-icon
      v-else-if="recipient.icon && recipient.icon.name"
      class="oc-recipient-icon"
      size="small"
      :name="recipient.icon.name"
      :accessible-label="recipient.icon.label"
      data-testid="recipient-icon"
    />
    <p class="oc-recipient-name" data-testid="recipient-name" v-text="recipient.name" />
    <!-- @slot Append content (actions, additional info, etc.)  -->
    <slot name="append" />
  </span>
</template>

<script setup lang="ts">
import OcAvatar from '../OcAvatar/OcAvatar.vue'
import OcIcon from '../OcIcon/OcIcon.vue'
import OcSpinner from '../OcSpinner/OcSpinner.vue'
import { Recipient } from '../../helpers'

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
  padding: var(--oc-space-xsmall);
  width: auto;

  &-icon > svg {
    fill: var(--oc-role-on-surface);
  }

  &-name {
    color: var(--oc-role-on-surface);
    margin: 0;
    padding: 0;
  }
}
</style>
