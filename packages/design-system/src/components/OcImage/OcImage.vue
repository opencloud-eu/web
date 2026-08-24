<template>
  <img
    :src="src"
    :alt="alt"
    :aria-hidden="`${ariaHidden}`"
    :title="title"
    :loading="loadingType"
    :decoding="decoding"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface Props {
  /**
   * @docs The image source URL.
   */
  src: string
  /**
   * @docs The image alt text. Should be provided for screen readers.
   */
  alt?: string
  /**
   * @docs The loading type of the image.
   * @default eager
   */
  loadingType?: 'lazy' | 'eager'
  /**
   * @docs The image title attribute.
   */
  title?: string
  /**
   * @docs The decoding hint of the image. Falls back to the browser default.
   */
  decoding?: 'sync' | 'async' | 'auto'
}

const {
  src,
  alt = '',
  title = undefined,
  loadingType = 'eager',
  decoding = undefined
} = defineProps<Props>()

const ariaHidden = computed(() => alt.length === 0)
</script>
