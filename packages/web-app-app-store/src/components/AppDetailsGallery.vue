<template>
  <div class="app-details-gallery flex flex-col gap-2 w-full">
    <div
      class="app-details-gallery-image relative flex items-center justify-center w-full aspect-16/10 rounded-lg overflow-hidden bg-role-surface-container"
    >
      <app-official-badge v-if="isOfficialApp(app)" class="absolute top-2 left-2 z-10" />
      <app-badge-ribbon v-if="app.badge" :badge="app.badge" />
      <oc-image
        v-if="currentImage"
        :src="currentImage.url"
        :alt="currentImage.caption || app.name"
        class="size-full object-contain"
      />
      <oc-icon v-else name="computer" size-class="size-22" />
    </div>
    <div
      v-if="currentImage?.caption || hasMultipleImages"
      class="flex items-center justify-between gap-4 text-sm text-role-on-surface-variant"
    >
      <span class="app-details-gallery-caption truncate" v-text="currentImage?.caption" />
      <span
        v-if="hasMultipleImages"
        class="app-details-gallery-counter shrink-0"
        v-text="`${currentIndex + 1} / ${images.length}`"
      />
    </div>
    <ul
      v-if="hasMultipleImages"
      class="app-details-gallery-thumbnails flex gap-2 overflow-x-auto m-0 p-1"
    >
      <li v-for="(image, index) in images" :key="`${image.url}-${index}`" class="shrink-0">
        <oc-button
          appearance="raw"
          no-hover
          data-testid="gallery-thumbnail"
          class="block p-0 w-20 aspect-16/10 rounded-sm overflow-hidden bg-role-surface-container transition-opacity"
          :class="
            index === currentIndex
              ? 'outline-2 outline-role-secondary'
              : 'opacity-60 hover:opacity-100'
          "
          :aria-label="image.caption || $gettext('Image %{index}', { index: `${index + 1}` })"
          :aria-pressed="index === currentIndex"
          @click="currentIndex = index"
        >
          <oc-image :src="image.url" alt="" class="size-full object-cover" />
        </oc-button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, unref, watch } from 'vue'
import { App } from '../types'
import AppBadgeRibbon from './AppBadgeRibbon.vue'
import AppOfficialBadge from './AppOfficialBadge.vue'
import { isOfficialApp } from '../helpers'

const { app } = defineProps<{
  app: App
}>()

const images = computed(() => {
  return [app.coverImage, ...app.screenshots].filter((image) => !!image?.url)
})
const currentIndex = ref(0)
const currentImage = computed(() => unref(images)[unref(currentIndex)])
const hasMultipleImages = computed(() => unref(images).length > 1)

watch(
  () => app.id,
  () => {
    currentIndex.value = 0
  }
)
</script>
