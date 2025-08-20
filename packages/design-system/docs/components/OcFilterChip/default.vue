<template>
  <oc-filter-chip
    :filter-label="selectedOption?.label || 'Select an option'"
    :selected-item-names="selectedOption?.label ? [selectedOption.label] : []"
    close-on-click
    @clear-filter="clearFilter"
  >
    <template #default>
      <oc-button
        v-for="(option, index) in options"
        :key="index"
        appearance="raw"
        size="medium"
        justify-content="space-between"
        class="flex items-center oc-width-1-1 py-1 px-2"
        :class="{ 'oc-secondary-container': option.id === selectedOption?.id }"
        @click="selectOption(option)"
      >
        <span>{{ option.label }}</span>
        <div v-if="option.id === selectedOption?.id" class="flex">
          <oc-icon name="check" />
        </div>
      </oc-button>
    </template>
  </oc-filter-chip>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type Option = { id: string; label: string }

const selectedOption = ref<Option>()

const options = computed<Option[]>(() => [
  { id: '1', label: 'Option 1' },
  { id: '2', label: 'Option 2' },
  { id: '3', label: 'Option 3' }
])

const selectOption = (option: Option) => {
  selectedOption.value = option

  // handle filter change...
}

const clearFilter = () => {
  selectedOption.value = null
}
</script>
