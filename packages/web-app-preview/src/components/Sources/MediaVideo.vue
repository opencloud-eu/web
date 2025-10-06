<template>
  <video
    ref="video"
    :key="`media-video-${file.id}`"
    controls
    preload="preload"
    :autoplay="isAutoPlayEnabled"
  >
    <source :src="file.url" :type="file.mimeType" />
  </video>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import { CachedFile } from '../../helpers/types'

const { file, isAutoPlayEnabled = true } = defineProps<{
  file: CachedFile
  isAutoPlayEnabled?: boolean
}>()

const video = useTemplateRef('video')
const resizeVideoDimensions = () => {
  const stageMedia: HTMLElement = document.querySelector('.stage_media')
  video.value.style.maxHeight = `${stageMedia.offsetHeight - 10}px`
  video.value.style.maxWidth = `${stageMedia.offsetWidth - 10}px`
}

onMounted(() => {
  resizeVideoDimensions()
  window.addEventListener('resize', resizeVideoDimensions)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeVideoDimensions)
})
</script>
