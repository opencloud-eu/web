<template>
  <span
    class="oc-spinner inline-block after:block after:bg-transparent after:border after:border-current after:rounded-full after:size-full relative after:relative animate-spin after:content-[''] after:border-b-transparent"
    :class="{
      'size-2': size === 'xsmall',
      'size-4': size === 'small',
      'size-5': size === 'medium',
      'size-8': size === 'large',
      'size-10': size === 'xlarge',
      'size-12': size === 'xxlarge',
      'size-16': size === 'xxxlarge'
    }"
    :aria-label="ariaLabel || undefined"
    :aria-live="ariaLabel ? 'polite' : undefined"
    :aria-hidden="ariaLabel ? undefined : 'true'"
    tabindex="-1"
    :role="ariaLabel ? 'img' : undefined"
  />
</template>

<script setup lang="ts">
import { SizeType } from '../../helpers'

export interface Props {
  /**
   * @docs The aria label of the spinner. It should describe the purpose of the spinner.
   */
  ariaLabel?: string
  /**
   * @docs The size of the spinner.
   * @default medium
   */
  size?: SizeType
}

const { ariaLabel = undefined, size = 'medium' } = defineProps<Props>()
</script>
