<template>
  <media-image :file="file" :current-image-rotation="currentImageRotation">
    <template #overlay>
      <video
        v-if="isPlaying"
        :key="`motion-photo-video-${file.id}`"
        :src="videoUrl"
        :loop="looping"
        muted
        autoplay
        playsinline
        preload="auto"
        class="max-w-full max-h-full object-contain"
        data-testid="motion-photo-video"
        @loadedmetadata="seekToStill"
        @ended="onEnded"
        @error="stop"
      />
      <oc-spinner
        v-if="isLoading && !isPlaying"
        class="absolute inset-0 m-auto"
        size="large"
        :aria-label="$gettext('Loading motion photo')"
      />
    </template>
  </media-image>
</template>

<script setup lang="ts">
import { onMounted, ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useGetMatchingSpace, useMotionPhotoPlayback } from '@opencloud-eu/web-pkg'
import { MediaFile } from '../../helpers/types'
import MediaImage from './MediaImage.vue'

const { file, currentImageRotation } = defineProps<{
  file: MediaFile
  currentImageRotation: number
}>()

const { $gettext } = useGettext()
const { getMatchingSpace } = useGetMatchingSpace()

const { isPlaying, isLoading, videoUrl, play, stop, seekToStill } = useMotionPhotoPlayback(
  () => file.resource,
  () => getMatchingSpace(file.resource)
)

// auto-play on open runs once, playback started from the controls loops
const looping = ref(false)

const onEnded = () => {
  if (!unref(looping)) {
    stop()
  }
}

const togglePlayback = () => {
  if (unref(isPlaying)) {
    looping.value = false
    stop()
  } else {
    looping.value = true
    play()
  }
}

onMounted(() => {
  looping.value = false
  play()
})

defineExpose({ isPlaying, toggle: togglePlayback })
</script>
