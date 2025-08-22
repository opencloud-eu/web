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
  const classes = ['oc-tag', `oc-tag-${getSizeClass(size)}`]

  type === 'router-link' || type === 'a'
    ? classes.push('oc-tag-link')
    : classes.push(`oc-tag-${type}`)
  classes.push(`oc-tag-color-${color}`)
  classes.push(`oc-tag-appearance-${appearance}`)
  if (rounded) {
    classes.push('oc-tag-rounded')
  }
  if (appearance === 'filled') {
    classes.push(`bg-role-${color}`)
    classes.push(`text-role-on-${color}`)
  } else {
    classes.push('bg-role-surface')
    classes.push(`text-role-${color}`)
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
    @apply py-1 px-2 text-sm;
  }
  .oc-tag-l {
    @apply py-2 px-4 text-lg;
  }
}
</style>
<style lang="scss">
.oc-tag {
  align-items: center;
  border: 1px solid var(--oc-role-outline);
  border-radius: 7px;
  box-sizing: border-box;
  display: inline-flex;
  gap: var(--oc-space-xsmall);

  &-m {
    min-height: 2.125rem;
  }

  &-l {
    min-height: 2.75rem;
  }

  &-rounded {
    border-radius: 99px;
  }

  &-link,
  &-button {
    transition: color $transition-duration-short ease-in-out;

    .oc-icon > svg {
      transition: fill $transition-duration-short ease-in-out;
    }
  }

  &-appearance-outline.oc-tag-color-primary {
    border: 1px solid var(--oc-role-primary);
  }
  &-appearance-outline.oc-tag-color-secondary {
    border: 1px solid var(--oc-role-secondary);
  }
  &-appearance-outline.oc-tag-color-tertiary {
    border: 1px solid var(--oc-role-tertiary);
  }
  &-appearance-filled.oc-tag-color-primary {
    border: 1px solid var(--oc-role-on-primary);
  }
  &-appearance-filled.oc-tag-color-secondary {
    border: 1px solid var(--oc-role-on-secondary);
  }
  &-appearance-filled.oc-tag-color-tertiary {
    border: 1px solid var(--oc-role-on-tertiary);
  }
}
</style>
