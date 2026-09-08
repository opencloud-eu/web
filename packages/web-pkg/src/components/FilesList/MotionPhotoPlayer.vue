<template>
  <div class="motion-photo-player absolute inset-0 pointer-events-none">
    <video
      v-if="isPlaying && videoUrl"
      :src="videoUrl"
      class="absolute inset-0 size-full object-cover"
      :class="videoClass"
      muted
      loop
      autoplay
      playsinline
      @loadedmetadata="seekToStill"
    />
    <motion-photo-badge
      class="absolute pointer-events-auto"
      :class="badgeClass"
      :size="badgeSize"
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
import { SizeType } from '@opencloud-eu/design-system/helpers'
import MotionPhotoBadge from './MotionPhotoBadge.vue'
import { useGetMatchingSpace, useMotionPhotoPlayback } from '../../composables'

// Owns the playback state, so mount it only for motion photos. Pointer-transparent
// apart from the badge; the parent drives hover-to-play via hoverPlay/stop.
const {
  resource,
  space = undefined,
  badgeSize = 'small',
  badgeClass = 'top-0 right-0',
  videoClass = ''
} = defineProps<{
  resource: Resource
  space?: SpaceResource
  badgeSize?: SizeType
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
