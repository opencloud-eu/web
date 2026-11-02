import { Book, EpubCFI, Rendition } from 'epubjs'
import { computed, Ref, ref, unref, watch } from 'vue'

const MAX_RESULTS = 300
const HIGHLIGHT_CLASS = 'epub-reader-search-highlight'
const HIGHLIGHT_STYLES = {
  fill: 'var(--color-yellow-500)',
  'fill-opacity': '0.35'
}

/** The spine item members used for searching. epub.js types `find()` wrongly as elements. */
type SearchableSection = {
  document?: Document
  load: (request: Book['load']) => Promise<unknown>
  find: (query: string) => Array<{ cfi?: string }>
  unload: () => void
}

type ReaderSearchOptions = {
  book: Ref<Book | undefined>
  rendition: Ref<Rendition | undefined>
}

/**
 * Full text search over all spine items. Results are capped, the current result is displayed and
 * highlighted. Changing the term or the book cancels a running search.
 */
export function useReaderSearch({ book, rendition }: ReaderSearchOptions) {
  const resultCfis = ref<string[]>([])
  const hasMoreResults = ref(false)
  const currentResultIndex = ref(-1)
  const isSearching = ref(false)
  let requestId = 0
  let highlightedCfi: string | undefined

  const canNavigateThroughResults = computed(() => unref(resultCfis).length > 0)

  watch(book, closeSearch)

  function clearHighlight() {
    if (!highlightedCfi) {
      return
    }
    unref(rendition)?.annotations.remove(highlightedCfi, 'highlight')
    highlightedCfi = undefined
  }

  function closeSearch() {
    requestId++
    resultCfis.value = []
    hasMoreResults.value = false
    currentResultIndex.value = -1
    isSearching.value = false
    clearHighlight()
  }

  async function showResult(index: number) {
    const cfi = unref(resultCfis)[index]
    const currentRendition = unref(rendition)
    if (!cfi || !currentRendition) {
      return
    }

    const id = requestId
    currentResultIndex.value = index
    await currentRendition.display(cfi)
    if (id !== requestId) {
      // the search was closed or replaced while the result was displayed
      return
    }
    clearHighlight()
    try {
      currentRendition.annotations.highlight(cfi, {}, undefined, HIGHLIGHT_CLASS, HIGHLIGHT_STYLES)
      highlightedCfi = cfi
    } catch {
      // epub.js can't map some search hits back to the rendered document (e.g. ruby text). The
      // annotation is dropped, it would throw again on every render of that section otherwise.
      currentRendition.annotations.remove(cfi, 'highlight')
    }
  }

  async function search(term: string) {
    closeSearch()
    const currentBook = unref(book)
    if (!term || !currentBook) {
      return
    }

    const id = requestId
    isSearching.value = true
    const cfis: string[] = []
    let limitReached = false
    // epub.js types don't declare `spineItems`
    const sections = (currentBook.spine as unknown as { spineItems: SearchableSection[] })
      .spineItems
    const request = currentBook.load.bind(currentBook)

    for (const section of sections) {
      if (id !== requestId) {
        return
      }
      try {
        await section.load(request)
        for (const match of section.find(term)) {
          if (cfis.length >= MAX_RESULTS) {
            limitReached = true
            break
          }
          if (match.cfi && isVisibleMatch(section, match.cfi)) {
            cfis.push(match.cfi)
          }
        }
      } catch {
        // a spine item that can't be loaded or searched is skipped
      } finally {
        section.unload()
      }
      if (limitReached) {
        break
      }
    }

    if (id !== requestId) {
      return
    }
    resultCfis.value = cfis
    hasMoreResults.value = limitReached
    isSearching.value = false
    if (cfis.length > 0) {
      await showResult(0)
    }
  }

  /** epub.js also finds text in the document head, e.g. the title, which is never displayed. */
  function isVisibleMatch(section: SearchableSection, cfi: string) {
    const doc = section.document
    if (!doc?.body) {
      return true
    }
    try {
      const range = new EpubCFI(cfi).toRange(doc)
      return !range || doc.body.contains(range.startContainer)
    } catch {
      return true
    }
  }

  function goToNextResult() {
    const total = unref(resultCfis).length
    if (total === 0) {
      return
    }
    const current = unref(currentResultIndex)
    return showResult(current >= total - 1 ? 0 : current + 1)
  }

  function goToPreviousResult() {
    const total = unref(resultCfis).length
    if (total === 0) {
      return
    }
    const current = unref(currentResultIndex)
    return showResult(current <= 0 ? total - 1 : current - 1)
  }

  return {
    resultCfis,
    hasMoreResults,
    currentResultIndex,
    isSearching,
    canNavigateThroughResults,
    search,
    closeSearch,
    goToNextResult,
    goToPreviousResult
  }
}
