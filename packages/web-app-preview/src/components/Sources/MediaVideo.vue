<template>
  <video
    ref="video"
    :key="`media-video-${file.id}`"
    controls
    preload="preload"
    :autoplay="isAutoPlayEnabled"
  >
    <source :src="file.url" :type="sourceType" />
  </video>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import { MediaFile } from '../../helpers/types'

const { file, isAutoPlayEnabled = true } = defineProps<{
  file: MediaFile
  isAutoPlayEnabled?: boolean
}>()

const video = useTemplateRef('video')
const resizeVideoDimensions = () => {
  const stageMedia: HTMLElement = document.querySelector('.stage_media')
  video.value.style.maxHeight = `${stageMedia.offsetHeight - 10}px`
  video.value.style.maxWidth = `${stageMedia.offsetWidth - 10}px`
}

const sourceType = computed(() => {
  if (file.mimeType === 'video/quicktime') {
    // QuickTime MOV files often use codecs compatible with MP4 containers,
    // but browsers do not natively recognize the 'video/quicktime' MIME type for playback.
    // Using 'video/mp4' as the MIME type improves compatibility with modern browsers.
    return 'video/mp4'
  }
  return file.mimeType
})

onMounted(() => {
  resizeVideoDimensions()
  window.addEventListener('resize', resizeVideoDimensions)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeVideoDimensions)
})
</script>
