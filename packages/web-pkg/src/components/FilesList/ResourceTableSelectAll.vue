<template>
  <div class="resource-table-select-all flex justify-center items-center">
    <oc-checkbox
      id="resource-table-select-all"
      v-oc-tooltip="selectAllCheckboxLabel"
      size="large"
      :label="selectAllCheckboxLabel"
      :disabled="resources.length === disabledResources.length"
      :label-hidden="true"
      :model-value="areAllResourcesSelected"
      @click.stop="toggleSelectionAll"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Resource } from '@opencloud-eu/web-client'
import { useResourcesStore, useResourceViewSelection } from '../../composables'

/**
 * Isolated "select all" checkbox for the resource table header.
 *
 * It reads the selection state from the store internally so that toggling a
 * selection only re-renders this tiny component - not the whole table (whose
 * header slot would otherwise subscribe to the selection).
 */
const { resources, disabledResources } = defineProps<{
  resources: Resource[]
  disabledResources: string[]
}>()

const emit = defineEmits<{
  (e: 'update:selectedIds', selectedIds: string[]): void
}>()

const resourcesStore = useResourcesStore()
const { selectedIds } = storeToRefs(resourcesStore)

const { areAllResourcesSelected, selectAllCheckboxLabel, toggleSelectionAll } =
  useResourceViewSelection({
    resources: computed(() => resources),
    disabledResources: computed(() => disabledResources),
    selectedIds,
    emit
  })
</script>
