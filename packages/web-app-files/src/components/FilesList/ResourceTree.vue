<template>
  <table class="oc-table oc-table-hover oc-table-sticky has-item-context-menu condensed files-table" id="files-tree-table">
    <thead class="oc-thead border-b">
      <tr class="oc-table-header-row h-10.5">
        <th class="oc-table-cell text-left align-middle min-w-38 oc-th pl-4">Name</th>
        <th class="oc-table-cell text-right align-middle w-px oc-th">Größe</th>
        <th class="oc-table-cell text-right align-middle w-px oc-th pr-4">Bearbeitet</th>
      </tr>
    </thead>
    <tbody class="has-item-context-menu">
      <tr
        v-for="entry in flatTree"
        :key="entry.resource.id + '-' + entry.depth"
        class="oc-tbody-tr border-t h-10.5 cursor-pointer hover:bg-role-surface-container-highlight"
        @click="handleClick(entry.resource)"
      >
        <td class="oc-table-cell text-left align-middle min-w-38 oc-td pl-4">
          <div class="flex items-center" :style="{ paddingLeft: entry.depth * 20 + 'px' }">
            <button
              v-if="entry.resource.type === 'folder'"
              class="tree-btn"
              @click.stop="toggleExpand(entry.resource)"
            >
              <oc-icon
                :name="isExpanded(entry.resource.id) ? 'arrow-down-s' : 'arrow-right-s'"
                size="small"
              />
            </button>
            <span v-else class="tree-spacer" />
            <resource-icon :resource="entry.resource" size="small" class="mr-2 shrink-0" />
            <span class="truncate text-sm">{{ entry.resource.name }}</span>
            <oc-spinner v-if="isLoading(entry.resource.id)" size="xsmall" class="ml-2" />
          </div>
        </td>
        <td class="oc-table-cell text-right align-middle w-px oc-td whitespace-nowrap text-sm opacity-50">
          {{ entry.resource.type !== 'folder' ? formatSize(entry.resource.size) : '' }}
        </td>
        <td class="oc-table-cell text-right align-middle w-px oc-td pr-4 whitespace-nowrap text-sm opacity-50">
          {{ formatDate(entry.resource.mdate) }}
        </td>
      </tr>
    </tbody>
  </table>
  <div v-if="!flatTree.length" class="p-4 text-sm opacity-50">No items</div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { ResourceIcon, useClientService, useResourcesStore, formatDateFromJSDate, formatFileSize, createFileRouteOptions } from '@opencloud-eu/web-pkg'
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

const { current: currentLanguage } = useGettext()
const clientService = useClientService()
const router = useRouter()
const resourcesStore = useResourcesStore()

const expanded = ref(new Set<string>())
const childrenMap = ref(new Map<string, Resource[]>())
const loadingSet = ref(new Set<string>())

function isExpanded(id: string) { return expanded.value.has(id) }
function isLoading(id: string) { return loadingSet.value.has(id) }
function formatSize(size: number | string) { return formatFileSize(Number(size), currentLanguage) }
function formatDate(date: string) { return date ? formatDateFromJSDate(new Date(date), currentLanguage) : '' }

async function toggleExpand(resource: Resource) {
  const id = resource.id
  const next = new Set(expanded.value)
  if (next.has(id)) { next.delete(id); expanded.value = next; return }
  next.add(id)
  expanded.value = next

  if (!childrenMap.value.has(id)) {
    loadingSet.value = new Set([...loadingSet.value, id])
    try {
      const { children } = await clientService.webdav.listFiles(props.space, { path: resource.path })
      childrenMap.value = new Map([...childrenMap.value, [id, children]])
      children.forEach(c => resourcesStore.upsertResource(c))
    } catch {
      childrenMap.value = new Map([...childrenMap.value, [id, []]])
    } finally {
      const ls = new Set(loadingSet.value); ls.delete(id); loadingSet.value = ls
    }
  }
}

function handleClick(resource: Resource) {
  if (resource.type === 'folder') {
    const opts = createFileRouteOptions(props.space, resource)
    router.push(opts)
  } else {
    emit('fileClick', { resources: [resource], space: props.space })
  }
}

const flatTree = computed(() => {
  const result: { resource: Resource; depth: number }[] = []
  function walk(resources: Resource[], depth: number) {
    for (const r of resources) {
      if (r.name?.startsWith('_type_')) continue
      result.push({ resource: r, depth })
      if (r.type === 'folder' && expanded.value.has(r.id) && childrenMap.value.has(r.id)) {
        walk(childrenMap.value.get(r.id)!, depth + 1)
      }
    }
  }
  walk(props.resources.filter(r => !r.name?.startsWith('_type_')), 0)
  return result
})

watch(() => props.resources, () => { expanded.value = new Set(); childrenMap.value = new Map() })
</script>

<style scoped>
.tree-btn {
  background: none; border: none; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; margin-right: 4px; border-radius: 4px; flex-shrink: 0;
}
.tree-btn:hover { background: rgba(0,0,0,0.08); }
.tree-spacer { display: inline-block; width: 20px; margin-right: 4px; flex-shrink: 0; }
</style>
