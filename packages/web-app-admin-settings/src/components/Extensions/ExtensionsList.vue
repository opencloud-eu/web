<template>
  <no-content-message
    v-if="!filteredExtensions.length"
    id="admin-settings-extensions-empty-filtered"
    img-src="/images/empty-states/empty-extensions.svg"
  >
    <template #message>
      <span v-text="$gettext('No extensions found')" />
    </template>
    <template #callToAction>
      <span v-text="$gettext('Try refining the search term or filters to get results')" />
    </template>
  </no-content-message>
  <oc-table
    v-else
    :data-testid="'extensions-table'"
    :sort-by="sortBy"
    :sort-dir="sortDir"
    :fields="fields"
    :data="items"
    :hover="true"
    :sticky="true"
    class="extensions-table"
    @sort="handleSort"
  >
    <template #name="{ item }">
      <div class="flex items-center gap-2">
        <oc-icon :name="item.icon || 'puzzle'" size-class="size-5" fill-type="line" />
        <span v-text="item.name" />
      </div>
    </template>
    <template #version="{ item }">
      <span v-text="item.version || '—'" />
    </template>
    <template #status="{ item }">
      <oc-tag
        v-if="item.loaded"
        appearance="filled"
        size="small"
        class="border-0 !rounded-sm !bg-green-200 !text-green-900"
      >
        <span v-text="$gettext('Active')" />
      </oc-tag>
      <oc-tag
        v-else
        appearance="filled"
        size="small"
        class="border-0 !rounded-sm !bg-red-200 !text-red-900"
      >
        <span v-text="$gettext('Failed')" />
      </oc-tag>
    </template>
  </oc-table>
</template>

<script setup lang="ts">
import { NoContentMessage } from '@opencloud-eu/web-pkg'
import { SortDir } from '@opencloud-eu/design-system/helpers'
import { computed, ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'

interface ExtensionInfo {
  name: string
  icon?: string
  version?: string
  loaded: boolean
}

const { extensions, filterTerm = '' } = defineProps<{
  extensions: ExtensionInfo[]
  filterTerm?: string
}>()

const { $gettext } = useGettext()
const sortBy = ref<keyof ExtensionInfo>('name')
const sortDir = ref<SortDir>(SortDir.Asc)

const filteredExtensions = computed(() => {
  const term = unref(filterTerm).toLowerCase()
  if (!term) {
    return unref(extensions)
  }

  return unref(extensions).filter((extension) => {
    const name = String(extension.name || '').toLowerCase()
    return name.includes(term)
  })
})

const items = computed(() => {
  return [...unref(filteredExtensions)].sort((a, b) => {
    const c = (a[unref(sortBy)] || '').toString()
    const d = (b[unref(sortBy)] || '').toString()
    return unref(sortDir) === SortDir.Desc ? d.localeCompare(c) : c.localeCompare(d)
  })
})

function handleSort(event: { sortBy: string; sortDir: SortDir }) {
  sortBy.value = event.sortBy as keyof ExtensionInfo
  sortDir.value = event.sortDir
}

const fields = computed(() => [
  {
    name: 'name',
    title: $gettext('Name'),
    type: 'slot',
    sortable: true,
    thClass: 'pl-4',
    tdClass: 'pl-4',
    width: 'expand' as const
  },
  {
    name: 'version',
    title: $gettext('Version'),
    type: 'slot',
    width: 'shrink' as const
  },
  {
    name: 'status',
    title: $gettext('Status'),
    type: 'slot',
    width: 'shrink' as const
  }
])
</script>
