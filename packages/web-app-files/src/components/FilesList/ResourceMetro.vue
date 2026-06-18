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
    class="metro-view"
    @file-click="$emit('fileClick', $event)"
    @file-dropped="$emit('fileDropped', $event)"
    @item-visible="$emit('itemVisible', $event)"
    @sort="$emit('sort', $event)"
  >
    <template #image>
      <span />
    </template>
    <template #contextMenu="{ resource }">
      <slot name="contextMenu" :resource="resource" />
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
/* Metro: name centered in preview area, bottom bar hidden */
.metro-view .oc-tile-card {
  outline-color: var(--oc-role-outline-variant) !important;
  background: var(--oc-role-outline-variant) !important;
}
/* Preview area becomes the main content — center the name there */
.metro-view .oc-tile-card-preview {
  position: relative !important;
}
/* Move resource name into preview area via absolute overlay */
.metro-view .oc-card-body {
  position: relative !important;
}
.metro-view .oc-card-body > .p-2 {
  position: absolute !important;
  inset: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 16px !important;
  z-index: 5;
}
/* Hide the bottom row layout, just show name centered */
.metro-view .oc-card-body > .p-2 > .flex {
  flex-direction: column !important;
  align-items: center !important;
  width: 100%;
}
.metro-view .resource-name-wrapper {
  overflow: visible !important;
  text-align: center !important;
  width: 100%;
}
.metro-view .oc-resource { justify-content: center !important; }
.metro-view .oc-resource-details { text-align: center !important; }
.metro-view .oc-resource-name {
  justify-content: center !important;
  font-weight: 700 !important;
  white-space: normal !important;
}
.metro-view .oc-resource-basename,
.metro-view .oc-resource-extension {
  white-space: normal !important;
  font-weight: 700 !important;
}
/* Hide context menu button row — keep only 3-dot */
.metro-view .resource-tiles-btn-action-dropdown {
  position: absolute !important;
  bottom: 4px !important;
  right: 4px !important;
  z-index: 10;
}
</style>
