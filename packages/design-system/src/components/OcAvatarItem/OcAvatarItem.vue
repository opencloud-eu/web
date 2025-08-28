<template>
  <div
    :data-test-item-name="name"
    :aria-label="accessibleLabel === '' ? null : accessibleLabel"
    :aria-hidden="accessibleLabel === '' ? 'true' : null"
    :focusable="accessibleLabel === '' ? 'false' : null"
    :role="accessibleLabel === '' ? null : 'img'"
  >
    <span
      class="oc-avatar-item inline-flex items-center justify-center rounded-[50%]"
      :style="{
        backgroundColor,
        '--icon-color': iconColor,
        width: avatarWidth,
        height: avatarWidth
      }"
    >
      <oc-icon v-if="hasIcon" :name="icon" :size="iconSize" :fill-type="iconFillType" />
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import OcIcon from '../OcIcon/OcIcon.vue'
import { FillType, SizeType } from '../../helpers'

export interface Props {
  /**
   * @docs The name of the avatar item. This will not be displayed on the screen however.
   */
  name: string
  /**
   * @docs The accessible label for the avatar item. Only needed in case the item is used alone. If not specified, the item will get `aria-hidden="true"`.
   */
  accessibleLabel?: string
  /**
   * @docs The background color of the avatar item.
   * @default var(--oc-role-secondary)
   */
  background?: string
  /**
   * @docs The icon to be displayed in the avatar item. Please refer to the `OcIcon` component to see how to use icon names.
   */
  icon?: string
  /**
   * @docs The color of the icon.
   * @default var(--oc-role-on-secondary)
   */
  iconColor?: string
  /**
   * @docs The fill type of the icon.
   * @default 'fill'
   */
  iconFillType?: FillType
  /**
   * @docs The size of the icon.
   * @default 'small'
   */
  iconSize?: SizeType
  /**
   * @docs The width of the avatar item.
   * @default 30
   */
  width?: number
}

const {
  name,
  accessibleLabel = '',
  background = 'var(--oc-role-secondary)',
  icon,
  iconColor = 'var(--oc-role-on-secondary)',
  iconFillType = 'fill',
  iconSize = 'small',
  width = 30
} = defineProps<Props>()

const avatarWidth = computed(() => width + 'px')
const hasIcon = computed(() => icon !== null)
const backgroundColor = computed(() => background || pickBackgroundColor())

const pickBackgroundColor = () => {
  const backgroundColors = [
    '#b82015',
    '#c21c53',
    '#9C27B0',
    '#673AB7',
    '#3F51B5',
    '#106892',
    '#055c68',
    '#208377',
    '#1a761d',
    '#476e1a',
    '#636d0b',
    '#8e5c11',
    '#795548',
    '#465a64'
  ]
  return backgroundColors[Math.floor(Math.random() * backgroundColors.length)]
}
</script>

<style lang="scss">
.oc-avatar-item {
  background-position: center;
  background-repeat: no-repeat;
  background-size: 18px;

  .oc-icon > svg {
    fill: var(--icon-color) !important;
  }
}
</style>
