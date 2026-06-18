<template>
  <div class="resource-tree">
    <resource-table
      v-model:selected-ids="selectedIds"
      :resources="visibleResources"
      :view-mode="'resource-table-condensed'"
      :space="space"
      :header-position="headerPosition"
      :sort-by="sortBy"
      :sort-dir="sortDir"
      :sort-fields="sortFields"
      @file-click="handleFileClick"
      @sort="handleSort"
    >
      <!-- Expand toggle + indent + icon (image slot replaces default icon, so we re-add it) -->
      <template #image="{ resource }">
        <div class="tree-indent flex items-center" :style="{ marginLeft: `${(resource._depth || 0) * 20}px` }">
          <button
            v-if="resource.type === 'folder'"
            class="tree-expand-btn"
            @click.stop="toggleExpand(resource)"
          >
            <oc-icon
              :name="isExpanded(resource.id) ? 'arrow-down-s' : 'arrow-right-s'"
              size="small"
            />
          </button>
          <span v-else class="tree-expand-spacer" />
          <resource-icon :resource="resource" size="medium" class="mr-1" />
          <oc-spinner v-if="isLoading(resource.id)" size="xsmall" class="ml-1" />
        </div>
      </template>

      <template #contextMenu="{ resource }">
        <slot name="contextMenu" :resource="resource" />
      </template>

      <template #footer>
        <slot name="footer" />
      </template>
    </resource-table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { ResourceTable, ResourceIcon, useClientService, useResourcesStore } from '@opencloud-eu/web-pkg'

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
const clientService = useClientService()
const resourcesStore = useResourcesStore()

const expanded = ref(new Set<string>())
const childrenMap = ref(new Map<string, Resource[]>())
const loadingSet = ref(new Set<string>())

function isExpanded(id: string) { return expanded.value.has(id) }
function isLoading(id: string) { return loadingSet.value.has(id) }

async function toggleExpand(resource: Resource) {
  const id = resource.id
  const next = new Set(expanded.value)

  if (next.has(id)) {
    next.delete(id)
    expanded.value = next
    return
  }

  next.add(id)
  expanded.value = next

  if (!childrenMap.value.has(id)) {
    loadingSet.value = new Set([...loadingSet.value, id])
    try {
      const { children } = await clientService.webdav.listFiles(props.space, { path: resource.path })
      childrenMap.value = new Map([...childrenMap.value, [id, children]])
      // Add to store so batch actions and selections work
      children.forEach((child) => resourcesStore.upsertResource(child))
    } catch {
      childrenMap.value = new Map([...childrenMap.value, [id, []]])
    } finally {
      const ls = new Set(loadingSet.value)
      ls.delete(id)
      loadingSet.value = ls
    }
  }
}

function handleFileClick(options: any) { emit('fileClick', options) }
function handleSort(options: any) { emit('sort', options) }

const visibleResources = computed(() => {
  const result: (Resource & { _depth?: number })[] = []

  function walk(resources: Resource[], depth: number) {
    for (const r of resources) {
      if (r.name?.startsWith('_type_')) continue
      result.push({ ...r, _depth: depth })
      if (r.type === 'folder' && expanded.value.has(r.id) && childrenMap.value.has(r.id)) {
        walk(childrenMap.value.get(r.id)!, depth + 1)
      }
    }
  }

  walk(props.resources.filter(r => !r.name?.startsWith('_type_')), 0)
  return result
})

watch(() => props.resources, () => {
  expanded.value = new Set()
  childrenMap.value = new Map()
})
</script>

<style scoped>
.tree-expand-btn {
  background: none;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 2px;
  border-radius: 4px;
  flex-shrink: 0;
}
.tree-expand-btn:hover {
  background: rgba(0, 0, 0, 0.08);
}
.tree-expand-spacer {
  display: inline-block;
  width: 20px;
  margin-right: 2px;
  flex-shrink: 0;
}
</style>
