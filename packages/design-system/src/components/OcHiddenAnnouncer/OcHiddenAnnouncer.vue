<template>
  <span class="sr-only oc-hidden-announcer" :aria-live="level" aria-atomic="true" v-text="text" />
</template>

<script setup lang="ts">
import { HTMLAttributes, onBeforeUnmount, ref, watch } from 'vue'

export interface Props {
  /**
   * @docs The announcement to be read by screen readers. Every change of it gets announced. Use the exposed `announce` method to announce a message on an action, also the same text again.
   * @default ''
   */
  announcement?: string
  /**
   * @docs Describes the politeness level for the announcement.
   * @default polite
   */
  level?: HTMLAttributes['aria-live']
}

const { announcement = '', level = 'polite' } = defineProps<Props>()

// Screen readers only announce a change of the live region's content. Clearing it first and setting
// the text after a short delay makes sure every announcement gets read, also the same text again.
const ANNOUNCEMENT_DELAY = 100

const text = ref(announcement)
let announcementTimeout: ReturnType<typeof setTimeout>

function announce(message: string) {
  clearTimeout(announcementTimeout)
  text.value = ''
  if (!message) {
    return
  }
  announcementTimeout = setTimeout(() => {
    text.value = message
  }, ANNOUNCEMENT_DELAY)
}

watch(
  () => announcement,
  (value) => {
    announce(value)
  }
)

onBeforeUnmount(() => {
  clearTimeout(announcementTimeout)
})

defineExpose({ announce })
</script>
