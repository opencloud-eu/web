<template>
  <video
    ref="video"
    :key="`media-video-${file.id}`"
    controls
    preload="preload"
    :autoplay="isAutoPlayEnabled"
    @error="onError"
    @canplay="onCanPlay"
  >
    <source :src="file.url" :type="sourceType" @error="onError" />
  </video>
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, unref, useTemplateRef, watch } from 'vue'
import { MediaFile } from '../../helpers/types'

const { file, isAutoPlayEnabled = true } = defineProps<{
  file: MediaFile
  isAutoPlayEnabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'reload-url'): void
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

// blob URLs (e.g. vault files) don't expire, so a retry can't fix them
const isSignedUrl = computed(() => !!file.url && !file.url.startsWith('blob:'))

// retry a video on error after updating the source with a new signed URL
let isRetryInProgress = false
let resumeTime = 0
let resumePlaying = false

function onCanPlay() {
  isRetryInProgress = false
}

function onError() {
  if (isRetryInProgress || !unref(isSignedUrl)) {
    return
  }

  isRetryInProgress = true
  resumeTime = video.value?.currentTime || 0
  resumePlaying = !!video.value && !video.value.paused
  emit('reload-url')
}

watch(
  () => file.id,
  () => {
    isRetryInProgress = false
    resumeTime = 0
    resumePlaying = false
  }
)

watch(
  () => file.url,
  async (url) => {
    if (!isRetryInProgress || !url) {
      return
    }

    await nextTick()

    const element = video.value
    if (!element) {
      return
    }

    element.addEventListener(
      'loadedmetadata',
      () => {
        element.currentTime = resumeTime
        if (resumePlaying) {
          element.play().catch(() => {
            console.error('Failed to resume video playback after retry.')
          })
        }
      },
      { once: true }
    )
    element.load()
  }
)

onMounted(() => {
  resizeVideoDimensions()
  window.addEventListener('resize', resizeVideoDimensions)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeVideoDimensions)
})
</script>
