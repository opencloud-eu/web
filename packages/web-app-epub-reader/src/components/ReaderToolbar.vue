<template>
  <div class="flex items-center gap-1 px-2 py-2 sm:gap-2 sm:px-3">
    <mobile-chapter-select
      :chapters="chapters"
      :selected-chapter="selectedChapter"
      @update:selected-chapter="onChapterUpdate"
    />
    <oc-bubble-menu class="ml-auto shrink-0">
      <oc-button
        v-oc-tooltip="$gettext('Navigate to previous page')"
        :aria-label="$gettext('Navigate to previous page')"
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
        v-oc-tooltip="$gettext('Navigate to next page')"
        :aria-label="$gettext('Navigate to next page')"
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
        :aria-label="$gettext('Decrease font size')"
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
        v-oc-tooltip="$gettext('Reset font size')"
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
        :aria-label="$gettext('Increase font size')"
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
        v-oc-tooltip="$gettext('Search in book')"
        :aria-label="$gettext('Search in book')"
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
        :has-more-results="hasMoreSearchResults"
        :current-result-index="currentSearchResultIndex"
        :can-navigate-through-results="canNavigateThroughSearchResults"
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
    </oc-bubble-menu>
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
  hasMoreSearchResults: boolean
  currentSearchResultIndex: number
  canNavigateThroughSearchResults: boolean
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

const fullscreenLabel = computed(() =>
  props.isFullScreenModeActivated ? $gettext('Exit fullscreen') : $gettext('Enter fullscreen')
)

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
