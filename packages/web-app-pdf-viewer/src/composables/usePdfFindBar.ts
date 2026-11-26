import { ref, toValue, unref, type MaybeRefOrGetter } from 'vue'
import { FindState, type EventBus } from 'pdfjs-dist/web/pdf_viewer.mjs'

export type FindOptions = {
  caseSensitive: boolean
  entireWord: boolean
  highlightAll: boolean
  matchDiacritics: boolean
}

export type FindResult = { current: number; total: number; notFound: boolean }

/**
 * '' searches as the user types (debounced by PDF.js), 'again' jumps to the next/previous
 * match, the others search again after an option changed, same as the PDF.js viewer's find bar.
 */
export type FindType =
  | ''
  | 'again'
  | 'highlightallchange'
  | 'casesensitivitychange'
  | 'entirewordchange'
  | 'diacriticmatchingchange'

type MatchesCount = { current: number; total: number }

const NO_FIND_RESULT: FindResult = { current: 0, total: 0, notFound: false }

/** The find bar (see PdfFindBar) and the search in PDF.js' find controller. */
export function usePdfFindBar({
  eventBus,
  findBar,
  onClose
}: {
  eventBus: EventBus
  findBar: MaybeRefOrGetter<{ $el: HTMLElement; focus(): void } | null>
  /** Closed with the focus in the find bar, which would lose it. With Escape or the button. */
  onClose: (isEscape: boolean) => void
}) {
  const isFindBarOpen = ref(false)
  // Kept while the find bar is closed, like in the PDF.js viewer.
  const findQuery = ref('')
  const findOptions = ref<FindOptions>({
    highlightAll: false,
    caseSensitive: false,
    entireWord: false,
    matchDiacritics: false
  })
  const findResult = ref<FindResult>(NO_FIND_RESULT)

  eventBus.on('updatefindmatchescount', ({ matchesCount }: { matchesCount: MatchesCount }) => {
    findResult.value = { ...unref(findResult), ...matchesCount }
  })
  // Closing the find bar makes PDF.js report "found" once, while the result is kept for
  // reopening. Finding again while closed (Ctrl+G) reports the new match the same way.
  let isClosing = false
  eventBus.on(
    'updatefindcontrolstate',
    ({ state, matchesCount }: { state: number; matchesCount: MatchesCount }) => {
      if (isClosing) {
        isClosing = false
        return
      }
      findResult.value = { ...matchesCount, notFound: state === FindState.NOT_FOUND }
    }
  )
  eventBus.on('pagesdestroy', () => {
    findResult.value = NO_FIND_RESULT
  })
  // Run again for a changed document, e.g. after a page operation. The find controller has the
  // new document by then. Only while the find bar is open (Ctrl+G also works without).
  eventBus.on('pagesinit', () => {
    if (unref(isFindBarOpen) && unref(findQuery)) {
      find()
    }
  })
  // Search buttons of forms.
  eventBus.on('namedaction', ({ action }: { action: string }) => {
    if (action === 'Find') {
      openFindBar()
    }
  })

  /** Searches for the query with the options of the find bar. */
  function find({
    type = '',
    findPrevious = false
  }: { type?: FindType; findPrevious?: boolean } = {}) {
    // PDF.js skips the report of closing without a document.
    isClosing = false
    eventBus.dispatch('find', {
      source: null,
      type,
      query: unref(findQuery),
      findPrevious,
      ...unref(findOptions)
    })
  }

  /** The next or previous match, e.g. with Ctrl+G, also with the find bar closed. */
  function findAgain(findPrevious: boolean) {
    if (unref(findQuery)) {
      find({ type: 'again', findPrevious })
    }
  }

  function openFindBar() {
    if (unref(isFindBarOpen)) {
      toValue(findBar)?.focus()
      return
    }
    // The find bar focuses its input on mount.
    isFindBarOpen.value = true
  }

  function closeFindBar(isEscape = false) {
    // E.g. Escape in the pages keeps the focus there, like in the PDF.js viewer.
    const hasFocus = !!toValue(findBar)?.$el.contains(document.activeElement)
    isFindBarOpen.value = false
    // PDF.js removes the highlights, but keeps the search and the current match.
    isClosing = true
    eventBus.dispatch('findbarclose', { source: null })
    if (hasFocus) {
      onClose(isEscape)
    }
  }

  function toggleFindBar() {
    if (unref(isFindBarOpen)) {
      closeFindBar()
      return
    }
    openFindBar()
  }

  return {
    isFindBarOpen,
    findQuery,
    findOptions,
    findResult,
    find,
    findAgain,
    openFindBar,
    closeFindBar,
    toggleFindBar
  }
}
