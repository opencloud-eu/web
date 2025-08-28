<template>
  <span>
    <span
      ref="avatarsRef"
      v-oc-tooltip="tooltip"
      class="oc-avatars inline-flex w-fit"
      aria-hidden="true"
      :class="avatarsClasses"
    >
      <slot name="userAvatars" :avatars="avatars" :width="width">
        <template v-if="avatars.length > 0">
          <oc-avatar
            v-for="avatar in avatars"
            :key="avatar.username"
            :src="avatar.avatar"
            :user-name="avatar.displayName"
            :width="width"
            :icon-size="iconSize"
          />
        </template>
      </slot>
      <template v-if="otherItems.length > 0">
        <component
          :is="getAvatarComponentForItem(item)"
          v-for="(item, index) in otherItems"
          :key="item.name + index"
          :name="item.name"
          :width="width"
          :icon-size="iconSize"
        />
      </template>
      <oc-avatar-count v-if="isOverlapping" :count="items.length - maxDisplayed" />
    </span>
    <span v-if="accessibleDescription" class="oc-invisible-sr" v-text="accessibleDescription" />
  </span>
</template>

<script setup lang="ts">
import { computed, onMounted, unref, useTemplateRef } from 'vue'
import OcAvatar from '../OcAvatar/OcAvatar.vue'
import OcAvatarCount from '../OcAvatarCount/OcAvatarCount.vue'
import OcAvatarLink from '../OcAvatarLink/OcAvatarLink.vue'
import OcAvatarGroup from '../OcAvatarGroup/OcAvatarGroup.vue'
import OcAvatarFederated from '../OcAvatarFederated/OcAvatarFederated.vue'
import OcAvatarGuest from '../OcAvatarGuest/OcAvatarGuest.vue'
import { getSizeClass, SizeType } from '../../helpers'

type Item = {
  displayName?: string
  name?: string
  avatarType?: 'user' | 'link' | 'remote' | 'group' | 'guest' | string
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
  /**
   * @docs Determines if the stacked avatars show a hover effect.
   * @default false
   */
  hoverEffect?: boolean
  /**
   * @docs The gap size between the avatars.
   * @default xsmall
   */
  gapSize?: SizeType | 'none'

  /**
   * @docs The icon size of the individual avatars.
   * @default small
   */
  iconSize?: SizeType

  /**
   * @docs The width of the individual avatars.
   * @default 30
   */
  width?: number
}

const {
  items,
  accessibleDescription,
  isTooltipDisplayed = false,
  maxDisplayed,
  stacked = false,
  gapSize = 'xsmall',
  iconSize = 'small',
  width = 30,
  hoverEffect = false
} = defineProps<Props>()

const avatarsRef = useTemplateRef('avatarsRef')

const isOverlapping = computed(() => maxDisplayed && maxDisplayed < items.length)
const avatars = computed(() => {
  const a = items.filter((u) => u.avatarType === 'user')
  if (!isOverlapping.value) {
    return a
  }
  return a.slice(0, maxDisplayed)
})

const otherItems = computed(() => {
  const a = items.filter((u) => u.avatarType !== 'user')
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
  switch (item.avatarType) {
    case 'link':
      return OcAvatarLink
    case 'remote':
      return OcAvatarFederated
    case 'group':
      return OcAvatarGroup
    case 'guest':
      return OcAvatarGuest
  }
}

const hasHoverEffect = computed(() => {
  return stacked && hoverEffect && unref(items).length > 1
})

const avatarsClasses = computed(() => {
  return [
    `oc-avatars-gap-${getSizeClass(gapSize)}`,
    ...(stacked ? ['oc-avatars-stacked'] : []),
    ...(unref(hasHoverEffect) ? ['oc-avatars-hover-effect'] : [])
  ]
})

onMounted(() => {
  if (!unref(avatarsRef) || !unref(hasHoverEffect)) {
    return
  }

  const avatarElements = Array.from(unref(avatarsRef).children)

  avatarElements.forEach((child, index) => {
    ;(child as HTMLElement).style.zIndex = `${900 + index}`
  })
})
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-avatars-stacked > * + * {
    @apply -ml-4;
  }
}
</style>
<style lang="scss">
.oc-avatars {
  box-sizing: border-box;
  flex-flow: row nowrap;

  &-hover-effect {
    > * {
      transition: transform 0.2s ease-out;
    }

    > *:hover {
      z-index: 1000 !important;
      transform: scale(1.1);
    }
  }

  &-gap {
    &-xs {
      gap: var(--oc-space-xsmall);
    }

    &-s {
      gap: var(--oc-space-small);
    }

    &-m {
      gap: var(--oc-space-medium);
    }

    &-l {
      gap: var(--oc-space-large);
    }

    &-xl {
      gap: var(--oc-space-xlarge);
    }
  }
}
</style>
