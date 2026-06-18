<template>
  <div class="resource-metro grid gap-3 p-4" :style="gridStyle">
    <div
      v-for="resource in filteredResources"
      :key="resource.id"
      class="resource-metro-tile flex items-center justify-center rounded-lg cursor-pointer transition-all hover:scale-105 hover:shadow-lg"
      :style="tileStyle(resource)"
      @click="handleClick(resource)"
    >
      <div class="text-center p-3">
        <oc-resource-icon :resource="resource" size="large" class="mb-2 mx-auto" />
        <div class="resource-metro-name text-sm font-medium leading-tight" :style="{ color: textColor(resource) }">
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
  'fileClick': [{ resources: Resource[], space: SpaceResource, event: Event }]
  'fileDropped': [string]
  'itemVisible': [Resource]
  'sort': [{ sortBy: string; sortDir: string }]
}>()

const selectedIds = defineModel<string[]>('selectedIds', { default: () => [] })

const { $gettext } = useGettext()

// Color palette for tiles — deterministic based on name hash
const colors = [
  '#e3f2fd', '#e8f5e9', '#fff3e0', '#fce4ec', '#f3e5f5',
  '#e0f2f1', '#fff8e1', '#e8eaf6', '#fbe9e7', '#e0f7fa',
  '#f1f8e9', '#ede7f6', '#efebe9', '#eceff1', '#e1f5fe'
]

function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function tileColor(resource: Resource): string {
  return colors[hashName(resource.name) % colors.length]
}

function tileStyle(resource: Resource) {
  return {
    background: tileColor(resource),
    minHeight: '120px'
  }
}

function textColor(resource: Resource): string {
  // Dark text on light backgrounds
  return '#333'
}

function handleClick(resource: Resource) {
  emit('fileClick', { resources: [resource], space: props.space, event: new MouseEvent('click') })
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
  border: 1px solid rgba(0, 0, 0, 0.06);
}
.resource-metro-tile:hover {
  border-color: rgba(0, 0, 0, 0.15);
}
</style>
