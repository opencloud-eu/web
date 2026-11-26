import { computed, nextTick, ref, shallowRef, unref, watch, type Ref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useEventListener } from '@vueuse/core'
import { useMessages } from '@opencloud-eu/web-pkg'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { EditingStates } from './usePdfEditing'
import type { PreviousPageNumbers } from './usePdfThumbnailCache'

/** Computes the target slot of every page when moving `from` to `to` (0-based). */
export function getMovedPageIndices(pagesCount: number, from: number, to: number): number[] {
  const order = Array.from({ length: pagesCount }, (_, i) => i)
  const [moved] = order.splice(from, 1)
  order.splice(to, 0, moved)
  // `order` lists source pages by target slot, PDF.js wants target slots by source page.
  const pageIndices = new Array<number>(pagesCount)
  order.forEach((sourceIndex, targetIndex) => {
    pageIndices[sourceIndex] = targetIndex
  })
  return pageIndices
}

type PageInfo = Parameters<PDFDocumentProxy['extractPages']>[0][number]

/** The page numbers the other way round, e.g. to go back. */
function invertPageNumbers(previousPageNumbers: PreviousPageNumbers, pagesCount: number) {
  const inverted: PreviousPageNumbers = new Array(pagesCount).fill(undefined)
  previousPageNumbers.forEach((previousPageNumber, index) => {
    if (previousPageNumber) {
      inverted[previousPageNumber - 1] = index + 1
    }
  })
  return inverted
}

type DocumentState = {
  content: ArrayBuffer
  pageNumber: number
  /** Of its pages in the document it replaces when going back to it. */
  previousPageNumbers: PreviousPageNumbers
}

// Each step keeps a whole file, so only as many undo steps as fit into this. The redo steps come
// from undone ones, so there are at most as many of them. Phones and tablets have far less memory
// for a tab (iOS Safari gives up around 1.5 GB, the document itself needs some of it).
const MAX_HISTORY_BYTES = 200_000_000
const MAX_HISTORY_BYTES_TOUCH = 50_000_000

function getHistoryBudget() {
  return window.matchMedia?.('(pointer: coarse)').matches
    ? MAX_HISTORY_BYTES_TOUCH
    : MAX_HISTORY_BYTES
}

/** What to focus on the page after a page action, see PdfThumbnail. */
export type PageAction = { pageNumber: number; focusTarget: string }

/**
 * Structural page edits. PDF.js writes them into a new file, so the caller has to load the
 * result as a new document. They are outside of PDF.js' undo, so they have their own: the
 * file before the change. Undo goes back through PDF.js' edits first, then through the page
 * changes before them. Changes outside of PDF.js' undo (form values) can't be carried over to
 * another file, so they end the page undo instead of getting lost.
 */
export function usePdfPageOperations({
  pdfDocument,
  edits,
  getContent,
  getPageNumber,
  beforeChange,
  onDocumentChanged
}: {
  /** PDF.js' undo. */
  edits: { states: Ref<EditingStates>; undo: () => void; redo: () => void }
  pdfDocument: Ref<PDFDocumentProxy | undefined>
  /** The current content, including pending changes once `beforeChange` is done. */
  getContent: () => ArrayBuffer
  getPageNumber: () => number
  /** Runs before the document gets rebuilt, e.g. to write pending changes. */
  beforeChange: () => Promise<unknown>
  onDocumentChanged: (
    content: ArrayBuffer,
    pageNumber: number,
    previousPageNumbers: PreviousPageNumbers
  ) => void | Promise<void>
}) {
  const { $gettext } = useGettext()
  const { showErrorMessage } = useMessages()
  const isProcessing = ref(false)
  const undoStack = shallowRef<DocumentState[]>([])
  const redoStack = shallowRef<DocumentState[]>([])
  // For the thumbnails of the new document, see PdfSidebar.
  const lastAction = shallowRef<PageAction>()
  /** Drops the oldest steps beyond the budget, the latest one stays. */
  function limitHistory() {
    let bytes = unref(undoStack).reduce((sum, { content }) => sum + content.byteLength, 0)
    const budget = getHistoryBudget()
    while (unref(undoStack).length > 1 && bytes > budget) {
      bytes -= unref(undoStack)[0].content.byteLength
      undoStack.value = unref(undoStack).slice(1)
    }
  }

  function clearHistory() {
    undoStack.value = []
    redoStack.value = []
  }

  async function getState() {
    await beforeChange()
    // The written changes reach the content with the next render.
    await nextTick()
    return { content: getContent(), pageNumber: getPageNumber() }
  }

  async function run(
    pageInfo: PageInfo,
    /** The page to show, given the page viewed once the pending changes are written. */
    getNextPageNumber: (viewedPageNumber: number) => number,
    previousPageNumbers: PreviousPageNumbers,
    errorTitle: string
  ) {
    const doc = unref(pdfDocument)
    if (!doc || unref(isProcessing)) {
      return
    }
    isProcessing.value = true
    try {
      const before = await getState()
      const bytes = await doc.extractPages([pageInfo])
      // PDF.js' worker reports failures as an empty result.
      if (!bytes) {
        throw new Error('PDF.js could not extract the pages')
      }
      // A standalone copy, WebDAV expects a plain ArrayBuffer.
      await onDocumentChanged(
        bytes.slice().buffer,
        getNextPageNumber(before.pageNumber),
        previousPageNumbers
      )
      const previous = invertPageNumbers(previousPageNumbers, doc.numPages)
      undoStack.value = [...unref(undoStack), { ...before, previousPageNumbers: previous }]
      redoStack.value = []
      limitHistory()
      // Used by the new thumbnails, not when opening the sidebar later.
      await nextTick()
    } catch (e) {
      console.error(e)
      showErrorMessage({ title: errorTitle, errors: [e as Error] })
    } finally {
      lastAction.value = undefined
      isProcessing.value = false
    }
  }

  // The page actions are only offered where they apply, e.g. no deleting the last page.
  // With the keyboard, the focus goes with the page and the same keys go on. With the mouse,
  // the moved page shows where it went.
  function deletePage(pageNumber: number, isKeyboard = false) {
    const pagesCount = unref(pdfDocument)?.numPages ?? 0
    // The page that takes the place of the deleted one. Not the delete button of the next page,
    // that would be a delete too quick.
    const replacingPageNumber = Math.min(pageNumber, pagesCount - 1)
    lastAction.value = isKeyboard
      ? { pageNumber: replacingPageNumber, focusTarget: 'page' }
      : undefined
    // The view stays where it is, e.g. when deleting another page from the sidebar.
    function getNextPageNumber(viewedPageNumber: number) {
      if (viewedPageNumber === pageNumber) {
        return replacingPageNumber
      }
      return viewedPageNumber - (viewedPageNumber > pageNumber ? 1 : 0)
    }
    const previousPageNumbers = Array.from({ length: pagesCount - 1 }, (_, index) =>
      index < pageNumber - 1 ? index + 1 : index + 2
    )
    return run(
      { document: null, excludePages: [pageNumber - 1] },
      getNextPageNumber,
      previousPageNumbers,
      $gettext('Deleting the page failed')
    )
  }

  function movePage(pageNumber: number, targetPageNumber: number, isKeyboard = false) {
    const pagesCount = unref(pdfDocument)?.numPages ?? 0
    lastAction.value = isKeyboard
      ? { pageNumber: targetPageNumber, focusTarget: 'page-actions' }
      : undefined
    const pageIndices = getMovedPageIndices(pagesCount, pageNumber - 1, targetPageNumber - 1)
    const previousPageNumbers: PreviousPageNumbers = []
    pageIndices.forEach((targetIndex, sourceIndex) => {
      previousPageNumbers[targetIndex] = sourceIndex + 1
    })
    return run(
      { document: null, pageIndices },
      () => targetPageNumber,
      previousPageNumbers,
      $gettext('Moving the page failed')
    )
  }

  /** Goes back to the file before the last page change, or forward again. */
  async function step(from: Ref<DocumentState[]>, to: Ref<DocumentState[]>, errorTitle: string) {
    const target = unref(from).at(-1)
    if (!target || unref(isProcessing)) {
      return
    }
    isProcessing.value = true
    try {
      const pagesCount = unref(pdfDocument)?.numPages ?? 0
      const current = await getState()
      await onDocumentChanged(target.content, target.pageNumber, target.previousPageNumbers)
      from.value = unref(from).slice(0, -1)
      const previousPageNumbers = invertPageNumbers(target.previousPageNumbers, pagesCount)
      to.value = [...unref(to), { ...current, previousPageNumbers }]
    } catch (e) {
      console.error(e)
      showErrorMessage({ title: errorTitle, errors: [e as Error] })
    } finally {
      isProcessing.value = false
    }
  }

  // Form values are outside of PDF.js' undo, going back to another file would lose them.
  useEventListener(
    document,
    ['input', 'change'],
    (event: Event) => {
      if ((event.target as Element).closest?.('.annotationLayer')) {
        clearHistory()
      }
    },
    { capture: true }
  )

  // Other changes make redoing a page change pointless.
  watch(
    () => unref(edits.states).hasSomethingToUndo,
    (hasSomethingToUndo) => {
      if (hasSomethingToUndo) {
        redoStack.value = []
      }
    }
  )

  const undoStates = computed<EditingStates>(() => ({
    ...unref(edits.states),
    hasSomethingToUndo: unref(edits.states).hasSomethingToUndo || unref(undoStack).length > 0,
    hasSomethingToRedo: unref(edits.states).hasSomethingToRedo || unref(redoStack).length > 0
  }))

  function undo() {
    if (unref(edits.states).hasSomethingToUndo) {
      edits.undo()
      return
    }
    return step(undoStack, redoStack, $gettext('Undoing the page change failed'))
  }

  function redo() {
    if (unref(edits.states).hasSomethingToRedo) {
      edits.redo()
      return
    }
    return step(redoStack, undoStack, $gettext('Redoing the page change failed'))
  }

  return { isProcessing, lastAction, deletePage, movePage, undoStates, undo, redo }
}
