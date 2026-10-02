<template>
  <oc-image v-if="url" :src="url" class="app-preview-image max-w-full object-cover aspect-3/2" />
  <div v-else class="fallback-icon bg-white flex items-center justify-center aspect-3/2">
    <oc-icon name="computer" :size-class="iconSizeClass" />
  </div>
</template>

<script setup lang="ts">
const { url = '', iconSizeClass = 'size-22' } = defineProps<{
  url?: string
  iconSizeClass?: string
}>()
</script>
