<template>
  <div class="relative h-full">
    <div
      ref="readerRoot"
      tabindex="-1"
      class="epub-reader flex h-full bg-role-surface text-role-on-surface"
      :class="{ 'invisible pointer-events-none': isLoading || loadError }"
    >
      <chapter-list
        v-if="isChapterListVisible"
        :chapters="chapters"
        :current-chapter="currentChapter"
        @chapter-selected="goToChapter"
      />
      <div class="flex min-w-0 flex-1 flex-col">
        <reader-toolbar
          :chapters="chapters"
          :selected-chapter="currentChapter"
          :search-result-count="searchResultCfis.length"
          :has-more-search-results="hasMoreSearchResults"
          :current-search-result-index="currentSearchResultIndex"
          :can-navigate-through-search-results="canNavigateThroughSearchResults"
          :is-search-loading="isSearching"
          :current-font-size-percentage="fontSizePercentage"
          :font-size-step="fontSizeStep"
          :navigate-left-disabled="atStart"
          :navigate-right-disabled="atEnd"
          :decrease-font-size-disabled="!canDecreaseFontSize"
          :increase-font-size-disabled="!canIncreaseFontSize"
          :is-full-screen-mode-activated="isFullScreenModeActivated"
          :is-chapter-list-visible="isChapterListVisible"
          @update:selected-chapter="goToChapter"
          @search-term-changed="search"
          @go-to-previous-search-result="goToPreviousSearchResult"
          @go-to-next-search-result="goToNextSearchResult"
          @close-search="closeSearch"
          @navigate-left="prev"
          @navigate-right="next"
          @decrease-font-size="decreaseFontSize"
          @reset-font-size="resetFontSize"
          @increase-font-size="increaseFontSize"
          @toggle-fullscreen="toggleFullScreenMode"
          @toggle-chapter-list="isChapterListVisible = !isChapterListVisible"
        />
        <reader-view
          ref="readerView"
          :navigate-left-disabled="atStart"
          :navigate-right-disabled="atEnd"
          @navigate-left="prev"
          @navigate-right="next"
        />
        <reader-progress-bar
          :reading-progress-percent="readingProgressPercent"
          :enabled="hasGlobalLocations"
          :loading="isGeneratingLocations"
          @seek="seek"
        />
      </div>
    </div>
    <div
      v-if="isLoading"
      class="absolute inset-0 z-20 flex items-center justify-center bg-role-surface"
    >
      <app-loading-spinner />
    </div>
    <div
      v-else-if="loadError"
      class="epub-reader-error absolute inset-0 z-20 flex items-center justify-center bg-role-surface"
    >
      <p class="text-role-on-surface-variant" v-text="$gettext('The book could not be opened.')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, unref, useTemplateRef, watch } from 'vue'
import {
  AppLoadingSpinner,
  useFullScreenMode,
  type AppWrapperSlotHandlers,
  type AppWrapperSlotProps,
  type EditorSlotProps
} from '@opencloud-eu/web-pkg'
import ChapterList from './components/ChapterList.vue'
import ReaderProgressBar from './components/ReaderProgressBar.vue'
import ReaderToolbar from './components/ReaderToolbar.vue'
import ReaderView from './components/ReaderView.vue'
import {
  useBookContainerResize,
  useChapters,
  useEpubBook,
  useReaderFontSize,
  useReaderKeyboard,
  useReaderSearch,
  useReaderSwipe,
  useReaderTheme,
  useReadingProgress
} from './composables'
import { loadReadingPosition, saveReadingPosition } from './helpers/readingPosition'

// `applicationConfig` is not used, but declaring it keeps the app wrapper from rendering it as an
// attribute on the root element, which still has to receive the wrapper's layout classes.
const { currentContent, resource, onClose } = defineProps<
  EditorSlotProps &
    Pick<AppWrapperSlotProps, 'applicationConfig'> &
    Pick<AppWrapperSlotHandlers, 'onClose'>
>()

const readerRoot = useTemplateRef<HTMLElement>('readerRoot')
const isChapterListVisible = ref(true)
const readerView = useTemplateRef<InstanceType<typeof ReaderView>>('readerView')
const bookContainer = computed(() => unref(readerView)?.bookContainer)

const { book, rendition, location, isLoading, loadError, atStart, atEnd, open, prev, next } =
  useEpubBook()
const { chapters, currentChapter, goToChapter } = useChapters({ book, rendition, location })
const { hasGlobalLocations, isGeneratingLocations, readingProgressPercent, seek } =
  useReadingProgress({
    book,
    rendition,
    location
  })
const {
  resultCfis: searchResultCfis,
  hasMoreResults: hasMoreSearchResults,
  currentResultIndex: currentSearchResultIndex,
  canNavigateThroughResults: canNavigateThroughSearchResults,
  isSearching,
  search,
  closeSearch,
  goToNextResult: goToNextSearchResult,
  goToPreviousResult: goToPreviousSearchResult
} = useReaderSearch({ book, rendition })
const {
  fontSizePercentage,
  step: fontSizeStep,
  canIncrease: canIncreaseFontSize,
  canDecrease: canDecreaseFontSize,
  increase: increaseFontSize,
  decrease: decreaseFontSize,
  reset: resetFontSize
} = useReaderFontSize(rendition)
const { isFullScreenModeActivated, toggleFullScreenMode } = useFullScreenMode(readerRoot)
useReaderTheme(rendition)
useReaderKeyboard({ rendition, onPrevious: prev, onNext: next, onClose })
useReaderSwipe({ rendition, onSwipeLeft: next, onSwipeRight: prev })
useBookContainerResize({ rendition, location, container: bookContainer })

onMounted(() => {
  watch(
    () => currentContent,
    (content) => {
      open(content, {
        container: unref(bookContainer),
        initialCfi: loadReadingPosition(resource.id)
      })
    },
    { immediate: true }
  )
})

watch(location, (currentLocation) => {
  const cfi = currentLocation?.start?.cfi
  if (cfi) {
    saveReadingPosition(resource.id, cfi)
  }
  // epub.js replaces its iframe between sections, which drops the focus to the body, where Esc
  // no longer reaches the app wrapper
  if (document.activeElement === document.body) {
    unref(readerRoot)?.focus()
  }
})

watch(isLoading, async (loading, wasLoading) => {
  if (wasLoading && !loading) {
    await nextTick()
    unref(readerRoot)?.focus()
  }
})
</script>
