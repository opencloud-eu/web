<template>
  <div class="table-size-selector-mobile mx-auto w-full space-y-4 rounded-lg bg-role-surface p-2">
    <div class="w-full rounded-lg bg-role-surface-container p-4">
      <div class="flex flex-col items-center gap-2">
        <div
          class="table-size-selector-preview-grid grid gap-1"
          :style="{ gridTemplateColumns: `repeat(${maxCols}, 12px)` }"
        >
          <span
            v-for="(cell, index) in totalCells"
            :key="index"
            class="size-3 rounded-sm border transition-colors"
            :class="{
              'border-role-primary bg-role-primary': isSelected(index),
              'border-role-outline-variant bg-role-surface-container-high': !isSelected(index)
            }"
          />
        </div>
        <span class="text-sm font-medium text-role-on-surface">{{ selectedSizeLabel }}</span>
      </div>
    </div>
    <div class="space-y-3 rounded-lg p-2 text-sm font-medium text-role-on-surface">
      <oc-range v-model="selectedRows" :label="$gettext('Rows')" :min="1" :max="maxRows" />
      <oc-range v-model="selectedCols" :label="$gettext('Columns')" :min="1" :max="maxCols" />
    </div>
    <oc-button
      appearance="filled"
      color-role="primary"
      class="w-full"
      justify-content="center"
      data-testid="insert-table-button"
      @click="insertSelectedTable"
    >
      <oc-icon name="table-line" fill-type="line" size-class="size-4" />
      <span>{{ $gettext('Insert table') }}</span>
    </oc-button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'

const { maxRows, maxCols } = defineProps<{
  maxRows: number
  maxCols: number
}>()

const emit = defineEmits<{
  (event: 'insertTable', rows: number, cols: number): void
}>()

const { $gettext } = useGettext()

const totalCells = computed(() => maxRows * maxCols)

const selectedRows = ref(3)
const selectedCols = ref(3)
const selectedSizeLabel = computed(() => `${unref(selectedRows)} × ${unref(selectedCols)}`)

function isSelected(index: number): boolean {
  const row = Math.floor(index / maxCols)
  const col = index % maxCols
  return row < unref(selectedRows) && col < unref(selectedCols)
}

function insertSelectedTable() {
  emit('insertTable', unref(selectedRows), unref(selectedCols))
}
</script>
