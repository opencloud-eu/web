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
   * @default secondary
   */
  color?: 'primary' | 'secondary' | 'tertiary'
  /**
   * @docs The appearance of the button.
   * @default outline
   */
  appearance?: 'outline' | 'filled'
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
  color = 'secondary',
  appearance = 'outline'
} = defineProps<Props>()

const emit = defineEmits<Emits>()
defineSlots<Slots>()

const tagClasses = computed(() => {
  const classes = [
    'oc-tag',
    'inline-flex',
    'items-center',
    `oc-tag-${getSizeClass(size)}`,
    'border'
  ]

  type === 'router-link' || type === 'a'
    ? classes.push('oc-tag-link')
    : classes.push(`oc-tag-${type}`)
  classes.push(`oc-tag-color-${color}`)
  classes.push(`oc-tag-appearance-${appearance}`)
  if (rounded) {
    classes.push('rounded-full')
  } else {
    classes.push('rounded-lg')
  }
  if (appearance === 'filled') {
    classes.push(`bg-role-${color}`)
    classes.push(`text-role-on-${color}`)
    classes.push(`border-role-on-${color}`)
  } else {
    classes.push('bg-role-surface')
    classes.push(`text-role-${color}`)
    classes.push(`border-role-${color}`)
  }

  return classes
})

function $_ocTag_click(event: MouseEvent) {
  emit('click', event)
}
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-tag-rounded {
    @apply px-2;
  }
  .oc-tag-s {
    @apply p-1 text-xs;
  }
  .oc-tag-m {
    @apply py-1 px-2 text-sm min-h-6;
  }
  .oc-tag-l {
    @apply py-2 px-4 text-lg min-h-8;
  }
}
</style>
<style lang="scss">
.oc-tag {
  box-sizing: border-box;
  gap: var(--oc-space-xsmall);

  &-link,
  &-button {
    transition: color $transition-duration-short ease-in-out;

    .oc-icon > svg {
      transition: fill $transition-duration-short ease-in-out;
    }
  }
}
</style>
