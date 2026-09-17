<template>
  <div class="table-size-selector" :class="isMobile ? 'w-full' : 'w-auto min-w-max'">
    <text-editor-table-size-selector-mobile
      v-if="isMobile"
      :max-rows="maxRows"
      :max-cols="maxCols"
      @insert-table="insertTable"
    />
    <div v-else class="table-size-selector-desktop">
      <div
        class="table-size-selector-grid grid"
        :style="{
          gridTemplateColumns: `repeat(${maxCols}, 16px)`,
          gap: '4px'
        }"
        @mouseleave="resetHover"
      >
        <div
          v-for="(cell, index) in totalCells"
          :key="index"
          class="h-4 w-4 cursor-pointer rounded border transition-colors"
          :class="{
            'border-role-primary bg-role-primary': isHighlighted(index),
            'border-role-outline-variant bg-transparent': !isHighlighted(index)
          }"
          @mouseenter="updateHover(index)"
          @click="selectHoveredSize"
        />
      </div>
      <div class="mt-3 min-h-[1.25rem] text-center text-sm text-role-on-surface-variant">
        {{ gridLabel }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, unref } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { useIsMobile } from '@opencloud-eu/design-system/composables'
import TextEditorTableSizeSelectorMobile from './TextEditorTableSizeSelectorMobile.vue'

const { editor, closeMenu } = defineProps<{
  editor: Editor
  closeMenu: () => void
}>()

const { isMobile } = useIsMobile()

const maxRows = 9
const maxCols = 9
const totalCells = maxRows * maxCols

const hoveredIndex = ref(-1)
const hoveredRow = computed(() => Math.floor(unref(hoveredIndex) / maxCols) + 1)
const hoveredCol = computed(() => (unref(hoveredIndex) % maxCols) + 1)

const gridLabel = computed(() => {
  if (unref(hoveredIndex) === -1) {
    return ' '
  }
  return `${unref(hoveredRow)} × ${unref(hoveredCol)}`
})

function isHighlighted(index: number): boolean {
  if (unref(hoveredIndex) === -1) {
    return false
  }
  const row = Math.floor(index / maxCols)
  const col = index % maxCols
  return row < unref(hoveredRow) && col < unref(hoveredCol)
}

function updateHover(index: number) {
  hoveredIndex.value = index
}

function resetHover() {
  hoveredIndex.value = -1
}

function insertTable(rows: number, cols: number) {
  editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
  closeMenu()
}

function selectHoveredSize() {
  if (unref(hoveredIndex) === -1) {
    return
  }
  insertTable(unref(hoveredRow), unref(hoveredCol))
}
</script>
