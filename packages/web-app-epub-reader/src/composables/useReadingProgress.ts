import { Book, Location, Rendition } from 'epubjs'
import { Ref, ref, unref, watch } from 'vue'

/** Characters per generated location. Lower is more precise and slower to generate. */
const CHARS_PER_LOCATION = 3000

type ReadingProgressOptions = {
  book: Ref<Book | undefined>
  rendition: Ref<Rendition | undefined>
  location: Ref<Location | undefined>
}

/**
 * Reading progress through the whole book. epub.js has to generate locations for the book
 * first, which loads every spine item, so this starts after the first page is displayed and the
 * progress is unavailable until then.
 */
export function useReadingProgress({ book, rendition, location }: ReadingProgressOptions) {
  const hasGlobalLocations = ref(false)
  const isGeneratingLocations = ref(false)
  const readingProgressPercent = ref<number | null>(null)
  let pendingSeekCfi: string | undefined
  let isSeeking = false

  watch(book, () => {
    hasGlobalLocations.value = false
    isGeneratingLocations.value = false
    readingProgressPercent.value = null
    pendingSeekCfi = undefined
    isSeeking = false
  })

  watch(location, (currentLocation, previousLocation) => {
    updateProgress(currentLocation)
    if (!previousLocation && currentLocation) {
      generateLocations(unref(book))
    }
  })

  async function generateLocations(currentBook: Book) {
    isGeneratingLocations.value = true
    try {
      await currentBook.locations.generate(CHARS_PER_LOCATION)
    } catch {
      return
    } finally {
      if (unref(book) === currentBook) {
        isGeneratingLocations.value = false
      }
    }
    if (unref(book) !== currentBook) {
      return
    }
    // books without text (e.g. only images) end up without locations
    if (currentBook.locations.length() < 1) {
      return
    }
    hasGlobalLocations.value = true
    // the current location was reported without a percentage, so let epub.js report it again
    unref(rendition)?.reportLocation()
  }

  function updateProgress(currentLocation: Location | undefined) {
    const percentage = currentLocation?.start?.percentage
    if (!unref(hasGlobalLocations) || !Number.isFinite(percentage)) {
      readingProgressPercent.value = null
      return
    }
    readingProgressPercent.value = clamp(percentage * 100)
  }

  async function seek(percent: number) {
    const currentBook = unref(book)
    if (!unref(hasGlobalLocations) || !currentBook || !Number.isFinite(percent)) {
      return
    }

    const cfi = currentBook.locations.cfiFromPercentage(clamp(percent) / 100)
    if (!cfi) {
      return
    }

    // display() queues internally, so seeks arriving while a render is in flight would all be
    // rendered one after another. Render the latest requested target only.
    pendingSeekCfi = cfi
    if (isSeeking) {
      return
    }
    isSeeking = true
    try {
      while (pendingSeekCfi && unref(book) === currentBook) {
        const target = pendingSeekCfi
        pendingSeekCfi = undefined
        try {
          await unref(rendition)?.display(target)
        } catch {
          // epub.js rejects locations it can't resolve, e.g. in books with few text nodes
        }
      }
    } finally {
      if (unref(book) === currentBook) {
        isSeeking = false
      }
    }
  }

  return { hasGlobalLocations, isGeneratingLocations, readingProgressPercent, seek }
}

function clamp(percent: number) {
  return Math.min(100, Math.max(0, percent))
}
