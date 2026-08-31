<template>
  <oc-card
    tag="li"
    class="app-tile bg-role-surface-container flex flex-col border overflow-hidden shadow-none"
    header-class="p-0"
  >
    <template #header>
      <router-link
        :to="{ name: `${APPID}-details`, params: { appId: encodeURIComponent(app.id) } }"
      >
        <app-image-gallery :app="app" />
      </router-link>
    </template>
    <div class="app-tile-body flex flex-col justify-between h-full">
      <div class="app-tile-content">
        <div class="flex items-center">
          <h3 class="my-2 truncate app-tile-title">
            <router-link
              :to="{ name: `${APPID}-details`, params: { appId: encodeURIComponent(app.id) } }"
            >
              <oc-filter-highlight :text="app.name" :term="term" />
            </router-link>
          </h3>
          <span class="ml-2 text-role-on-surface-variant text-sm mt-1">
            v{{ app.mostRecentVersion.version }}
          </span>
        </div>
        <p class="my-2"><oc-filter-highlight :text="app.subtitle" :term="term" /></p>
      </div>
      <app-tags :app="app" :term="term" @click="emitSearchTerm" />
      <app-actions :app="app" class="mt-4" />
    </div>
  </oc-card>
</template>

<script setup lang="ts">
import { App } from '../types'
import { APPID } from '../appid'
import AppTags from './AppTags.vue'
import AppActions from './AppActions.vue'
import AppImageGallery from './AppImageGallery.vue'
import { OcFilterHighlight } from '@opencloud-eu/design-system/components'

const { app, term = '' } = defineProps<{
  app: App
  term?: string
}>()

const emit = defineEmits<{
  (e: 'search', term: string): void
}>()

const emitSearchTerm = (searchTerm: string) => {
  emit('search', searchTerm)
}
</script>
