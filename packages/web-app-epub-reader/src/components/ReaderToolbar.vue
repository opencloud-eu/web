<template>
  <div class="flex items-center gap-2 px-3 py-2">
    <mobile-chapter-select
      :chapters="chapters"
      :selected-chapter="selectedChapter"
      :chapter-label="chapterLabel"
      @update:selected-chapter="onChapterUpdate"
    />
    <div
      class="ml-auto flex items-center rounded-full bg-role-surface-container-low px-1.5 py-2 shadow-sm"
    >
      <oc-button
        v-oc-tooltip="previousPageLabel"
        :aria-label="previousPageLabel"
        class="epub-reader-controls-navigate-left min-w-9"
        :disabled="navigateLeftDisabled"
        appearance="raw"
        no-hover
        size="small"
        @click="$emit('navigateLeft')"
      >
        &lt;
      </oc-button>
      <oc-button
        v-oc-tooltip="nextPageLabel"
        :aria-label="nextPageLabel"
        class="epub-reader-controls-navigate-right min-w-9"
        :disabled="navigateRightDisabled"
        appearance="raw"
        no-hover
        size="small"
        @click="$emit('navigateRight')"
      >
        &gt;
      </oc-button>
      <span class="mx-1 h-5 w-px bg-role-outline-variant" />
      <oc-button
        v-oc-tooltip="decreaseFontSizeTooltip"
        :aria-label="decreaseFontSizeLabel"
        class="epub-reader-controls-font-size-decrease min-w-9"
        :disabled="decreaseFontSizeDisabled"
        appearance="raw"
        no-hover
        size="small"
        @click="$emit('decreaseFontSize')"
      >
        A-
      </oc-button>
      <oc-button
        v-oc-tooltip="resetFontSizeLabel"
        class="epub-reader-controls-font-size-reset min-w-[64px] px-2 text-sm font-medium"
        appearance="raw"
        no-hover
        size="small"
        @click="$emit('resetFontSize')"
      >
        {{ `${currentFontSizePercentage}%` }}
      </oc-button>
      <oc-button
        v-oc-tooltip="increaseFontSizeTooltip"
        :aria-label="increaseFontSizeLabel"
        class="epub-reader-controls-font-size-increase min-w-9"
        :disabled="increaseFontSizeDisabled"
        appearance="raw"
        no-hover
        size="small"
        @click="$emit('increaseFontSize')"
      >
        A+
      </oc-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NavItem } from 'epubjs'
import MobileChapterSelect from './MobileChapterSelect.vue'

type ChapterOption = NavItem

const props = defineProps<{
  chapters: ChapterOption[]
  selectedChapter?: ChapterOption
  chapterLabel: string
  previousPageLabel: string
  nextPageLabel: string
  decreaseFontSizeLabel: string
  resetFontSizeLabel: string
  increaseFontSizeLabel: string
  currentFontSizePercentage: number
  fontSizeStep: number
  navigateLeftDisabled: boolean
  navigateRightDisabled: boolean
  decreaseFontSizeDisabled: boolean
  increaseFontSizeDisabled: boolean
}>()

const emit = defineEmits<{
  (e: 'update:selectedChapter', value: ChapterOption): void
  (e: 'navigateLeft'): void
  (e: 'navigateRight'): void
  (e: 'decreaseFontSize'): void
  (e: 'resetFontSize'): void
  (e: 'increaseFontSize'): void
}>()

const decreaseFontSizeTooltip = computed(() => {
  return `${props.currentFontSizePercentage - props.fontSizeStep}%`
})
const increaseFontSizeTooltip = computed(() => {
  return `${props.currentFontSizePercentage + props.fontSizeStep}%`
})

function onChapterUpdate(value: ChapterOption) {
  emit('update:selectedChapter', value)
}
</script>
