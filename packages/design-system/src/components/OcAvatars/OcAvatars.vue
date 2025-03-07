<template>
  <span>
    <span
      v-oc-tooltip="tooltip"
      class="oc-avatars"
      :class="{ 'oc-avatars-stacked': stacked }"
      aria-hidden="true"
    >
      <template v-if="avatars.length > 0">
        <oc-avatar
          v-for="avatar in avatars"
          :key="avatar.username"
          :src="avatar.avatar"
          :user-name="avatar.displayName"
          :width="30"
        />
      </template>
      <template v-if="otherItems.length > 0">
        <component
          :is="getAvatarComponentForItem(item)"
          v-for="(item, index) in otherItems"
          :key="item.name + index"
          :name="item.name"
        />
      </template>
      <oc-avatar-count v-if="isOverlapping" :count="items.length - maxDisplayed" />
    </span>
    <span v-if="accessibleDescription" class="oc-invisible-sr" v-text="accessibleDescription" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { shareType } from '../../utils/shareType'
import OcAvatar from '../OcAvatar/OcAvatar.vue'
import OcAvatarCount from '../OcAvatarCount/OcAvatarCount.vue'
import OcAvatarLink from '../OcAvatarLink/OcAvatarLink.vue'
import OcAvatarGroup from '../OcAvatarGroup/OcAvatarGroup.vue'
import OcAvatarFederated from '../OcAvatarFederated/OcAvatarFederated.vue'
import OcAvatarGuest from '../OcAvatarGuest/OcAvatarGuest.vue'

type Item = {
  displayName?: string
  name?: string
  shareType?: number
  username?: string
  avatar?: string
}

export interface Props {
  /**
   * @docs List of items to display. Please refer to the component source for the `Item` type definition.
   */
  items: Item[]
  /**
   * @docs Accessible description for the component.
   */
  accessibleDescription?: string
  /**
   * @docs Determines if the tooltip is displayed when hovering over the component.
   * @default false
   */
  isTooltipDisplayed?: boolean
  /**
   * @docs Maximum number of items to display. If the number of items is greater than this value, a `+X` counter will be displayed.
   */
  maxDisplayed?: number
  /**
   * @docs Determines if the avatars are displayed in a stacked layout.
   * @default false
   */
  stacked?: boolean
}

const {
  items,
  accessibleDescription,
  isTooltipDisplayed = false,
  maxDisplayed,
  stacked = false
} = defineProps<Props>()

const isOverlapping = computed(() => maxDisplayed && maxDisplayed < items.length)

const avatars = computed(() => {
  const a = items.filter((u) => u.shareType === shareType.user)
  if (!isOverlapping.value) {
    return a
  }
  return a.slice(0, maxDisplayed)
})

const otherItems = computed(() => {
  const a = items.filter((u) => u.shareType !== shareType.user)
  if (!isOverlapping.value) {
    return a
  }
  if (maxDisplayed! <= avatars.value.length) {
    return []
  }
  return a.slice(0, maxDisplayed! - avatars.value.length)
})

const tooltip = computed(() => {
  if (isTooltipDisplayed) {
    const names = avatars.value.map((user) => user.displayName)

    if (otherItems.value.length > 0) {
      names.push(...otherItems.value.map((item) => item.name))
    }

    let tooltip = names.join(', ')

    if (isOverlapping.value) {
      tooltip += ` +${items.length - maxDisplayed}`
    }

    return tooltip
  }

  return null
})

const getAvatarComponentForItem = (item: Item) => {
  switch (item.shareType) {
    case shareType.link:
      return OcAvatarLink
    case shareType.remote:
      return OcAvatarFederated
    case shareType.group:
      return OcAvatarGroup
    case shareType.guest:
      return OcAvatarGuest
  }
}
</script>

<style lang="scss">
.oc-avatars {
  display: inline-flex;
  box-sizing: border-box;
  flex-flow: row nowrap;
  gap: var(--oc-space-xsmall);
  width: fit-content;

  &-stacked {
    .oc-avatar + .oc-avatar,
    .oc-avatar-count,
    .oc-avatar + .oc-avatar-item,
    .oc-avatar-item + .oc-avatar-item {
      border: 1px solid var(--oc-role-outline);
      margin-left: -25px;
    }
  }
}
</style>
