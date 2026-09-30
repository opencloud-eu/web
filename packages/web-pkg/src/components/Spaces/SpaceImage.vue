<template>
  <oc-spinner
    v-if="imagesLoading.includes(space.id)"
    :aria-label="$gettext('Space image is loading')"
  />
  <img
    v-else-if="space.thumbnail"
    class="rounded-xs object-cover size-6"
    :class="{ 'opacity-80 grayscale': space.disabled }"
    :src="space.thumbnail"
    alt=""
    decoding="async"
  />
  <resource-icon v-else class="rounded-xs" :resource="space" size-class="size-6" />
</template>

<script setup lang="ts">
import { SpaceResource } from '@opencloud-eu/web-client'
import { storeToRefs } from 'pinia'
import ResourceIcon from '../FilesList/ResourceIcon.vue'
import { useSpacesStore } from '../../composables/piniaStores'

/**
 * Small space image for lists and tables. Shows a spinner while the image is loading
 * and falls back to the space icon if the space has no image.
 */
const { space } = defineProps<{ space: SpaceResource }>()

const { imagesLoading } = storeToRefs(useSpacesStore())
</script>
