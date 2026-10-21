<template>
  <span class="sr-only oc-hidden-announcer" :aria-live="level" aria-atomic="true" v-text="text" />
</template>

<script setup lang="ts">
import { HTMLAttributes, onBeforeUnmount, ref, watch } from 'vue'

export interface Props {
  /**
   * @docs The announcement to be read by screen readers.
   */
  announcement: string
  /**
   * @docs Change this value to announce the same announcement again, e.g. a counter that gets increased on every action.
   * @default 0
   */
  announcementKey?: string | number
  /**
   * @docs Describes the politeness level for the announcement.
   * @default polite
   */
  level?: HTMLAttributes['aria-live']
}

const { announcement, announcementKey = 0, level = 'polite' } = defineProps<Props>()

// Screen readers only announce a change of the live region's content. Clearing it first and setting
// the text after a short delay makes sure every change gets announced, also the same text again.
const ANNOUNCEMENT_DELAY = 100

const text = ref(announcement || '')
let announcementTimeout: ReturnType<typeof setTimeout>

watch([() => announcement, () => announcementKey], () => {
  clearTimeout(announcementTimeout)
  text.value = ''
  if (!announcement) {
    return
  }
  announcementTimeout = setTimeout(() => {
    text.value = announcement
  }, ANNOUNCEMENT_DELAY)
})

onBeforeUnmount(() => {
  clearTimeout(announcementTimeout)
})
</script>
