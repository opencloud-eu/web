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
  background: var(--oc-role-primary, #1565c0) !important;
  border: none !important;
  border-radius: 10px !important;
  overflow: hidden;
}
.resource-metro-wrapper .oc-tile-card:hover {
  filter: brightness(1.1);
}
/* Hide thumbnail/preview */
.resource-metro-wrapper .oc-tile-card-preview {
  display: none !important;
}
/* Title: white, bold, centered */
.resource-metro-wrapper .oc-resource-name,
.resource-metro-wrapper .oc-resource-basename,
.resource-metro-wrapper .oc-resource-extension {
  color: white !important;
  font-weight: 700 !important;
}
.resource-metro-wrapper .oc-resource-name {
  justify-content: center !important;
  text-align: center;
}
/* Content area fills tile, centers content */
.resource-metro-wrapper .oc-tile-card-content {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-height: 100px;
}
/* Checkbox: fixed top-left */
.resource-metro-wrapper .oc-tile-card-selection {
  position: absolute !important;
  top: 8px !important;
  left: 8px !important;
}
/* Context menu button: fixed bottom-right */
.resource-metro-wrapper .resource-tiles-btn-action-dropdown {
  position: absolute !important;
  bottom: 8px !important;
  right: 8px !important;
}
/* Make tile position relative for absolute children */
.resource-metro-wrapper .oc-tiles-item {
  position: relative;
}
</style>
