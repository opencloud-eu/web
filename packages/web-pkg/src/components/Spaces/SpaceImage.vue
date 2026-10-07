<template>
  <oc-spinner
    v-if="imagesLoading.includes(space.id)"
    class="shrink-0"
    :aria-label="$gettext('Space image is loading')"
  />
  <img
    v-else-if="space.thumbnail"
    class="rounded-xs object-cover size-6 shrink-0"
    :class="{ 'opacity-80 grayscale': space.disabled }"
    :src="space.thumbnail"
    alt=""
    decoding="async"
  />
  <resource-icon v-else class="rounded-xs shrink-0" :resource="space" size-class="size-6" />
</template>

<script setup lang="ts">
import { SpaceResource } from '@opencloud-eu/web-client'
import { storeToRefs } from 'pinia'
import ResourceIcon from '../FilesList/ResourceIcon.vue'
import { useSpacesStore } from '../../composables/piniaStores'

const { space } = defineProps<{ space: SpaceResource }>()

const { imagesLoading } = storeToRefs(useSpacesStore())
</script>
