<template>
  <div class="relative h-full">
    <div
      ref="readerRoot"
      tabindex="-1"
      class="epub-reader flex h-full bg-role-surface text-role-on-surface"
      :class="{ 'invisible pointer-events-none': isReaderLoading }"
    >
      <chapter-list
        :chapters="chapters"
        :current-chapter="currentChapter"
        @chapter-selected="showChapter"
      />
      <div class="flex min-w-0 flex-1 flex-col">
        <reader-toolbar
          :chapters="chapters"
          :selected-chapter="currentChapter"
          :search-result-count="searchResultCfis.length"
          :has-more-search-results="hasMoreSearchResults"
          :current-search-result-index="currentSearchResultIndex"
          :can-navigate-through-search-results="canNavigateThroughSearchResults"
          :is-search-loading="textSearchLoading"
          :current-font-size-percentage="currentFontSizePercentage"
          :font-size-step="FONT_SIZE_PERCENTAGE_STEP"
          :navigate-left-disabled="navigateLeftDisabled"
          :navigate-right-disabled="navigateRightDisabled"
          :decrease-font-size-disabled="decreaseFontSizeDisabled"
          :increase-font-size-disabled="increaseFontSizeDisabled"
          :is-full-screen-mode-activated="isFullScreenModeActivated"
          @update:selected-chapter="showChapter"
          @search-term-changed="onTextSearchTermChanged"
          @go-to-previous-search-result="goToPreviousSearchResult"
          @go-to-next-search-result="goToNextSearchResult"
          @close-search="closeTextSearch"
          @navigate-left="navigateLeft"
          @navigate-right="navigateRight"
          @decrease-font-size="decreaseFontSize"
          @reset-font-size="resetFontSize"
          @increase-font-size="increaseFontSize"
          @toggle-fullscreen="toggleFullScreenMode"
        />
        <ReaderView
          ref="readerView"
          :navigate-left-disabled="navigateLeftDisabled"
          :navigate-right-disabled="navigateRightDisabled"
          @navigate-left="navigateLeft"
          @navigate-right="navigateRight"
        />
        <reader-progress-bar
          :reading-progress-percent="readingProgressPercent"
          :enabled="hasGlobalLocations"
          @seek="onProgressChange"
        />
      </div>
    </div>
    <div
      v-if="isReaderLoading"
      class="absolute inset-0 z-20 flex items-center justify-center bg-role-surface"
    >
      <AppLoadingSpinner />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  unref,
  useTemplateRef,
  watch
} from 'vue'
import {
  AppLoadingSpinner,
  Key,
  useKeyboardActions,
  useLocalStorage,
  useThemeStore,
  type AppWrapperSlotHandlers,
  type AppWrapperSlotProps,
  type EditorSlotProps
} from '@opencloud-eu/web-pkg'
import ePub, { Book, NavItem, Rendition, Location } from 'epubjs'
import ReaderToolbar from './components/ReaderToolbar.vue'
import ChapterList from './components/ChapterList.vue'
import ReaderProgressBar from './components/ReaderProgressBar.vue'
import ReaderView from './components/ReaderView.vue'

const DARK_THEME_CONFIG = {
  html: {
    '-webkit-filter': 'invert(1) hue-rotate(180deg)',
    filter: 'invert(1) hue-rotate(180deg)'
  },
  img: {
    '-webkit-filter': 'invert(1) hue-rotate(180deg)',
    filter: 'invert(1) hue-rotate(180deg)'
  }
}
const LIGHT_THEME_CONFIG = {
  html: { background: 'white' }
}
const MAX_FONT_SIZE_PERCENTAGE = 150
const MIN_FONT_SIZE_PERCENTAGE = 50
const FONT_SIZE_PERCENTAGE_STEP = 10
const GLOBAL_LOCATION_CHARS = 3000
const MAX_TEXT_SEARCH_RESULTS = 300
const SEARCH_HIGHLIGHT_STYLES = {
  fill: 'var(--color-yellow-500)',
  'fill-opacity': '0.35'
}

type EpubSpineItem = {
  load: (loader: unknown) => Promise<unknown>
  find: (query: string) => Promise<Array<{ cfi?: string }>>
  unload: () => void
}
type ReaderViewExpose = {
  getBookContainer: () => HTMLElement | undefined
}

// `applicationConfig` is declared but never read here. Without it the wrapper's
// slot binding has nowhere to land it and Vue falls it through to the root
// element as `applicationconfig="[object Object]"`.
const { currentContent, resource, onClose } = defineProps<
  EditorSlotProps &
    Pick<AppWrapperSlotProps, 'applicationConfig'> &
    Pick<AppWrapperSlotHandlers, 'onClose'>
>()

const keyboardActions = useKeyboardActions()
const readerRoot = useTemplateRef<HTMLElement>('readerRoot')
const readerView = useTemplateRef<ReaderViewExpose>('readerView')
const chapters = ref<NavItem[]>([])
const currentChapter = ref<NavItem>()
const navigateLeftDisabled = ref(false)
const navigateRightDisabled = ref(false)
const readingProgressPercent = ref<number | null>(null)
const hasGlobalLocations = ref(false)
const searchResultCfis = ref<string[]>([])
const hasMoreSearchResults = ref(false)
const currentSearchResultIndex = ref(-1)
const currentSearchHighlightCfi = ref<string | null>(null)
const textSearchLoading = ref(false)
const textSearchRequestId = ref(0)
const localStorageData = useLocalStorage<{ fontSizePercentage?: number }>(`oc_epubReader`, {})
const currentFontSizePercentage = ref(unref(localStorageData).fontSizePercentage || 100)
const themeStore = useThemeStore()
const book = ref<Book>()
const rendition = ref<Rendition>()
const isFullScreenModeActivated = ref(false)
const isReaderLoading = ref(true)

async function showChapter(chapter: NavItem) {
  const currentRendition = unref(rendition)
  if (!currentRendition) {
    return
  }

  currentChapter.value = chapter
  await currentRendition.display(chapter.href)
}

async function onProgressChange(percentage: number) {
  if (!unref(hasGlobalLocations) || !unref(book)?.locations?.cfiFromPercentage) {
    return
  }

  if (!Number.isFinite(percentage)) {
    return
  }

  const normalized = Math.min(100, Math.max(0, percentage))
  const cfi = unref(book).locations.cfiFromPercentage(normalized / 100)
  if (cfi) {
    await unref(rendition).display(cfi)
  }
}

async function generateGlobalLocationsForBook(bookInstance: Book) {
  if (!bookInstance.locations) {
    return
  }

  try {
    await bookInstance.locations.generate(GLOBAL_LOCATION_CHARS)
  } catch {
    hasGlobalLocations.value = false
    return
  }

  hasGlobalLocations.value = true
}

function updateReadingProgress(currentLocation: Location) {
  const locationCfi = currentLocation?.start?.cfi
  const globalPercentage =
    locationCfi && unref(book)?.locations?.percentageFromCfi
      ? unref(book).locations.percentageFromCfi(locationCfi)
      : null

  if (typeof globalPercentage === 'number' && Number.isFinite(globalPercentage)) {
    const clamped = Math.min(1, Math.max(0, globalPercentage))
    readingProgressPercent.value = clamped * 100
    return
  }

  const chapterPage = currentLocation?.start?.displayed?.page
  const chapterTotal = currentLocation?.start?.displayed?.total
  if (typeof chapterPage === 'number' && typeof chapterTotal === 'number' && chapterTotal > 0) {
    readingProgressPercent.value = (chapterPage / chapterTotal) * 100
    return
  }

  readingProgressPercent.value = null
}

const canNavigateThroughSearchResults = computed(() => {
  return unref(searchResultCfis).length > 0
})

function clearSearchHighlight() {
  const highlightCfi = unref(currentSearchHighlightCfi)
  const annotations = unref(rendition)?.annotations

  if (!highlightCfi || !annotations?.remove) {
    currentSearchHighlightCfi.value = null
    return
  }

  annotations.remove(highlightCfi, 'highlight')
  currentSearchHighlightCfi.value = null
}

function highlightSearchResult(cfi: string) {
  const annotations = unref(rendition)?.annotations
  if (!annotations) {
    return
  }

  clearSearchHighlight()

  if (annotations.highlight) {
    annotations.highlight(
      cfi,
      {},
      undefined,
      'epub-reader-search-highlight',
      SEARCH_HIGHLIGHT_STYLES
    )
  } else if (annotations.add) {
    annotations.add(
      'highlight',
      cfi,
      {},
      undefined,
      'epub-reader-search-highlight',
      SEARCH_HIGHLIGHT_STYLES
    )
  }

  currentSearchHighlightCfi.value = cfi
}

function closeTextSearch() {
  textSearchRequestId.value = unref(textSearchRequestId) + 1
  searchResultCfis.value = []
  hasMoreSearchResults.value = false
  currentSearchResultIndex.value = -1
  textSearchLoading.value = false
  clearSearchHighlight()
}

function findChapterByDomPosition(chapters: NavItem[], cfi: string): NavItem | undefined {
  try {
    const contents = unref(rendition)?.getContents?.() as unknown as
      Array<{ document: Document }> | undefined
    const doc = contents?.[0]?.document
    if (!doc) return undefined

    const currentRange = unref(rendition)?.getRange?.(cfi)
    let element = currentRange?.startContainer as Element | null
    if (!element) return undefined

    if (element.nodeType === Node.TEXT_NODE) {
      element = element.parentElement
    }

    // Find last chapter anchor that comes before current position
    for (let i = chapters.length - 1; i >= 0; i--) {
      const hash = chapters[i].href.split('#')[1]
      if (!hash) continue

      const chapterElement = doc.getElementById(hash)
      if (!chapterElement || !element) continue

      const position = chapterElement.compareDocumentPosition(element)
      if (
        position === 0 ||
        position & Node.DOCUMENT_POSITION_FOLLOWING ||
        position & Node.DOCUMENT_POSITION_CONTAINED_BY
      ) {
        return chapters[i]
      }
    }
  } catch {
    // Silent fail
  }
  return undefined
}

function resolveCurrentChapter(currentLocation: Location) {
  const locationHref = currentLocation?.start?.href
  const navigation = unref(book)?.navigation
  if (!navigation) {
    return undefined
  }

  // Strategy 1: Exact match via navigation.get() using location href
  if (locationHref) {
    const byLocationHref = navigation.get(locationHref)
    if (byLocationHref) {
      return byLocationHref
    }
  }

  const locationCfi = currentLocation?.start?.cfi
  const locationIndex = currentLocation?.start?.index
  const spineTarget =
    locationCfi || (typeof locationIndex === 'number' ? locationIndex : undefined) || locationHref
  const spineItem = spineTarget ? unref(book)?.spine.get(spineTarget) : undefined
  const spineHref = spineItem?.href
  if (!spineHref) {
    return undefined
  }

  // Strategy 2: Exact match via navigation.get() using spine href
  const bySpineHref = navigation.get(spineHref)
  if (bySpineHref) {
    return bySpineHref
  }

  // Strategy 3: Match by normalized href (without hash fragment)
  const normalizedSpineHref = spineHref.split('#')[0]
  const matchingChapters = unref(chapters).filter(
    (chapter) => chapter.href.split('#')[0] === normalizedSpineHref
  )

  if (matchingChapters.length === 1) {
    return matchingChapters[0]
  }

  // Strategy 3b: Multiple chapters in same file - find by DOM element position
  if (matchingChapters.length > 1 && locationCfi) {
    const resolved = findChapterByDomPosition(matchingChapters, locationCfi)
    if (resolved) {
      return resolved
    }
    return matchingChapters[0]
  }

  // Strategy 4: Find containing chapter by spine index (for chapters spanning multiple files)
  const currentSpineIndex = spineItem?.index
  if (typeof currentSpineIndex === 'number') {
    const chaptersWithSpineIndex = unref(chapters)
      .map((chapter) => {
        const chapterSpineItem = unref(book)?.spine.get(chapter.href.split('#')[0])
        return {
          chapter,
          spineIndex: chapterSpineItem?.index ?? -1
        }
      })
      .filter((item) => item.spineIndex >= 0 && item.spineIndex <= currentSpineIndex)
      .sort((a, b) => b.spineIndex - a.spineIndex)

    if (chaptersWithSpineIndex.length > 0) {
      return chaptersWithSpineIndex[0].chapter
    }
  }

  return undefined
}

function getSearchableSpineItems(bookInstance: Book): EpubSpineItem[] {
  const spine = bookInstance.spine as unknown as {
    spineItems?: unknown
    items?: unknown
  }
  const candidates = spine.spineItems ?? spine.items
  return Array.isArray(candidates) ? (candidates as EpubSpineItem[]) : []
}

async function displaySearchResultByIndex(index: number) {
  const cfi = unref(searchResultCfis)[index]
  if (!cfi) {
    return
  }
  currentSearchResultIndex.value = index
  await unref(rendition)?.display(cfi)
  highlightSearchResult(cfi)
}

async function onTextSearchTermChanged(searchTerm: string) {
  const requestId = unref(textSearchRequestId) + 1
  textSearchRequestId.value = requestId

  const bookInstance = unref(book)
  const spineItems = bookInstance ? getSearchableSpineItems(bookInstance) : []
  if (!searchTerm || spineItems.length === 0) {
    closeTextSearch()
    return
  }

  textSearchLoading.value = true

  const searchResults: string[] = []
  let searchResultsLimitExceeded = false
  const loadFunction = bookInstance.load.bind(bookInstance)

  try {
    for (const spineItem of spineItems) {
      if (requestId !== unref(textSearchRequestId) || searchResultsLimitExceeded) {
        break
      }

      try {
        await spineItem.load(loadFunction)
        const matches = (await spineItem.find(searchTerm)) as Array<{
          cfi?: string
        }>

        for (const match of matches) {
          if (!match.cfi) {
            break
          }
          searchResults.push(match.cfi)
          if (searchResults.length > MAX_TEXT_SEARCH_RESULTS) {
            searchResults.length = MAX_TEXT_SEARCH_RESULTS
            searchResultsLimitExceeded = true
            break
          }
        }
      } finally {
        spineItem.unload()
      }
    }
  } finally {
    if (requestId === unref(textSearchRequestId)) {
      searchResultCfis.value = searchResults
      hasMoreSearchResults.value = searchResultsLimitExceeded
      currentSearchResultIndex.value = searchResults.length > 0 ? 0 : -1
      textSearchLoading.value = false
      if (searchResults.length > 0) {
        await displaySearchResultByIndex(0)
      } else {
        clearSearchHighlight()
      }
    }
  }
}

async function goToPreviousSearchResult() {
  const totalResults = unref(searchResultCfis).length
  if (totalResults === 0) {
    return
  }

  const currentIndex = unref(currentSearchResultIndex)
  const previousIndex = currentIndex <= 0 ? totalResults - 1 : currentIndex - 1
  await displaySearchResultByIndex(previousIndex)
}

async function goToNextSearchResult() {
  const totalResults = unref(searchResultCfis).length
  if (totalResults === 0) {
    return
  }

  const currentIndex = unref(currentSearchResultIndex)
  const nextIndex = currentIndex < 0 || currentIndex >= totalResults - 1 ? 0 : currentIndex + 1
  await displaySearchResultByIndex(nextIndex)
}

function syncFullscreenState() {
  isFullScreenModeActivated.value = Boolean(document.fullscreenElement)
}

async function toggleFullScreenMode() {
  if (!document.fullscreenElement) {
    await unref(readerRoot)?.requestFullscreen?.()
    return
  }
  await document.exitFullscreen?.()
}

function increaseFontSize() {
  currentFontSizePercentage.value = Math.min(
    unref(currentFontSizePercentage) + FONT_SIZE_PERCENTAGE_STEP,
    MAX_FONT_SIZE_PERCENTAGE
  )
}

function resetFontSize() {
  currentFontSizePercentage.value = 100
}

function decreaseFontSize() {
  currentFontSizePercentage.value = Math.max(
    unref(currentFontSizePercentage) - FONT_SIZE_PERCENTAGE_STEP,
    MIN_FONT_SIZE_PERCENTAGE
  )
}

function navigateLeft() {
  unref(rendition)?.prev()
}

function navigateRight() {
  unref(rendition)?.next()
}

async function focusReaderRoot() {
  await nextTick()
  unref(readerRoot)?.focus()
}

const increaseFontSizeDisabled = computed(() => {
  return unref(currentFontSizePercentage) >= MAX_FONT_SIZE_PERCENTAGE
})

const decreaseFontSizeDisabled = computed(() => {
  return unref(currentFontSizePercentage) <= MIN_FONT_SIZE_PERCENTAGE
})

keyboardActions.bindKeyAction({ primary: Key.ArrowLeft }, () => navigateLeft())
keyboardActions.bindKeyAction({ primary: Key.ArrowRight }, () => navigateRight())

watch(
  () => currentContent,
  async () => {
    await nextTick()

    // Cancel ongoing searches before destroying
    textSearchRequestId.value = unref(textSearchRequestId) + 1
    clearSearchHighlight()

    if (unref(rendition)) {
      unref(rendition).destroy()
      rendition.value = undefined
    }

    if (unref(book)) {
      unref(book).destroy()
      book.value = undefined
    }

    const localStorageResourceData = useLocalStorage<{ currentLocation?: Location }>(
      `oc_epubReader_resource_${resource.id}`,
      {}
    )

    book.value = ePub(currentContent)
    isReaderLoading.value = true
    readingProgressPercent.value = null
    hasGlobalLocations.value = false
    closeTextSearch()

    unref(book).loaded.navigation.then(({ toc }) => {
      chapters.value = toc
    })

    await unref(book).ready
    const currentBook = unref(book)

    const bookContainer = unref(readerView)?.getBookContainer()
    if (!bookContainer) {
      if (currentBook) {
        currentBook.destroy()
        book.value = undefined
      }
      return
    }

    rendition.value = unref(book).renderTo(bookContainer, {
      flow: 'paginated',
      spread: 'none',
      width: '100%',
      height: '100%'
    })

    unref(rendition).themes.register('dark', DARK_THEME_CONFIG)
    unref(rendition).themes.register('light', LIGHT_THEME_CONFIG)

    await unref(rendition).display(unref(localStorageResourceData)?.currentLocation?.start?.cfi)

    unref(rendition).themes.select(themeStore.currentTheme.isDark ? 'dark' : 'light')
    unref(rendition).themes.fontSize(`${unref(currentFontSizePercentage)}%`)

    void generateGlobalLocationsForBook(currentBook)

    unref(rendition).on('keydown', (event: KeyboardEvent) => {
      if (event.key === Key.Esc) {
        event.preventDefault()
        onClose()
      }
      if (event.key === Key.ArrowLeft) {
        navigateLeft()
      }
      if (event.key === Key.ArrowRight) {
        navigateRight()
      }
    })

    unref(rendition).on('relocated', () => {
      isReaderLoading.value = false
      const currentLocation = unref(rendition).currentLocation() as unknown as Location
      if (!currentLocation) {
        return
      }

      localStorageResourceData.value = { currentLocation }
      navigateLeftDisabled.value = currentLocation.atStart === true
      navigateRightDisabled.value = currentLocation.atEnd === true
      updateReadingProgress(currentLocation)

      const resolvedCurrentChapter = resolveCurrentChapter(currentLocation)
      if (resolvedCurrentChapter) {
        currentChapter.value = resolvedCurrentChapter
      } else if (!unref(currentChapter) && unref(chapters).length > 0) {
        // Fallback: set first chapter if no chapter is set yet
        currentChapter.value = unref(chapters)[0]
      }
    })
  },
  {
    immediate: true
  }
)

watch(isReaderLoading, (isLoading, wasLoading) => {
  if (wasLoading && !isLoading) {
    focusReaderRoot()
  }
})

watch(hasGlobalLocations, (enabled, wasEnabled) => {
  if (!enabled || wasEnabled) {
    return
  }

  const currentRendition = unref(rendition)
  if (!currentRendition) {
    return
  }

  const currentLocation = currentRendition.currentLocation() as unknown as Location
  if (!currentLocation) {
    return
  }

  updateReadingProgress(currentLocation)
})

watch(currentFontSizePercentage, () => {
  const currentRendition = unref(rendition)
  if (!currentRendition) {
    return
  }

  currentRendition.themes.fontSize(`${unref(currentFontSizePercentage)}%`)
  localStorageData.value = {
    ...unref(localStorageData),
    fontSizePercentage: unref(currentFontSizePercentage)
  }
})

onMounted(() => {
  document.addEventListener('fullscreenchange', syncFullscreenState)
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', syncFullscreenState)

  // Cancel ongoing searches before destroying
  textSearchRequestId.value = unref(textSearchRequestId) + 1
  clearSearchHighlight()

  if (unref(rendition)) {
    unref(rendition).destroy()
    rendition.value = undefined
  }

  if (unref(book)) {
    unref(book).destroy()
    book.value = undefined
  }
})
</script>
