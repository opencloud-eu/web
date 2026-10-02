<template>
  <li
    class="app-list-item bg-role-surface-container flex items-center gap-4 border rounded-lg p-3 overflow-hidden"
  >
    <router-link :to="getAppDetailsRoute(app)" class="relative shrink-0">
      <app-official-badge v-if="isOfficialApp(app)" class="absolute top-1 left-1 z-10" />
      <app-preview-image
        :url="app.coverImage?.url"
        icon-size-class="size-8"
        class="w-24 rounded-sm"
      />
    </router-link>
    <div class="app-list-item-content flex flex-col min-w-0 grow gap-1">
      <app-title :app="app" :term="term" title-class="m-0 text-base app-list-item-title" />
      <p class="m-0 truncate"><oc-filter-highlight :text="app.subtitle" :term="term" /></p>
      <span
        class="app-list-item-authors truncate text-sm text-role-on-surface-variant"
        v-text="getAuthorNames(app)"
      />
      <app-tags :app="app" :term="term" @click="emit('search', $event)" />
    </div>
    <app-actions :app="app" class="shrink-0" />
  </li>
</template>

<script setup lang="ts">
import { OcFilterHighlight } from '@opencloud-eu/design-system/components'
import { App } from '../types'
import { getAppDetailsRoute, getAuthorNames, isOfficialApp } from '../helpers'
import AppTags from './AppTags.vue'
import AppTitle from './AppTitle.vue'
import AppActions from './AppActions.vue'
import AppPreviewImage from './AppPreviewImage.vue'
import AppOfficialBadge from './AppOfficialBadge.vue'

const { app, term = '' } = defineProps<{
  app: App
  term?: string
}>()

const emit = defineEmits<{
  (e: 'search', term: string): void
}>()
</script>
