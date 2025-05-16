<template>
  <component :is="type" :class="tagClasses" :to="to" @click="$_ocTag_click">
    <!-- @slot Content of the tag -->
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getSizeClass } from '../../helpers'
import { RouteLocationRaw } from 'vue-router'

export interface Props {
  /**
   * @docs The type of the tag element.
   * @default span
   */
  type?: 'span' | 'button' | 'router-link' | 'a'
  /**
   * @docs The route to navigate to if the `type` is set to `router-link`.
   */
  to?: string | RouteLocationRaw
  /**
   * @docs The size of the tag.
   * @default medium
   */
  size?: 'small' | 'medium' | 'large'
  /**
   * @docs Determines if the tag should be rounded.
   * @default false
   */
  rounded?: boolean
  /**
   * @docs The color of the tag.
   */
  color?: 'default' | 'warning' | 'custom-purple'
}

export interface Emits {
  /**
   * @docs Emitted when the tag has been clicked.
   */
  (e: 'click', event: MouseEvent): void
}

export interface Slots {
  /**
   * @docs Content of the tag.
   */
  default?: () => unknown
}

const {
  type = 'span',
  to = '',
  size = 'medium',
  rounded = false,
  color = 'default'
} = defineProps<Props>()

const emit = defineEmits<Emits>()
defineSlots<Slots>()

const tagClasses = computed(() => {
  const classes = ['oc-tag', `oc-tag-${getSizeClass(size)}`]

  type === 'router-link' || type === 'a'
    ? classes.push('oc-tag-link')
    : classes.push(`oc-tag-${type}`)

  if (rounded) {
    classes.push('oc-tag-rounded')
  }
  if (color && color !== 'default') {
    classes.push(`oc-tag-color-${color}`)
  }

  return classes
})

function $_ocTag_click(event: MouseEvent) {
  emit('click', event)
}
</script>

<style lang="scss">
.oc-tag {
  align-items: center;
  background-color: var(--oc-role-surface);
  border: 1px solid var(--oc-role-outline);
  border-radius: 7px;
  box-sizing: border-box;
  display: inline-flex;
  gap: var(--oc-space-xsmall);
  text-decoration: none;

  &-s {
    font-size: 0.75rem;
    padding: var(--oc-space-xsmall);
  }

  &-m {
    font-size: 0.875rem;
    min-height: 2.125rem;
    padding: var(--oc-space-xsmall) var(--oc-space-small);
  }

  &-l {
    font-size: 1.5rem;
    min-height: 2.75rem;
    padding: var(--oc-space-small) var(--oc-space-medium);
  }

  &-rounded {
    border-radius: 99px;
    padding-left: var(--oc-space-small);
    padding-right: var(--oc-space-small);
  }

  &-link,
  &-button {
    transition: color $transition-duration-short ease-in-out;

    .oc-icon > svg {
      transition: fill $transition-duration-short ease-in-out;
    }
  }
}

.oc-tag-color-custom-purple {
  background-color: #ca8df5;
  color: white;
}
</style>
