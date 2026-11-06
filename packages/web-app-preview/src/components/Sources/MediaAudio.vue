<template>
  <div class="flex flex-col w-xs">
    <audio
      ref="audio"
      :key="`media-audio-${file.id}`"
      controls
      preload="preload"
      :autoplay="isAutoPlayEnabled"
      @ended="emit('ended')"
      @error="onError"
    >
      <source :src="file.url" :type="sourceType" @error="onError" />
    </audio>
    <p v-if="audioText" class="text-role-on-surface-variant text-sm" v-text="audioText"></p>
  </div>
</template>
<script setup lang="ts">
import { computed, unref, useTemplateRef } from 'vue'
import { MediaFile } from '../../helpers/types'

const { file, isAutoPlayEnabled = true } = defineProps<{
  file: MediaFile
  isAutoPlayEnabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'ended'): void
  (e: 'error'): void
}>()

const audio = useTemplateRef('audio')

function onError(event: Event) {
  // a removed element of the previous file may still report its error
  if (!unref(audio)?.contains(event.target as Node)) {
    return
  }
  emit('error')
}

// Chromium skips sources with the non-standard 'audio/x-flac' type
const sourceType = computed(() => {
  if (file.mimeType?.toLowerCase() === 'audio/x-flac') {
    return 'audio/flac'
  }
  return file.mimeType
})

const audioText = computed(() => {
  if (file.resource.audio?.artist && file.resource.audio?.title) {
    return `${file.resource.audio.artist} - ${file.resource.audio.title}`
  }
  return ''
})
</script>
