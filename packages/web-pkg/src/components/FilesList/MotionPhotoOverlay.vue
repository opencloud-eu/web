<template>
  <div class="relative" @mouseenter="player?.hoverPlay?.()" @mouseleave="player?.stop?.()">
    <slot />
    <motion-photo-player
      v-if="isMotionPhoto"
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
import isEmpty from 'lodash-es/isEmpty'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import MotionPhotoPlayer from './MotionPhotoPlayer.vue'

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
const isMotionPhoto = computed(() => !isEmpty(resource?.motionPhoto))
</script>
