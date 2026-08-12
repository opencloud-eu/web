<template>
  <div class="flex items-center gap-1 px-2 py-2 sm:gap-2 sm:px-3">
    <mobile-chapter-select
      :chapters="chapters"
      :selected-chapter="selectedChapter"
      :chapter-label="chapterLabel"
      @update:selected-chapter="onChapterUpdate"
    />
    <div
      class="ml-auto shrink-0 flex items-center rounded-full bg-role-surface-container-low px-1 py-1.5 shadow-sm sm:px-1.5 sm:py-2"
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
        <oc-icon name="arrow-left-s" fill-type="line" size-class="size-4" />
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
        <oc-icon name="arrow-right-s" fill-type="line" size-class="size-4" />
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
      <span class="mx-1 h-5 w-px bg-role-outline-variant" />
      <oc-button
        id="epub_reader_text_search_toggle"
        v-oc-tooltip="searchLabel"
        :aria-label="searchLabel"
        class="epub-reader-controls-text-search min-w-9"
        appearance="raw"
        no-hover
        size="small"
      >
        <oc-icon name="search" fill-type="line" size-class="size-4" />
      </oc-button>
      <reader-text-search
        toggle="#epub_reader_text_search_toggle"
        :search-label="searchLabel"
        :search-placeholder="searchPlaceholder"
        :searching="isSearchLoading"
        :searching-label="searchingLabel"
        :result-count="searchResultCount"
        :current-result-index="currentSearchResultIndex"
        :can-go-to-previous-result="canGoToPreviousSearchResult"
        :can-go-to-next-result="canGoToNextSearchResult"
        :previous-result-label="previousSearchResultLabel"
        :next-result-label="nextSearchResultLabel"
        :close-search-label="closeSearchLabel"
        @search-term-changed="$emit('searchTermChanged', $event)"
        @go-to-previous-result="$emit('goToPreviousSearchResult')"
        @go-to-next-result="$emit('goToNextSearchResult')"
        @close-search="$emit('closeSearch')"
      />
      <span class="mx-1 hidden h-5 w-px bg-role-outline-variant sm:inline" />
      <oc-button
        v-oc-tooltip="fullscreenLabel"
        :aria-label="fullscreenLabel"
        class="epub-reader-controls-fullscreen hidden min-w-9 sm:inline-flex"
        appearance="raw"
        no-hover
        size="small"
        @click="$emit('toggleFullscreen')"
      >
        <oc-icon
          :name="isFullScreenModeActivated ? 'fullscreen-exit' : 'fullscreen'"
          fill-type="line"
          size-class="size-4"
        />
      </oc-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NavItem } from 'epubjs'
import MobileChapterSelect from './MobileChapterSelect.vue'
import ReaderTextSearch from './ReaderTextSearch.vue'

type ChapterOption = NavItem
const props = defineProps<{
  chapters: ChapterOption[]
  selectedChapter?: ChapterOption
  chapterLabel: string
  searchLabel: string
  searchPlaceholder: string
  searchingLabel: string
  searchResultCount: number
  currentSearchResultIndex: number
  canGoToPreviousSearchResult: boolean
  canGoToNextSearchResult: boolean
  previousSearchResultLabel: string
  nextSearchResultLabel: string
  closeSearchLabel: string
  isSearchLoading: boolean
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
  fullscreenLabel: string
  isFullScreenModeActivated: boolean
}>()

const emit = defineEmits<{
  (e: 'update:selectedChapter', value: ChapterOption): void
  (e: 'searchTermChanged', value: string): void
  (e: 'goToPreviousSearchResult'): void
  (e: 'goToNextSearchResult'): void
  (e: 'closeSearch'): void
  (e: 'navigateLeft'): void
  (e: 'navigateRight'): void
  (e: 'decreaseFontSize'): void
  (e: 'resetFontSize'): void
  (e: 'increaseFontSize'): void
  (e: 'toggleFullscreen'): void
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
