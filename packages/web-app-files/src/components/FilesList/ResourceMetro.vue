<template>
  <div class="resource-metro grid gap-3 p-4" :style="gridStyle">
    <div
      v-for="resource in filteredResources"
      :key="resource.id"
      class="resource-metro-tile"
      :class="tileClass(resource)"
      @click="handleClick(resource)"
    >
      <div class="text-center p-4">
        <oc-resource-icon :resource="resource" size="large" class="mb-2 mx-auto" />
        <div class="resource-metro-name text-sm font-bold leading-tight">
          {{ resource.name }}
        </div>
      </div>
    </div>
    <div v-if="!filteredResources.length" class="col-span-full p-4 text-sm opacity-50 text-center">
      {{ $gettext('No items') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'

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

const emit = defineEmits<{
  'fileClick': [{ resources: Resource[], space: SpaceResource }]
  'fileDropped': [string]
  'itemVisible': [Resource]
  'sort': [{ sortBy: string; sortDir: string }]
}>()

const selectedIds = defineModel<string[]>('selectedIds', { default: () => [] })

const { $gettext } = useGettext()

// Deterministic color class based on name hash
const colorClasses = [
  'metro-color-0', 'metro-color-1', 'metro-color-2', 'metro-color-3', 'metro-color-4',
  'metro-color-5', 'metro-color-6', 'metro-color-7', 'metro-color-8', 'metro-color-9'
]

function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function tileClass(resource: Resource): string {
  return colorClasses[hashName(resource.name) % colorClasses.length]
}

function handleClick(resource: Resource) {
  emit('fileClick', { resources: [resource], space: props.space })
}

const filteredResources = computed(() => {
  return props.resources.filter(r => !r.name?.startsWith('_type_'))
})

const gridStyle = computed(() => {
  const size = props.viewSize || 3
  const cols = Math.max(2, Math.min(6, size + 1))
  return {
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`
  }
})
</script>

<style scoped>
.resource-metro-tile {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  border: 1px solid rgba(0, 0, 0, 0.06);
}
.resource-metro-tile:hover {
  transform: scale(1.03);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: rgba(0, 0, 0, 0.15);
}
.metro-color-0 { background: #1565c0; color: #fff; }
.metro-color-1 { background: #2e7d32; color: #fff; }
.metro-color-2 { background: #e65100; color: #fff; }
.metro-color-3 { background: #ad1457; color: #fff; }
.metro-color-4 { background: #6a1b9a; color: #fff; }
.metro-color-5 { background: #00695c; color: #fff; }
.metro-color-6 { background: #f9a825; color: #333; }
.metro-color-7 { background: #283593; color: #fff; }
.metro-color-8 { background: #bf360c; color: #fff; }
.metro-color-9 { background: #00838f; color: #fff; }
</style>
