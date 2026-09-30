<template>
  <component
    :is="tag"
    v-bind="tagAttrs"
    :aria-current="current ? 'page' : null"
    :class="{ 'text-role-on-surface': !item.onClick, 'font-bold': current && isInteractive }"
  >
    <span :class="[textClass, { 'hover:underline': isInteractive }]">
      <oc-icon
        v-if="item.icon"
        :name="item.icon"
        :accessible-label="item.iconAccessibleLabel || ''"
        fill-type="line"
        class="align-sub"
        size-class="size-4"
      />
      {{ item.text }}
    </span>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BreadcrumbItem } from '../../helpers'
import OcButton from '../OcButton/OcButton.vue'
import OcIcon from '../OcIcon/OcIcon.vue'

export interface Props {
  /**
   * @docs The breadcrumb item to render.
   */
  item: BreadcrumbItem
  /**
   * @docs Whether the item is the current (last) breadcrumb item.
   * @default false
   */
  current?: boolean
  /**
   * @docs The component to use for router links.
   * @default router-link
   */
  routerLinkComponent?: 'router-link' | 'nuxt-link'
  /**
   * @docs Additional classes for the element holding the item text.
   */
  textClass?: string
}

const {
  item,
  current = false,
  routerLinkComponent = 'router-link',
  textClass = ''
} = defineProps<Props>()

const isInteractive = computed(() => !!(item.to || item.onClick))

const tag = computed(() => {
  if (item.to) {
    return routerLinkComponent
  }
  if (item.onClick) {
    return OcButton
  }
  return 'span'
})

const tagAttrs = computed(() => {
  if (item.to) {
    return { to: item.to }
  }
  if (item.onClick) {
    return {
      appearance: 'raw-inverse',
      colorRole: 'surface',
      noHover: true,
      onClick: item.onClick
    }
  }
  return { tabindex: -1 }
})
</script>
