<template>
  <div class="resource-metro grid gap-4 p-4" style="grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))">
    <div
      v-for="resource in filteredResources"
      :key="resource.id"
      class="resource-metro-tile"
      @click="handleClick(resource)"
    >
      <div class="tile-name">{{ resource.name }}</div>
      <button
        class="tile-menu"
        @click.stop="handleMenuClick(resource)"
      >
        <oc-icon name="more-2" size="small" />
      </button>
    </div>
    <div v-if="!filteredResources.length" class="col-span-full p-4 text-sm opacity-50 text-center">
      No items
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { createFileRouteOptions } from '@opencloud-eu/web-pkg'

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
const router = useRouter()

function handleClick(resource: Resource) {
  // Space listing: resource is a SpaceResource with getDriveAliasAndItem
  if (typeof (resource as any).getDriveAliasAndItem === 'function') {
    router.push(createFileRouteOptions(resource as any as SpaceResource, { path: '' }))
    return
  }
  // Normal folder/file: emit for GenericSpace triggerDefaultAction
  emit('fileClick', { resources: [resource], space: props.space })
}

function handleMenuClick(resource: Resource) {
  // Select item, then emit fileClick which triggers context actions via sidebar
  selectedIds.value = [resource.id]
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
  position: relative;
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
.tile-name {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
  word-break: break-word;
  text-align: center;
  pointer-events: none;
}
.tile-menu {
  position: absolute;
  bottom: 6px;
  right: 6px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  opacity: 0.4;
  transition: opacity 0.15s;
}
.resource-metro-tile:hover .tile-menu {
  opacity: 0.8;
}
.tile-menu:hover {
  background: rgba(0, 0, 0, 0.08);
  opacity: 1;
}
</style>
