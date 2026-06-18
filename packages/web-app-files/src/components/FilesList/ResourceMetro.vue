<template>
  <resource-tiles
    v-bind="$attrs"
    v-model:selected-ids="selectedIds"
    :resources="filteredResources"
    :space="space"
    :view-mode="viewMode"
    :sort-by="sortBy"
    :sort-dir="sortDir"
    :sort-fields="sortFields"
    :header-position="headerPosition"
    :view-size="viewSize"
    :drag-drop="dragDrop"
    class="resource-metro-wrapper"
    @file-click="$emit('fileClick', $event)"
    @file-dropped="$emit('fileDropped', $event)"
    @item-visible="$emit('itemVisible', $event)"
    @sort="$emit('sort', $event)"
  >
    <template #image>
      <!-- No image/thumbnail — metro shows only text -->
      <div class="metro-image-placeholder" />
    </template>
    <template #contextMenu="{ resource }">
      <slot name="contextMenu" :resource="resource" />
    </template>
    <template #actions="{ resource }">
      <slot name="actions" :resource="resource" />
    </template>
  </resource-tiles>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { ResourceTiles } from '@opencloud-eu/web-pkg'

const props = defineProps<{
  resources: Resource[]
  space: SpaceResource
  viewMode?: string
  sortBy?: string
  sortDir?: string
  dragDrop?: boolean
  headerPosition?: number
  sortFields?: any[]
  viewSize?: number
}>()

defineEmits(['fileClick', 'fileDropped', 'itemVisible', 'sort', 'update:selectedIds'])
const selectedIds = defineModel<string[]>('selectedIds', { default: () => [] })

const filteredResources = computed(() => {
  return props.resources.filter(r => !r.name?.startsWith('_type_'))
})
</script>

<style>
/* Metro override styles — unscoped to reach into ResourceTiles internals */
.resource-metro-wrapper .oc-tiles {
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)) !important;
}
.resource-metro-wrapper .oc-tile-card {
  background: var(--oc-color-background-hover, #f5f5f5) !important;
  border: 1px solid var(--oc-color-border, #e0e0e0) !important;
  border-radius: 10px !important;
  aspect-ratio: 4 / 3;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s, box-shadow 0.15s;
}
.resource-metro-wrapper .oc-tile-card:hover {
  transform: scale(1.04);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}
.resource-metro-wrapper .oc-tile-card .oc-resource-name {
  font-weight: 700 !important;
  justify-content: center;
}
.resource-metro-wrapper .metro-image-placeholder {
  display: none;
}
/* Hide tile thumbnail area */
.resource-metro-wrapper .oc-tile-card-preview {
  display: none !important;
}
</style>
