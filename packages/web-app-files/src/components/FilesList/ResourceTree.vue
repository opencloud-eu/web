<template>
  <div class="resource-tree">
    <table class="resource-tree-table w-full text-sm">
      <tbody>
        <tr
          v-for="resource in visibleResources"
          :key="resource.id"
          class="resource-tree-row hover:bg-role-surface-container-highlight cursor-pointer border-b border-role-outline"
          @click="handleClick(resource)"
        >
          <td class="py-1.5 whitespace-nowrap" :style="{ paddingLeft: `${(resource._depth || 0) * 20 + 8}px` }">
            <div class="flex items-center">
              <button
                v-if="resource.type === 'folder'"
                class="tree-toggle mr-1"
                @click.stop="toggleExpand(resource)"
              >
                <oc-icon
                  :name="isExpanded(resource.id) ? 'arrow-down-s' : 'arrow-right-s'"
                  size="small"
                />
              </button>
              <span v-else class="inline-block w-5 mr-1" />
              <oc-resource-icon :resource="resource" size="small" class="mr-2 shrink-0" />
              <span class="truncate">{{ resource.name }}</span>
              <oc-spinner v-if="isLoading(resource.id)" size="xsmall" class="ml-2" />
            </div>
          </td>
          <td class="py-1.5 text-right opacity-50 pr-4 whitespace-nowrap">
            {{ resource.type === 'folder' ? '' : formatSize(resource.size) }}
          </td>
          <td class="py-1.5 text-right opacity-50 pr-4 whitespace-nowrap">
            {{ formatDate(resource.mdate) }}
          </td>
        </tr>
      </tbody>
    </table>
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

const emit = defineEmits<{
  'fileClick': [{ resources: Resource[], space: SpaceResource }]
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

function formatDate(date: string) {
  if (!date) return ''
  return formatDateFromJSDate(new Date(date), currentLanguage)
}

async function toggleExpand(resource: Resource) {
  const id = resource.id
  if (expanded.value.has(id)) {
    expanded.value = new Set([...expanded.value].filter(x => x !== id))
    return
  }

  expanded.value = new Set([...expanded.value, id])

  if (!childrenMap.value.has(id)) {
    loadingSet.value = new Set([...loadingSet.value, id])
    try {
      const { children } = await clientService.webdav.listFiles(props.space, { path: resource.path })
      childrenMap.value = new Map([...childrenMap.value, [id, children]])
    } catch {
      childrenMap.value = new Map([...childrenMap.value, [id, []]])
    } finally {
      loadingSet.value = new Set([...loadingSet.value].filter(x => x !== id))
    }
  }
}

function handleClick(resource: Resource) {
  emit('fileClick', { resources: [resource], space: props.space })
}

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

watch(() => props.resources, () => {
  expanded.value = new Set()
  childrenMap.value = new Map()
})
</script>

<style scoped>
.tree-toggle {
  background: none;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  padding: 2px;
}
.tree-toggle:hover {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}
</style>
