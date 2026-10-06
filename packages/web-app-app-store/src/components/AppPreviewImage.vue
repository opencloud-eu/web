<template>
  <oc-image
    v-if="app.coverImage?.url"
    :src="app.coverImage.url"
    class="app-preview-image max-w-full object-cover aspect-3/2"
  />
  <div v-else class="fallback-icon bg-white flex items-center justify-center aspect-3/2">
    <oc-icon name="computer" :size-class="iconSizeClass" />
  </div>
</template>

<script setup lang="ts">
import { App } from '../types'

const { app, iconSizeClass = 'size-22' } = defineProps<{
  app: App
  iconSizeClass?: string
}>()
</script>
