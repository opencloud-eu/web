<template>
  <div class="resource-metro grid gap-4 p-4" style="grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))">
    <a
      v-for="resource in filteredResources"
      :key="resource.id"
      :href="getLink(resource)"
      class="resource-metro-tile"
      @click.prevent="navigate(resource)"
      @contextmenu.prevent="onRightClick(resource)"
    >
      <span class="tile-name">{{ resource.name }}</span>
      <button
        class="tile-menu"
        @click.stop.prevent="onRightClick(resource)"
      >
        <oc-icon name="more-2" size="small" />
      </button>
    </a>
    <div v-if="!filteredResources.length" class="col-span-full p-4 text-sm opacity-50 text-center">
      No items
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { createFileRouteOptions, eventBus } from '@opencloud-eu/web-pkg'

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

function isSpace(resource: Resource): boolean {
  return !!(resource as any).driveType
}

function getLink(resource: Resource): string {
  try {
    const space = isSpace(resource) ? (resource as unknown as SpaceResource) : props.space
    const path = isSpace(resource) ? '' : (resource.path || '')
    const opts = createFileRouteOptions(space, { path, fileId: resource.fileId || resource.id })
    return router.resolve(opts).href
  } catch {
    return '#'
  }
}

function navigate(resource: Resource) {
  try {
    const space = isSpace(resource) ? (resource as unknown as SpaceResource) : props.space
    const path = isSpace(resource) ? '' : (resource.path || '')
    const opts = createFileRouteOptions(space, { path, fileId: resource.fileId || resource.id })
    router.push(opts)
  } catch {
    emit('fileClick', { resources: [resource], space: props.space })
  }
}

function onRightClick(resource: Resource) {
  selectedIds.value = [resource.id]
  eventBus.publish('app.files.list.clicked')
  // Open sidebar actions panel
  eventBus.publish('sidebar.open', 'actions')
}

const filteredResources = computed(() => {
  return props.resources.filter(r => !r.name?.startsWith('_type_'))
})
</script>

<style scoped>
.resource-metro-tile {
  aspect-ratio: 4 / 3;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  cursor: pointer;
  padding: 16px;
  position: relative;
  text-decoration: none;
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
