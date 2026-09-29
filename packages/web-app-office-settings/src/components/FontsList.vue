<template>
  <no-content-message
    v-if="!filteredFonts.length"
    id="office-settings-fonts-empty-filtered"
    icon="font-size"
    icon-fill-type="none"
  >
    <template #message>
      <span v-text="$gettext('No fonts found')" />
    </template>
    <template #callToAction>
      <span v-text="$gettext('Try refining the search term to get results')" />
    </template>
  </no-content-message>
  <oc-table
    v-else
    data-testid="fonts-table"
    id-key="file"
    :sort-by="sortBy"
    :sort-dir="sortDir"
    :fields="fields"
    :data="items"
    :hover="true"
    class="fonts-table"
    @sort="handleSort"
  >
    <template #family="{ item }">
      <oc-filter-highlight :text="item.family" :term="filterTerm" />
    </template>
    <template #preview="{ item }">
      <img v-if="previewUrls[item.file]" :src="previewUrls[item.file]" alt="" class="max-h-8" />
    </template>
    <template #version="{ item }">
      <span v-text="item.version || '—'" />
    </template>
    <template #designer="{ item }">
      <span v-text="item.designer || '—'" />
    </template>
    <template #actions="{ item }">
      <oc-button
        v-oc-tooltip="$gettext('Delete')"
        :aria-label="$gettext('Delete')"
        appearance="raw"
        @click="emit('delete', item)"
      >
        <oc-icon name="delete-bin" fill-type="line" size-class="size-4" />
      </oc-button>
    </template>
  </oc-table>
</template>

<script setup lang="ts">
import { NoContentMessage, SortField, useSort } from '@opencloud-eu/web-pkg'
import { SortDir } from '@opencloud-eu/design-system/helpers'
import { OcFilterHighlight } from '@opencloud-eu/design-system/components'
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { Font } from '../types'

const {
  fonts,
  previewUrls,
  filterTerm = ''
} = defineProps<{
  fonts: Font[]
  previewUrls: Record<string, string>
  filterTerm?: string
}>()

const emit = defineEmits<{
  (e: 'delete', font: Font): void
}>()

const { $gettext } = useGettext()

const filteredFonts = computed(() => {
  const term = filterTerm.toLowerCase()
  if (!term) {
    return fonts
  }

  return fonts.filter((font) =>
    String(font.family || '')
      .toLowerCase()
      .includes(term)
  )
})

const sortFields: SortField[] = [{ name: 'family', sortable: true, sortDir: SortDir.Asc }]
const { sortBy, sortDir, items, handleSort } = useSort<Font>({
  items: filteredFonts,
  fields: sortFields
})

const fields = computed(() => [
  {
    name: 'family',
    title: $gettext('Name'),
    type: 'slot',
    sortable: true,
    thClass: 'pl-4',
    tdClass: 'pl-4'
  },
  {
    name: 'preview',
    title: $gettext('Preview'),
    type: 'slot',
    width: 'expand' as const
  },
  {
    name: 'version',
    title: $gettext('Version'),
    type: 'slot',
    width: 'shrink' as const,
    wrap: 'nowrap' as const,
    thClass: 'hidden md:table-cell',
    tdClass: 'hidden md:table-cell'
  },
  {
    name: 'designer',
    title: $gettext('Designer'),
    type: 'slot',
    width: 'shrink' as const,
    wrap: 'nowrap' as const,
    thClass: 'hidden md:table-cell',
    tdClass: 'hidden md:table-cell'
  },
  {
    name: 'actions',
    title: $gettext('Actions'),
    type: 'slot',
    alignH: 'right' as const,
    width: 'shrink' as const,
    thClass: 'pr-4',
    tdClass: 'pr-4'
  }
])
</script>
