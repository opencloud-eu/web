<template>
  <div class="relative" @mouseenter="hoverPlay" @mouseleave="stop">
    <slot />
    <video
      v-if="isPlaying && videoUrl"
      :src="videoUrl"
      class="absolute inset-0 size-full object-cover pointer-events-none"
      :class="videoClass"
      muted
      loop
      autoplay
      playsinline
      @loadedmetadata="seekToStill"
    />
    <motion-photo-badge
      v-if="isMotionPhoto"
      class="absolute"
      :class="badgeClass"
      :size="badgeSize"
      interactive
      :loading="isLoading"
      :icon="isPlaying ? 'pause-circle' : 'play-circle'"
      :label="isPlaying ? $gettext('Pause motion photo') : $gettext('Play motion photo')"
      @click.stop.prevent="toggle"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import isEmpty from 'lodash-es/isEmpty'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { SizeType } from '@opencloud-eu/design-system/helpers'
import MotionPhotoBadge from './MotionPhotoBadge.vue'
import { useGetMatchingSpace, useMotionPhotoPlayback } from '../../composables'

/**
 * Shared motion-photo overlay: wraps a still (default slot) and, when the
 * resource is a motion photo, overlays the hover-to-play clip and the play/pause
 * badge on top of it. Owns its own hover, so consumers only drop it around their
 * still. Passive (no badge, no fetch) for non-motion-photo resources.
 */
const {
  resource,
  space = undefined,
  badgeSize = 'small',
  badgeClass = 'top-0 right-0',
  videoClass = ''
} = defineProps<{
  resource: Resource
  /** The resource's space. Falls back to the matching space when omitted. */
  space?: SpaceResource
  /** Size of the play/pause badge (mirrors OcIcon's SizeType). */
  badgeSize?: SizeType
  /** Positioning classes for the badge (defaults to the top-right corner). */
  badgeClass?: string
  /** Extra classes for the video overlay, e.g. surface-specific border radius. */
  videoClass?: string
}>()

const { $gettext } = useGettext()
const { getMatchingSpace } = useGetMatchingSpace()

// resolved lazily (only when playback starts) so a grid of many items does not
// run the space lookup on every render
const { isPlaying, isLoading, videoUrl, hoverPlay, stop, toggle, seekToStill } =
  useMotionPhotoPlayback(
    () => resource,
    () => space ?? getMatchingSpace(resource)
  )

const isMotionPhoto = computed(() => !isEmpty(resource?.motionPhoto))
</script>
