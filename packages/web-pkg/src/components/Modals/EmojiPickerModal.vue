<template>
  <oc-emoji-picker :theme="theme" @emoji-select="onEmojiSelect" />
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
