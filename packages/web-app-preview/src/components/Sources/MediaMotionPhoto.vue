<template>
  <div class="motion-photo relative flex items-center justify-center max-w-full max-h-full pt-4">
    <img
      v-show="!isPlaying"
      :key="`motion-photo-still-${file.id}`"
      :src="file.url"
      :alt="file.name"
      :data-id="file.id"
      class="max-w-full max-h-full"
    />
    <video
      v-if="isPlaying"
      :key="`motion-photo-video-${file.id}`"
      :src="videoUrl"
      :loop="looping"
      muted
      autoplay
      playsinline
      preload="auto"
      class="max-w-full max-h-full"
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useGetMatchingSpace, useMotionPhotoPlayback } from '@opencloud-eu/web-pkg'
import { MediaFile } from '../../helpers/types'

const { file } = defineProps<{ file: MediaFile }>()

const { $gettext } = useGettext()
const { getMatchingSpace } = useGetMatchingSpace()

const { isPlaying, isLoading, videoUrl, play, stop, seekToStill } = useMotionPhotoPlayback(
  () => file.resource,
  () => getMatchingSpace(file.resource)
)

// The initial auto-play runs once and reverts to the still. Explicit playback
// (via the media-controls play/pause button) loops until stopped.
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

// exposed so the media controls (bottom bar) can drive play/pause
defineExpose({ isPlaying, toggle: togglePlayback })
</script>
