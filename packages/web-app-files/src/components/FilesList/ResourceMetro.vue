<template>
  <div class="resource-metro grid gap-4 p-4" style="grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))">
    <div
      v-for="resource in filteredResources"
      :key="resource.id"
      class="resource-metro-tile"
      @click="handleClick(resource)"
    >
      <resource-icon :resource="resource" size="large" class="tile-icon" />
      <div class="tile-name">{{ resource.name }}</div>
    </div>
    <div v-if="!filteredResources.length" class="col-span-full p-4 text-sm opacity-50 text-center">
      No items
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { ResourceIcon } from '@opencloud-eu/web-pkg'

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

const emit = defineEmits(['fileClick', 'fileDropped', 'itemVisible', 'sort', 'update:selectedIds'])
const selectedIds = defineModel<string[]>('selectedIds', { default: () => [] })

function handleClick(resource: Resource) {
  emit('fileClick', { resources: [resource], space: props.space })
}

const filteredResources = computed(() => {
  return props.resources.filter(r => !r.name?.startsWith('_type_'))
})
</script>

<style scoped>
.resource-metro-tile {
  aspect-ratio: 4 / 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  cursor: pointer;
  padding: 16px;
  transition: transform 0.15s, box-shadow 0.15s;
  background: var(--oc-color-background-hover, #f5f5f5);
  border: 1px solid var(--oc-color-border, #e0e0e0);
  color: var(--oc-color-text-default, #333);
}
.resource-metro-tile:hover {
  transform: scale(1.04);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  background: var(--oc-color-background-highlight, #eee);
}
.tile-icon {
  margin-bottom: 8px;
  pointer-events: none;
}
.tile-name {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
  word-break: break-word;
  text-align: center;
  pointer-events: none;
}
</style>
