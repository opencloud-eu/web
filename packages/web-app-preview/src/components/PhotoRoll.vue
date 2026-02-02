<template>
  <nav class="photo-roll flex flex-col p-4 overflow-y-auto max-w-xs">
    <div
      v-for="(item, idx) in items"
      :key="item.id"
      class="flex flex-col items-center p-4 mb-1 photo-roll-item"
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
          v-if="item && item.isImage && item.resource.thumbnail"
          :src="item.resource.thumbnail"
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
import { MediaFile } from '../helpers/types'
import {
  ImageDimension,
  ProcessorType,
  ResourceIcon,
  useGetMatchingSpace,
  useLoadPreview
} from '@opencloud-eu/web-pkg'
import { nextTick, onMounted, watch } from 'vue'

const { activeIndex, items } = defineProps<{
  activeIndex: number
  items: MediaFile[]
}>()
defineEmits<{
  (e: 'select', index: number): void
}>()

const { loadPreview } = useLoadPreview()
const { getMatchingSpace } = useGetMatchingSpace()

const scrollToActiveElement = async () => {
  await nextTick()
  const element = document.querySelectorAll('.photo-roll-item')?.[activeIndex]
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

const getIconResource = (item: MediaFile) => {
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

onMounted(() => {
  items.forEach((item: MediaFile) => {
    loadPreview({
      resource: item.resource,
      space: getMatchingSpace(item.resource),
      processor: ProcessorType.enum.fit,
      dimensions: ImageDimension.Tile
    })
  })
})
</script>
