<template>
  <div class="relative">
    <app-official-badge
      v-if="isOfficialApp(app)"
      class="absolute top-2 left-2 z-10 pointer-events-none"
    />
    <app-badge-ribbon v-if="app.badge" :badge="app.badge" />
    <div class="app-image w-full">
      <app-preview-image :url="app.coverImage?.url" class="w-full" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { App } from '../types'
import { isOfficialApp } from '../helpers'
import AppPreviewImage from './AppPreviewImage.vue'
import AppOfficialBadge from './AppOfficialBadge.vue'
import AppBadgeRibbon from './AppBadgeRibbon.vue'

const { app } = defineProps<{
  app: App
}>()
</script>
