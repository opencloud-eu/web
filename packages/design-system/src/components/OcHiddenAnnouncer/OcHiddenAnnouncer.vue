<template>
  <span
    :id="id"
    class="sr-only oc-hidden-announcer"
    :aria-live="level"
    aria-atomic="true"
    v-text="announcement"
  />
</template>

<script setup lang="ts">
import { HTMLAttributes, computed } from 'vue'

export interface Props {
  /**
   * @docs The announcement to be read by screen readers.
   */
  announcement: string
  /**
   * @docs Describes the politeness level for the announcement.
   * @default polite
   */
  level?: HTMLAttributes['aria-live']
}

const { announcement, level = 'polite' } = defineProps<Props>()

const id = computed(
  () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
)
</script>
