<template>
  <oc-emoji-picker @emoji-select="updateSelectedEmoji" />
  <p>Selected emoji: {{ selectedEmoji }}</p>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const selectedEmoji = ref<string>()

const updateSelectedEmoji = (emoji: string) => {
  selectedEmoji.value = emoji
}
</script>
