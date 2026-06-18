<template>
  <div class="resource-tree">
    <div
      v-for="resource in visibleResources"
      :key="resource.id"
      class="resource-tree-node"
    >
      <div
        class="resource-tree-row flex items-center py-1.5 px-4 cursor-pointer hover:bg-role-surface-container-highlight"
        :style="{ paddingLeft: `${(resource._depth || 0) * 24 + 16}px` }"
        @click="handleClick(resource)"
      >
        <button
          v-if="resource.type === 'folder'"
          class="tree-toggle mr-1 p-0.5"
          @click.stop="toggleExpand(resource)"
        >
          <oc-icon
            :name="isExpanded(resource.id) ? 'arrow-down-s' : 'arrow-right-s'"
            size="small"
          />
        </button>
        <span v-else class="tree-toggle-spacer mr-1 w-5" />
        <oc-resource-icon :resource="resource" size="small" class="mr-2" />
        <span class="resource-tree-name flex-1 truncate text-sm">{{ resource.name }}</span>
        <span class="resource-tree-size text-xs opacity-50 ml-4">
          {{ resource.type === 'folder' ? '' : formatSize(resource.size) }}
        </span>
      </div>
      <div v-if="isExpanded(resource.id) && isLoading(resource.id)" class="pl-12 py-1">
        <oc-spinner size="xsmall" />
      </div>
    </div>
    <div v-if="!visibleResources.length" class="p-4 text-sm opacity-50">
      {{ $gettext('No items') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useClientService } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import { formatFileSize } from '@opencloud-eu/web-pkg'

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

const { $gettext, current: currentLanguage } = useGettext()
const clientService = useClientService()

const expanded = ref<Set<string>>(new Set())
const childrenMap = ref<Map<string, Resource[]>>(new Map())
const loadingSet = ref<Set<string>>(new Set())

function isExpanded(id: string) { return expanded.value.has(id) }
function isLoading(id: string) { return loadingSet.value.has(id) }

function formatSize(size: number) {
  return formatFileSize(size, currentLanguage)
}

async function toggleExpand(resource: Resource) {
  const id = resource.id
  if (expanded.value.has(id)) {
    expanded.value.delete(id)
    expanded.value = new Set(expanded.value)
    return
  }

  expanded.value.add(id)
  expanded.value = new Set(expanded.value)

  if (!childrenMap.value.has(id)) {
    loadingSet.value.add(id)
    loadingSet.value = new Set(loadingSet.value)
    try {
      const { children } = await clientService.webdav.listFiles(props.space, { path: resource.path })
      childrenMap.value.set(id, children)
      childrenMap.value = new Map(childrenMap.value)
    } catch {
      childrenMap.value.set(id, [])
    } finally {
      loadingSet.value.delete(id)
      loadingSet.value = new Set(loadingSet.value)
    }
  }
}

function handleClick(resource: Resource) {
  emit('fileClick', { resources: [resource], space: props.space, event: new MouseEvent('click') })
}

// Flatten tree into visible list
const visibleResources = computed(() => {
  const result: (Resource & { _depth?: number })[] = []

  function addLevel(resources: Resource[], depth: number) {
    for (const r of resources) {
      if (r.name?.startsWith('_type_')) continue
      result.push({ ...r, _depth: depth })
      if (r.type === 'folder' && expanded.value.has(r.id) && childrenMap.value.has(r.id)) {
        addLevel(childrenMap.value.get(r.id)!, depth + 1)
      }
    }
  }

  addLevel(props.resources.filter(r => !r.name?.startsWith('_type_')), 0)
  return result
})

// Reset when resources change (navigated to different folder)
watch(() => props.resources, () => {
  expanded.value = new Set()
  childrenMap.value = new Map()
})
</script>

<style scoped>
.resource-tree-row:hover {
  background: var(--oc-color-background-hover);
}
.tree-toggle {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
}
</style>
