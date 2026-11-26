<template>
  <oc-list
    raw
    class="flex flex-col gap-0.5"
    :class="{ 'ml-3 border-l border-l-role-outline-variant pl-1': isNested }"
  >
    <li v-for="({ item, isExpanded }, index) in entries" :key="index">
      <template v-if="isLayerGroup(item)">
        <div class="flex items-center gap-1">
          <pdf-tree-toggle
            class="pdf-viewer-layers-toggle"
            :is-expanded="isExpanded"
            @toggle="expanded[index] = !isExpanded"
          />
          <span
            class="break-words text-sm"
            :class="{ italic: item.name === null }"
            dir="auto"
            v-text="item.name ?? $gettext('Additional layers')"
          />
        </div>
        <pdf-layers v-if="isExpanded" :items="item.items" is-nested />
      </template>
      <oc-checkbox
        v-else
        class="pdf-viewer-layer py-1.5 pl-2"
        :model-value="item.isVisible"
        :label="item.name || '–'"
        @update:model-value="setVisible(item.id, $event)"
      />
    </li>
  </oc-list>
</template>

<script setup lang="ts">
import { computed, inject, reactive } from 'vue'
import {
  isLayerGroup,
  pdfLayersKey,
  type PdfLayerGroup,
  type PdfLayerItem
} from '../composables/usePdfLayers'
import PdfTreeToggle from './PdfTreeToggle.vue'

const { items, isNested = false } = defineProps<{
  items: PdfLayerItem[]
  isNested?: boolean
}>()

const { setVisible } = inject(pdfLayersKey)

// By position, the items are new after every change. Groups without a name start collapsed,
// like in the PDF.js viewer.
const expanded = reactive<Record<number, boolean>>({})

function isGroupExpanded(group: PdfLayerGroup, index: number) {
  return expanded[index] ?? group.name !== null
}

const entries = computed(() =>
  items.map((item, index) => ({
    item,
    isExpanded: isLayerGroup(item) && isGroupExpanded(item, index)
  }))
)
</script>
