<template>
  <component
    :is="type"
    class="oc-tag inline-flex items-center border gap-1"
    :class="[
      ...appearanceClasses,
      {
        // rounded
        'rounded-full px-2': rounded,
        'rounded-lg': !rounded,
        // size
        'p-1 text-xs': size === 'small',
        'py-1 px-2 text-sm min-h-6': size === 'medium',
        'py-2 px-4 text-lg min-h-8': size === 'large',
        // transition for links and buttons
        'ease-in-out duration-200 transition-colors [&_svg]:ease-in-out [&_svg]:duration-200 [&_svg]:transition-colors':
          ['link', 'button'].includes(type)
      }
    ]"
    :to="to"
    @click="onClick"
  >
    <!-- @slot Content of the tag -->
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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

const appearanceClasses = computed(() => {
  const classes: string[] = []

  if (appearance === 'outline') {
    classes.push('bg-role-surface')
    switch (color) {
      case 'primary':
        classes.push('text-role-primary', 'border-role-primary')
        break
      case 'secondary':
        classes.push('text-role-secondary', 'border-role-secondary')
        break
      case 'tertiary':
        classes.push('text-role-tertiary', 'border-role-tertiary')
        break
    }
    return classes
  }

  switch (color) {
    case 'primary':
      classes.push('bg-role-primary', 'text-role-on-primary', 'border-role-primary')
      break
    case 'secondary':
      classes.push('bg-role-secondary', 'text-role-on-secondary', 'border-role-secondary')
      break
    case 'tertiary':
      classes.push('bg-role-tertiary', 'text-role-on-tertiary', 'border-role-tertiary')
      break
  }
  return classes
})

function onClick(event: MouseEvent) {
  emit('click', event)
}
</script>
