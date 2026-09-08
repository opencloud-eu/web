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

/**
 * The playback layer of a motion photo: the clip (while playing) and the
 * play/pause badge, laid over the still that the parent renders. It owns the
 * playback state, so mount it only for actual motion photos (a plain list row
 * must not pay for a playback composable it never uses).
 *
 * It is pointer-transparent except for the badge, so the still underneath keeps
 * receiving clicks. Position it inside a `relative` parent; hover-to-play is
 * driven by the parent via the exposed `hoverPlay`/`stop`.
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

// the space is resolved lazily (only when playback starts) so a grid of many
// items does not run the space lookup on every render
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
