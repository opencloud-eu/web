<template>
  <div class="flex flex-col w-xs">
    <audio
      :key="`media-audio-${file.id}`"
      controls
      preload="preload"
      :autoplay="isAutoPlayEnabled"
      @ended="$emit('ended')"
    >
      <source :src="file.url" :type="file.mimeType" />
    </audio>
    <p v-if="audioText" class="text-role-on-surface-variant text-sm" v-text="audioText"></p>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { MediaFile } from '../../helpers/types'

const { file, isAutoPlayEnabled = true } = defineProps<{
  file: MediaFile
  isAutoPlayEnabled?: boolean
}>()

defineEmits<{
  (e: 'ended'): void
}>()

const audioText = computed(() => {
  if (file.resource.audio?.artist && file.resource.audio?.title) {
    return `${file.resource.audio.artist} - ${file.resource.audio.title}`
  }
  return ''
})
</script>
