<template>
  <div class="emoji-picker-modal-content">
    <oc-emoji-picker :theme="theme" @emoji-select="onEmojiSelect" />
  </div>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { Modal, useThemeStore } from '../../composables'
import { storeToRefs } from 'pinia'

defineProps<{
  modal: Modal
}>()

const emit = defineEmits<{
  (e: 'confirm', emoji: string): void
}>()

const themeStore = useThemeStore()
const { currentTheme } = storeToRefs(themeStore)

const theme = computed(() => {
  return unref(currentTheme).isDark ? 'dark' : 'light'
})

const onEmojiSelect = (emoji: string) => {
  emit('confirm', emoji)
}
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer utilities {
  .oc-modal:has(.emoji-picker-modal-content) {
    width: fit-content;
    max-width: fit-content;
  }

  .oc-modal:has(.emoji-picker-modal-content) .oc-modal-body {
    @apply p-0;
  }

  .oc-modal:has(.emoji-picker-modal-content) .oc-modal-body-message {
    @apply m-0;
  }
}
</style>
