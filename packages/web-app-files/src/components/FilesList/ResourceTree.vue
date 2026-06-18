<template>
  <div class="resource-tree">
    <!-- Header row -->
    <div class="resource-tree-header flex items-center py-1.5 px-2 border-b-2 border-role-outline text-xs font-semibold opacity-60">
      <span class="flex-1" style="padding-left: 60px">{{ $gettext('Name') }}</span>
      <span class="w-16 text-right mr-4">{{ $gettext('Size') }}</span>
      <span class="w-36 text-right mr-4">{{ $gettext('Modified') }}</span>
    </div>

    <!-- Data rows -->
    <div
      v-for="resource in visibleResources"
      :key="resource.id + '-' + (resource._depth || 0)"
    >
      <div
        class="resource-tree-row flex items-center py-1.5 px-2 cursor-pointer hover:bg-role-surface-container-highlight border-b border-role-outline"
        :style="{ paddingLeft: `${(resource._depth || 0) * 20 + 8}px` }"
      >
        <!-- Expand toggle -->
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

        <!-- Name + icon (clickable) -->
        <div
          class="flex items-center flex-1 min-w-0 cursor-pointer"
          @click="handleClick(resource)"
        >
          <oc-resource-icon :resource="resource" size="small" class="mr-2 shrink-0" />
          <span class="truncate text-sm">{{ resource.name }}</span>
          <oc-spinner v-if="isLoading(resource.id)" size="xsmall" class="ml-2" />
        </div>

        <!-- Size -->
        <span class="text-xs opacity-50 w-16 text-right mr-4 whitespace-nowrap shrink-0">
          {{ resource.type !== 'folder' ? formatSize(resource.size) : '' }}
        </span>

        <!-- Modified -->
        <span class="text-xs opacity-50 w-36 text-right mr-4 whitespace-nowrap shrink-0">
          {{ formatDate(resource.mdate) }}
        </span>
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
import { useClientService, formatDateFromJSDate, formatFileSize } from '@opencloud-eu/web-pkg'
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

const emit = defineEmits(['fileClick', 'fileDropped', 'itemVisible', 'sort', 'update:selectedIds'])

const selectedIds = defineModel<string[]>('selectedIds', { default: () => [] })

const { $gettext, current: currentLanguage } = useGettext()
const clientService = useClientService()

const expanded = ref(new Set<string>())
const childrenMap = ref(new Map<string, Resource[]>())
const loadingSet = ref(new Set<string>())

function isExpanded(id: string) { return expanded.value.has(id) }
function isLoading(id: string) { return loadingSet.value.has(id) }

function formatSize(size: number) {
  return formatFileSize(size, currentLanguage)
}

function formatDate(date: string) {
  if (!date) return ''
  return formatDateFromJSDate(new Date(date), currentLanguage)
}

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
    const ls = new Set(loadingSet.value)
    ls.add(id)
    loadingSet.value = ls

    try {
      const { children } = await clientService.webdav.listFiles(props.space, { path: resource.path })
      childrenMap.value = new Map([...childrenMap.value, [id, children]])
    } catch {
      childrenMap.value = new Map([...childrenMap.value, [id, []]])
    } finally {
      const ls2 = new Set(loadingSet.value)
      ls2.delete(id)
      loadingSet.value = ls2
    }
  }
}

function handleClick(resource: Resource) {
  emit('fileClick', { resources: [resource], space: props.space })
}

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
  width: 24px;
  height: 24px;
  margin-right: 4px;
  border-radius: 4px;
  shrink: 0;
}
.tree-expand-btn:hover {
  background: rgba(0, 0, 0, 0.08);
}
.tree-expand-spacer {
  display: inline-block;
  width: 24px;
  margin-right: 4px;
  flex-shrink: 0;
}
</style>
