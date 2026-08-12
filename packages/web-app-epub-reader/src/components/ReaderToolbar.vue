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
        class="epub-reader-controls-navigate-left p-2"
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
        class="epub-reader-controls-navigate-right p-2"
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
        class="epub-reader-controls-font-size-decrease p-2"
        :disabled="decreaseFontSizeDisabled"
        appearance="raw"
        no-hover
        size="small"
        @click="$emit('decreaseFontSize')"
      >
        <oc-icon name="subtract" fill-type="line" size-class="size-4" />
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
        class="epub-reader-controls-font-size-increase p-2"
        :disabled="increaseFontSizeDisabled"
        appearance="raw"
        no-hover
        size="small"
        @click="$emit('increaseFontSize')"
      >
        <oc-icon name="add" fill-type="line" size-class="size-4" />
      </oc-button>
      <span class="mx-1 h-5 w-px bg-role-outline-variant" />
      <oc-button
        id="epub_reader_text_search_toggle"
        v-oc-tooltip="searchLabel"
        :aria-label="searchLabel"
        class="epub-reader-controls-text-search p-2"
        appearance="raw"
        no-hover
        size="small"
      >
        <oc-icon name="search" fill-type="line" size-class="size-4" />
      </oc-button>
      <reader-text-search
        toggle="#epub_reader_text_search_toggle"
        :searching="isSearchLoading"
        :result-count="searchResultCount"
        :current-result-index="currentSearchResultIndex"
        :can-go-to-previous-result="canGoToPreviousSearchResult"
        :can-go-to-next-result="canGoToNextSearchResult"
        @search-term-changed="$emit('searchTermChanged', $event)"
        @go-to-previous-result="$emit('goToPreviousSearchResult')"
        @go-to-next-result="$emit('goToNextSearchResult')"
        @close-search="$emit('closeSearch')"
      />
      <span class="mx-1 hidden h-5 w-px bg-role-outline-variant sm:inline" />
      <oc-button
        v-oc-tooltip="fullscreenLabel"
        :aria-label="fullscreenLabel"
        class="epub-reader-controls-fullscreen hidden p-2 sm:inline-flex"
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
import { useGettext } from 'vue3-gettext'
import MobileChapterSelect from './MobileChapterSelect.vue'
import ReaderTextSearch from './ReaderTextSearch.vue'

type ChapterOption = NavItem
const props = defineProps<{
  chapters: ChapterOption[]
  selectedChapter?: ChapterOption
  searchResultCount: number
  currentSearchResultIndex: number
  canGoToPreviousSearchResult: boolean
  canGoToNextSearchResult: boolean
  isSearchLoading: boolean
  currentFontSizePercentage: number
  fontSizeStep: number
  navigateLeftDisabled: boolean
  navigateRightDisabled: boolean
  decreaseFontSizeDisabled: boolean
  increaseFontSizeDisabled: boolean
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
const { $gettext } = useGettext()
const chapterLabel = $gettext('Chapter')
const searchLabel = $gettext('Search in book')
const previousPageLabel = $gettext('Navigate to previous page')
const nextPageLabel = $gettext('Navigate to next page')
const decreaseFontSizeLabel = $gettext('Decrease font size')
const resetFontSizeLabel = $gettext('Reset font size')
const increaseFontSizeLabel = $gettext('Increase font size')
const fullscreenLabel = computed(() => {
  return props.isFullScreenModeActivated
    ? $gettext('Exit fullscreen')
    : $gettext('Enter fullscreen')
})

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
