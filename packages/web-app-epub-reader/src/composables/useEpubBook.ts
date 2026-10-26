import ePub, { Book, EpubCFI, Location, Rendition } from 'epubjs'
import { computed, onBeforeUnmount, ref, shallowRef, unref } from 'vue'
import { useGettext } from 'vue3-gettext'

export type OpenBookOptions = {
  container: HTMLElement
  /** EPUB CFI to open the book at. Falls back to the beginning of the book. */
  initialCfi?: string
}

/** Media types epub.js can render as a section. Spine items like bare images or SVGs hang forever. */
const RENDERABLE_TYPES = ['application/xhtml+xml', 'text/html']

/** epub.js types don't declare the spine items. */
type SpineItem = { href?: string; idref?: string; linear?: boolean }
/** epub.js types don't declare the iframe of a rendered view. */
type RenderedView = { iframe?: HTMLIFrameElement }

/**
 * Owns the epub.js book and its rendition. Everything else in the reader derives from the
 * `location` that epub.js reports whenever the displayed position changes.
 */
export function useEpubBook() {
  const { $gettext } = useGettext()
  const book = shallowRef<Book>()
  const rendition = shallowRef<Rendition>()
  const location = shallowRef<Location>()
  const isLoading = ref(true)
  const loadError = shallowRef<Error>()

  const atStart = computed(() => unref(location)?.atStart === true)
  const atEnd = computed(() => unref(location)?.atEnd === true)

  function close() {
    const currentBook = unref(book)
    unref(rendition)?.destroy()
    rendition.value = undefined
    book.value = undefined
    location.value = undefined
    if (!currentBook) {
      return
    }
    // epub.js throws inside its own loading chain when a book is destroyed before it is ready
    currentBook.ready.then(
      () => currentBook.destroy(),
      () => currentBook.destroy()
    )
  }

  function fail(currentBook: Book, error: unknown) {
    if (unref(book) !== currentBook) {
      return
    }
    loadError.value = error instanceof Error ? error : new Error(String(error))
    isLoading.value = false
  }

  async function open(content: string | ArrayBuffer, { container, initialCfi }: OpenBookOptions) {
    close()
    isLoading.value = true
    loadError.value = undefined

    const nextBook = ePub(content)
    book.value = nextBook
    try {
      await nextBook.ready
    } catch (error) {
      fail(nextBook, error)
      return
    }
    if (unref(book) !== nextBook) {
      // superseded by another open() or close() while the book was loading
      return
    }

    const nextRendition = nextBook.renderTo(container, {
      flow: 'paginated',
      spread: 'none',
      width: '100%',
      height: '100%'
    })
    nextRendition.on('relocated', (relocated: Location) => {
      location.value = relocated
      isLoading.value = false
    })
    // epub.js renders every section into a new iframe, which needs a name for screen readers
    nextRendition.on('rendered', (_section: unknown, view: RenderedView) => {
      view.iframe?.setAttribute('title', $gettext('Book content'))
    })
    rendition.value = nextRendition

    if (initialCfi && (await display(nextRendition, initialCfi))) {
      await correctRestoredPage(nextRendition, initialCfi)
      return
    }
    const firstHref = findFirstRenderableHref(nextBook)
    if (!firstHref || !(await display(nextRendition, firstHref))) {
      fail(nextBook, new Error('No section of the book can be displayed'))
    }
  }

  async function display(currentRendition: Rendition, target: string) {
    try {
      await currentRendition.display(target)
      return true
    } catch {
      // e.g. "No Section Found" for a stale position or a spine item without manifest entry
      return false
    }
  }

  /**
   * epub.js lands one page early when the stored position starts exactly at a page boundary,
   * so move on if the restored page ends before the stored position.
   */
  async function correctRestoredPage(currentRendition: Rendition, cfi: string) {
    const current = currentRendition.currentLocation() as unknown as Location | undefined
    const start = current?.start
    const end = current?.end
    if (!start?.cfi || !end?.cfi || start.index !== end.index) {
      return
    }
    const compare = new EpubCFI()
    if (compare.compare(end.cfi, start.cfi) > 0 && compare.compare(cfi, end.cfi) > 0) {
      await currentRendition.next()
    }
  }

  function prev() {
    return unref(rendition)?.prev()
  }

  function next() {
    return unref(rendition)?.next()
  }

  onBeforeUnmount(close)

  return {
    book,
    rendition,
    location,
    isLoading,
    loadError,
    atStart,
    atEnd,
    open,
    close,
    prev,
    next
  }
}

function findFirstRenderableHref(currentBook: Book) {
  const manifest = currentBook.packaging?.manifest || {}
  const spineItems = (currentBook.spine as unknown as { spineItems?: SpineItem[] }).spineItems
  const first = (spineItems || []).find((item) => {
    if (!item.href || item.linear === false) {
      return false
    }
    const mediaType = (manifest[item.idref] as { type?: string } | undefined)?.type
    return !mediaType || RENDERABLE_TYPES.includes(mediaType)
  })
  return first?.href
}
