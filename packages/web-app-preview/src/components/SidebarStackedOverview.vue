<template>
  <nav class="preview-sidebar flex flex-col p-4 overflow-y-auto">
    <div
      v-for="(item, idx) in items"
      :key="item.id"
      class="flex flex-col items-center p-4 mb-1 preview-sidebar-item"
      :class="{ 'bg-role-surface rounded-md': idx === activeIndex }"
    >
      <oc-button
        appearance="raw"
        class="flex flex-col w-full"
        :aria-label="item.name"
        no-hover
        :aria-current="idx === activeIndex ? 'true' : 'false'"
        @click="$emit('select', idx)"
      >
        <img
          v-if="item && item.isImage && item.url && !item.isError"
          :src="item.url"
          class="object-cover h-25 rounded-md aspect-video"
          :alt="item.name"
          referrerpolicy="no-referrer"
        />
        <div v-else class="aspect-video h-25 flex items-center justify-center">
          <resource-icon class="aspect-video" :resource="getIconResource(item)" size="xlarge" />
        </div>
        <span class="w-full">
          <span class="line-clamp-1 wrap-break-word text-sm" v-text="item.name" />
        </span>
      </oc-button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { Resource } from '@opencloud-eu/web-client'
import { CachedFile } from '../helpers/types'
import { ResourceIcon } from '@opencloud-eu/web-pkg'
import { nextTick, watch } from 'vue'

const { activeIndex, items } = defineProps<{
  activeIndex: number
  items: CachedFile[]
}>()
defineEmits<{
  (e: 'select', index: number): void
}>()

const scrollToActiveElement = async () => {
  await nextTick()
  const element = document.querySelectorAll('.preview-sidebar-item')?.[activeIndex]
  if (!element) {
    return
  }

  element.scrollIntoView({ block: 'center', inline: 'nearest' })
}

watch(
  () => activeIndex,
  () => {
    scrollToActiveElement()
  },
  { immediate: true }
)

const getIconResource = (item: CachedFile) => {
  return {
    id: item.id,
    path: '',
    extension: item.ext,
    mimeType: item.mimeType,
    isFolder: false,
    isFile: true,
    type: 'file'
  } as Resource
}
</script>
