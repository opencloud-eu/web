<template>
  <div class="relative">
    <app-official-badge :app="app" class="absolute top-2 left-2 z-10 pointer-events-none" />
    <app-badge-ribbon :app="app" />
    <div class="app-image w-full">
      <app-preview-image :app="app" class="w-full" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { App } from '../types'
import AppPreviewImage from './AppPreviewImage.vue'
import AppOfficialBadge from './AppOfficialBadge.vue'
import AppBadgeRibbon from './AppBadgeRibbon.vue'

const { app } = defineProps<{
  app: App
}>()
</script>
