<template>
  <div class="table-size-selector min-w-max">
    <div
      ref="gridRef"
      class="grid"
      :style="{
        gridTemplateColumns: `repeat(${maxCols}, 16px)`,
        gap: '4px'
      }"
      @mouseleave="resetHover"
    >
      <div
        v-for="(cell, index) in totalCells"
        :key="index"
        class="w-4 h-4 cursor-pointer rounded border transition-colors"
        :class="{
          'border-role-primary bg-role-primary': isHighlighted(index),
          'border-role-outline-variant bg-transparent': !isHighlighted(index)
        }"
        @mouseenter="updateHover(index)"
        @click="selectSize"
      />
    </div>
    <div class="mt-3 text-center text-sm text-role-on-surface-variant min-h-[1.25rem]">
      {{ gridLabel }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Editor } from '@tiptap/vue-3'

const { editor, closeMenu } = defineProps<{
  editor: Editor
  closeMenu: () => void
}>()

const maxRows = 9
const maxCols = 9
const totalCells = maxRows * maxCols

const hoveredIndex = ref(-1)
const hoveredRow = computed(() => Math.floor(hoveredIndex.value / maxCols) + 1)
const hoveredCol = computed(() => (hoveredIndex.value % maxCols) + 1)

const gridLabel = computed(() => {
  if (hoveredIndex.value === -1) {
    return ' '
  }
  return `${hoveredRow.value} × ${hoveredCol.value}`
})

function isHighlighted(index: number): boolean {
  if (hoveredIndex.value === -1) {
    return false
  }
  const row = Math.floor(index / maxCols)
  const col = index % maxCols
  return row < hoveredRow.value && col < hoveredCol.value
}

function updateHover(index: number) {
  hoveredIndex.value = index
}

function resetHover() {
  hoveredIndex.value = -1
}

function selectSize() {
  if (hoveredIndex.value === -1) {
    return
  }
  editor
    .chain()
    .focus()
    .insertTable({ rows: hoveredRow.value, cols: hoveredCol.value, withHeaderRow: true })
    .run()
  closeMenu()
}
</script>
