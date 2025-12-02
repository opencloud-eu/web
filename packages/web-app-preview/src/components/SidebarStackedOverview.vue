<template>
  <nav class="preview-sidebar flex flex-col p-4 overflow-y-auto" aria-label="Media items">
    <div
      v-for="(item, idx) in items"
      :key="item.id"
      class="flex flex-col items-center p-4 mb-1"
      :class="{ 'bg-role-surface rounded-md': idx === activeIndex }"
    >
      <button
        class="flex items-center justify-center overflow-hidden aspect-video"
        type="button"
        :aria-label="item.name"
        :aria-current="idx === activeIndex ? 'true' : 'false'"
        @click="$emit('select', idx)"
      >
        <img
          v-if="item && item.isImage && item.url && !item.isError"
          :src="item.url"
          class="object-cover w-full h-full rounded-md"
          :alt="item.name"
          referrerpolicy="no-referrer"
        />

        <resource-icon v-else :resource="item" size="large" />
      </button>
      <div class="flex items-center justify-center truncate w-full">
        <span class="truncate" v-text="item.name" />
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { CachedFile } from '../helpers/types'
import { ResourceIcon } from '@opencloud-eu/web-pkg'

const { activeIndex, items } = defineProps<{
  activeIndex: number
  items: CachedFile[]
}>()
defineEmits<{
  (e: 'select'): void
}>()
</script>
