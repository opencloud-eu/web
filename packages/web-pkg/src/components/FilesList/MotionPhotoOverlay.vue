<template>
  <div class="relative" @mouseenter="player?.hoverPlay?.()" @mouseleave="player?.stop?.()">
    <slot />
    <motion-photo-player
      v-if="isMotionPhoto"
      ref="player"
      :resource="resource"
      :space="space"
      :badge-size="badgeSize"
      :badge-class="badgeClass"
      :video-class="videoClass"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import isEmpty from 'lodash-es/isEmpty'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { SizeType } from '@opencloud-eu/design-system/helpers'
import MotionPhotoPlayer from './MotionPhotoPlayer.vue'

/**
 * Shared motion-photo overlay: wraps a still (default slot) and, when the
 * resource is a motion photo, lays the hover-to-play clip and the play/pause
 * badge over it. Owns the hover, so consumers only drop it around their still.
 * For every other resource it is just a positioned wrapper: no badge, no fetch,
 * no playback state.
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

const player = useTemplateRef<InstanceType<typeof MotionPhotoPlayer>>('player')
const isMotionPhoto = computed(() => !isEmpty(resource?.motionPhoto))
</script>
