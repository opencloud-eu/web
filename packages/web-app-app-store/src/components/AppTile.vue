<template>
  <oc-card
    tag="li"
    class="app-tile bg-role-surface-container flex flex-col border overflow-hidden shadow-none"
    header-class="p-0"
    body-class="grow flex flex-col"
  >
    <template #header>
      <router-link :to="getAppDetailsRoute(app)">
        <app-image-gallery :app="app" />
      </router-link>
    </template>
    <div class="app-tile-body flex flex-col grow">
      <app-title :app="app" :term="term" title-class="my-2 app-tile-title" />
      <p class="my-2"><oc-filter-highlight :text="app.subtitle" :term="term" /></p>
      <app-tags :app="app" :term="term" @click="emit('search', $event)" />
      <div class="app-tile-footer flex items-center justify-between gap-2 mt-auto pt-4">
        <span
          class="app-tile-authors truncate text-sm text-role-on-surface-variant"
          v-text="authors"
        />
        <app-download-button :app="app" />
      </div>
    </div>
  </oc-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { OcFilterHighlight } from '@opencloud-eu/design-system/components'
import { App } from '../types'
import { getAppDetailsRoute } from '../helpers'
import AppTags from './AppTags.vue'
import AppTitle from './AppTitle.vue'
import AppImageGallery from './AppImageGallery.vue'
import AppDownloadButton from './AppDownloadButton.vue'

const { app, term = '' } = defineProps<{
  app: App
  term?: string
}>()

const emit = defineEmits<{
  (e: 'search', term: string): void
}>()

const authors = computed(() => {
  return app.authors
    .map((author) => author.name)
    .filter(Boolean)
    .join(', ')
})
</script>
