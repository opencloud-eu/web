import { Book, Location, Rendition } from 'epubjs'
import { Ref, ref, shallowRef, unref, watch } from 'vue'
import { Chapter } from '../types'
import { flattenToc } from '../helpers/toc'

type ChapterEntry = Chapter & {
  /** Index of the spine item the chapter starts in, undefined when the href doesn't resolve. */
  spineIndex?: number
  /** Element id the chapter starts at inside its spine item. */
  anchorId?: string
}

/**
 * epub.js declares `getContents(): Contents`, but at runtime the paginated manager returns one
 * `Contents` per rendered view.
 */
type RenditionViews = {
  getContents: () => Array<{ document?: Document }>
  getRange: (cfi: string) => Range | null
}

type DisplayedPage = {
  doc: Document
  start?: Node
  end: Node
}

type ChaptersOptions = {
  book: Ref<Book | undefined>
  rendition: Ref<Rendition | undefined>
  location: Ref<Location | undefined>
}

/**
 * Provides the flattened table of contents and resolves the chapter of the current location.
 *
 * A location only tells which spine item is displayed. Chapters are mapped to spine items once
 * per book, so resolving comes down to: the last chapter of that spine item that has started by
 * the end of the displayed page, otherwise the last chapter of a preceding spine item. A chapter
 * the user navigated to stays selected as long as its heading is on the displayed page, also
 * when later chapters start on the same page.
 */
export function useChapters({ book, rendition, location }: ChaptersOptions) {
  const chapters = ref<Chapter[]>([])
  const entries = shallowRef<ChapterEntry[]>([])
  const currentChapter = ref<Chapter>()
  let requestedChapter: ChapterEntry | undefined

  watch(
    book,
    async (currentBook) => {
      chapters.value = []
      entries.value = []
      currentChapter.value = undefined
      requestedChapter = undefined
      if (!currentBook) {
        return
      }

      const { toc } = await currentBook.loaded.navigation
      if (unref(book) !== currentBook) {
        return
      }

      entries.value = flattenToc(toc).map((chapter) => {
        const [href, anchorId] = chapter.href.split('#')
        const resolved = resolveSpineHref(currentBook, href)
        return {
          ...chapter,
          href: resolved.href + (anchorId ? `#${anchorId}` : ''),
          spineIndex: resolved.section?.index,
          anchorId
        }
      })
      chapters.value = unref(entries).map(({ id, href, label, depth }) => ({
        id,
        href,
        label,
        depth
      }))
    },
    { immediate: true }
  )

  watch([location, entries], ([currentLocation]) => {
    const resolved = currentLocation ? resolveChapter(currentLocation) : undefined
    if (resolved) {
      currentChapter.value = resolved
    }
  })

  function resolveChapter(currentLocation: Location): Chapter | undefined {
    const spineIndex = currentLocation.start?.index
    if (typeof spineIndex !== 'number') {
      return undefined
    }
    if (requestedChapter && requestedChapter.spineIndex !== spineIndex) {
      requestedChapter = undefined
    }

    const inSpineItem = unref(entries).filter((entry) => entry.spineIndex === spineIndex)
    if (inSpineItem.length > 0) {
      const page = getDisplayedPage(currentLocation)
      if (!page) {
        return inSpineItem[0]
      }
      const started = findStartedOnPage(inSpineItem, page)
      if (started) {
        return started
      }
    }
    // before the first chapter, e.g. a cover page, the first chapter is the closest
    return findLastPreceding(spineIndex) || unref(chapters)[0]
  }

  function findStartedOnPage(candidates: ChapterEntry[], page: DisplayedPage) {
    const requested = requestedChapter
    if (requested && candidates.includes(requested)) {
      const position = getAnchorPosition(page.doc, requested)
      if (
        position &&
        isAtOrBefore(position, page.end) &&
        (!page.start || !isBefore(position, page.start))
      ) {
        return requested
      }
    }
    requestedChapter = undefined

    // Chapters are in reading order, so the last one that has started by the end of the page wins.
    let anyAnchorFound = false
    for (let i = candidates.length - 1; i >= 0; i--) {
      if (!candidates[i].anchorId) {
        // starts at the top of the spine item, so it has started on every page of it
        return candidates[i]
      }
      const position = getAnchorPosition(page.doc, candidates[i])
      if (!position) {
        continue
      }
      anyAnchorFound = true
      if (isAtOrBefore(position, page.end)) {
        return candidates[i]
      }
    }
    // a book whose anchors don't exist in the document, better than a chapter of another file
    return anyAnchorFound ? undefined : candidates[0]
  }

  function getDisplayedPage(currentLocation: Location): DisplayedPage | undefined {
    const views = unref(rendition) as unknown as RenditionViews | undefined
    const doc = views?.getContents()[0]?.document
    const start = resolveNode(views, currentLocation.start?.cfi)
    let end = resolveNode(views, currentLocation.end?.cfi) || start
    if (!doc || !end) {
      return undefined
    }
    if (start && isBefore(end, start)) {
      // epub.js reports an end before the start for vertical writing modes
      end = start
    }
    return { doc, start, end }
  }

  function resolveNode(views: RenditionViews | undefined, cfi: string | undefined) {
    if (!views || !cfi) {
      return undefined
    }
    try {
      return views.getRange(cfi)?.startContainer || undefined
    } catch {
      return undefined
    }
  }

  function findLastPreceding(spineIndex: number) {
    let preceding: ChapterEntry | undefined
    for (const entry of unref(entries)) {
      if (entry.spineIndex === undefined || entry.spineIndex >= spineIndex) {
        continue
      }
      if (!preceding || entry.spineIndex >= preceding.spineIndex) {
        preceding = entry
      }
    }
    return preceding
  }

  async function goToChapter(chapter: Chapter) {
    requestedChapter = unref(entries).find((entry) => entry.id === chapter.id)
    currentChapter.value = chapter
    try {
      await unref(rendition)?.display(chapter.href)
    } catch (error) {
      // epub.js rejects with "No Section Found" for hrefs that don't match a spine item
      console.warn(`Could not display chapter ${chapter.href}`, error)
    }
  }

  return { chapters, currentChapter, goToChapter }
}

/**
 * TOC hrefs are relative to the navigation document, spine hrefs to the package document.
 * epub.js doesn't resolve the difference, so hrefs that don't match a spine item directly are
 * resolved against the navigation document's directory.
 */
function resolveSpineHref(book: Book, href: string) {
  const direct = book.spine.get(href)
  if (direct) {
    return { section: direct, href }
  }

  const navPath = book.packaging?.navPath || book.packaging?.ncxPath
  if (!navPath || !href) {
    return { section: undefined, href }
  }
  const navDir = navPath.includes('/') ? navPath.slice(0, navPath.lastIndexOf('/') + 1) : ''
  let resolved: string
  try {
    resolved = decodeURI(new URL(href, `file:///${navDir}`).pathname.slice(1))
  } catch {
    return { section: undefined, href }
  }
  const section = book.spine.get(resolved)
  return section ? { section, href: resolved } : { section: undefined, href }
}

/**
 * The position a chapter starts at: the first text of its anchor element, so that an anchor
 * wrapping the whole chapter (e.g. a `<section>`) doesn't count as visible on all of its pages.
 * An entry without a fragment starts at the top of the spine item.
 */
function getAnchorPosition(doc: Document, entry: ChapterEntry): Node | null {
  const anchor = entry.anchorId ? doc.getElementById(entry.anchorId) : doc.body?.firstElementChild
  if (!anchor) {
    return null
  }
  const walker = doc.createTreeWalker(anchor, NodeFilter.SHOW_TEXT)
  let text = walker.nextNode()
  while (text && !text.textContent.trim()) {
    text = walker.nextNode()
  }
  return text || anchor
}

/** Whether `position` is at or before `node`, i.e. `node` follows it, is inside it or contains it. */
function isAtOrBefore(position: Node, node: Node) {
  const relation = position.compareDocumentPosition(node)
  return (
    relation === 0 ||
    Boolean(relation & Node.DOCUMENT_POSITION_FOLLOWING) ||
    Boolean(relation & Node.DOCUMENT_POSITION_CONTAINED_BY) ||
    Boolean(relation & Node.DOCUMENT_POSITION_CONTAINS)
  )
}

/** Whether `position` ends before `node`, i.e. `node` follows it without being inside it. */
function isBefore(position: Node, node: Node) {
  const relation = position.compareDocumentPosition(node)
  return (
    Boolean(relation & Node.DOCUMENT_POSITION_FOLLOWING) &&
    !(relation & Node.DOCUMENT_POSITION_CONTAINED_BY)
  )
}
