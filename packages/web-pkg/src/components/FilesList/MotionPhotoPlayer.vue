<template>
  <div class="motion-photo-player absolute inset-0 pointer-events-none">
    <div v-if="isPlaying && videoUrl" class="absolute inset-0 overflow-hidden" :class="videoClass">
      <video
        :src="videoUrl"
        class="size-full object-cover"
        muted
        loop
        autoplay
        playsinline
        @loadedmetadata="seekToStill"
      />
    </div>
    <motion-photo-badge
      class="absolute pointer-events-auto"
      :class="badgeClass"
      :size-class="badgeSizeClass"
      :interactive="canPlay"
      :muted="!canPlay"
      :loading="isLoading"
      :icon="isPlaying ? 'pause-circle' : 'play-circle'"
      :label="badgeLabel"
      @click.stop.prevent="toggle"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import MotionPhotoBadge from './MotionPhotoBadge.vue'
import { useGetMatchingSpace, useMotionPhotoPlayback } from '../../composables'

// Owns the playback state, so mount it only for motion photos. Pointer-transparent
// apart from the badge; the parent drives hover-to-play via hoverPlay/stop.
const {
  resource,
  space = undefined,
  badgeSizeClass = 'size-4',
  badgeClass = 'top-0 right-0',
  videoClass = ''
} = defineProps<{
  resource: Resource
  space?: SpaceResource
  badgeSizeClass?: string
  badgeClass?: string
  videoClass?: string
}>()

const { $gettext } = useGettext()
const { getMatchingSpace } = useGetMatchingSpace()

const { isPlaying, isLoading, videoUrl, canPlay, hoverPlay, stop, toggle, seekToStill } =
  useMotionPhotoPlayback(
    () => resource,
    () => space ?? getMatchingSpace(resource)
  )

const badgeLabel = computed(() => {
  if (!unref(canPlay)) {
    return $gettext('Motion photo (clip not available)')
  }
  return unref(isPlaying) ? $gettext('Pause motion photo') : $gettext('Play motion photo')
})

defineExpose({ isPlaying, hoverPlay, stop, toggle })
</script>
