<template>
  <nav class="photo-roll flex flex-col p-4 overflow-y-auto max-w-xs">
    <photo-roll-item
      v-for="(item, idx) in items"
      :key="item.id"
      :item="item"
      :is-active="idx === activeIndex"
      @select="$emit('select', idx)"
      @item-visible="onItemVisible(item)"
    />
  </nav>
</template>

<script setup lang="ts">
import { MediaFile } from '../helpers/types'
import {
  ImageDimension,
  ProcessorType,
  useGetMatchingSpace,
  useLoadPreview
} from '@opencloud-eu/web-pkg'
import { nextTick, watch } from 'vue'
import PhotoRollItem from './PhotoRollItem.vue'

const { activeIndex, items } = defineProps<{
  activeIndex: number
  items: MediaFile[]
}>()
defineEmits<{
  (e: 'select', index: number): void
}>()

const { loadPreview } = useLoadPreview()
const { getMatchingSpace } = useGetMatchingSpace()

const onItemVisible = (item: MediaFile) => {
  loadPreview({
    resource: item.resource,
    space: getMatchingSpace(item.resource),
    processor: ProcessorType.enum.fit,
    dimensions: ImageDimension.Tile
  })
}

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
</script>
