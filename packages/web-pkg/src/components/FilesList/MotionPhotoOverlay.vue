<template>
  <div class="relative" @mouseenter="player?.hoverPlay?.()" @mouseleave="player?.stop?.()">
    <slot />
    <motion-photo-player
      v-if="showPlayer"
      ref="player"
      :resource="resource"
      :space="space"
      :badge-size-class="badgeSizeClass"
      :badge-class="badgeClass"
      :video-class="videoClass"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import MotionPhotoPlayer from './MotionPhotoPlayer.vue'
import { isMotionOrLivePhoto } from '../../composables'

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

const player = useTemplateRef<InstanceType<typeof MotionPhotoPlayer>>('player')
const showPlayer = computed(() => isMotionOrLivePhoto(resource))
</script>
