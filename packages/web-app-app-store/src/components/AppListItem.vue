<template>
  <li
    class="app-list-item relative bg-role-surface-container flex items-center gap-4 border rounded-lg p-3 overflow-hidden"
  >
    <div class="relative shrink-0 pointer-events-none">
      <app-official-badge :app="app" class="absolute top-1 left-1" />
      <app-preview-image :app="app" icon-size-class="size-8" class="w-24 rounded-sm" />
    </div>
    <div class="app-list-item-content flex flex-col min-w-0 grow gap-1">
      <app-title :app="app" :term="term" title-class="m-0 text-base app-list-item-title" />
      <p class="m-0 truncate"><oc-filter-highlight :text="app.subtitle" :term="term" /></p>
      <span
        class="app-list-item-authors truncate text-sm text-role-on-surface-variant"
        v-text="getAuthorNames(app)"
      />
      <app-tags :app="app" :term="term" @click="emit('search', $event)" />
    </div>
    <app-actions :app="app" class="relative shrink-0" />
  </li>
</template>

<script setup lang="ts">
import { OcFilterHighlight } from '@opencloud-eu/design-system/components'
import { App } from '../types'
import { getAuthorNames } from '../helpers'
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
