import { Book, NavItem, Location, Rendition } from 'epubjs'

/**
 * The rendition members used for DOM based chapter resolution.
 *
 * epub.js declares `getContents(): Contents`, but at runtime the method returns one
 * `Contents` per live view. Its typings cannot be augmented either, because `Rendition`
 * is re-exported as the default export of an inner module, so we model the real shape here.
 */
type RenditionDom = {
  getContents?: () => Array<{ document?: Document }>
  getRange?: (cfi: string) => Range | null
}

function findChapterFromNavigationItem(
  chapterList: NavItem[],
  navigationItem?: Pick<NavItem, 'id' | 'href'> | null
): NavItem | undefined {
  if (!navigationItem) {
    return undefined
  }
  return (
    chapterList.find((chapter) => chapter.id === navigationItem.id) ||
    findChapterByHref(chapterList, navigationItem.href)
  )
}

/**
 * Finds a chapter by href from the chapter list.
 * Supports both exact matches and normalized matches (strips hash fragments).
 */
export function findChapterByHref(chapterList: NavItem[], href?: string): NavItem | undefined {
  if (!href) {
    return undefined
  }

  const exactMatch = chapterList.find((chapter) => chapter.href === href)
  if (exactMatch) {
    return exactMatch
  }

  const normalizedHref = href.split('#')[0]
  const matchesBySpineHref = chapterList.filter(
    (chapter) => chapter.href.split('#')[0] === normalizedHref
  )
  if (matchesBySpineHref.length === 1) {
    return matchesBySpineHref[0]
  }

  return undefined
}

/**
 * Finds a chapter by DOM element position when multiple chapters exist in the same file.
 * Compares the current position against chapter anchor elements to determine which chapter
 * contains the current reading position.
 */
export function findChapterByDomPosition(
  chapters: NavItem[],
  cfi: string,
  rendition: Rendition
): NavItem | undefined {
  try {
    const renditionDom = rendition as unknown as RenditionDom
    const doc = renditionDom?.getContents?.()?.[0]?.document
    if (!doc) return undefined

    const currentRange = renditionDom?.getRange?.(cfi)
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

/**
 * Resolves the current chapter based on the current location in the book.
 * Uses multiple resolution strategies to handle various EPUB structures:
 *
 * Strategy 1: Exact/normalized match directly against loaded TOC using relocated href
 * Strategy 2: Resolve via navigation.get(locationHref) but only if it maps to loaded TOC
 * Strategy 3: Match via navigation.get(spineHref), but only if it maps to loaded TOC
 * Strategy 4: Match by normalized spine href (without hash fragment)
 * Strategy 4b: Multiple chapters in same file - find by DOM element position
 * Strategy 5: Resolve by nearest TOC chapter in spine order
 *
 * Returns undefined when no strategy resolves a chapter, so that callers can keep the
 * previously resolved chapter instead of highlighting an unrelated one.
 */
export function resolveCurrentChapter(
  currentLocation: Location,
  book: Book,
  chapters: NavItem[],
  rendition: Rendition
): NavItem | undefined {
  const locationHref = currentLocation?.start?.href
  const navigation = book?.navigation
  const chapterList = chapters

  if (!navigation) {
    return undefined
  }

  // Strategy 1: Exact/normalized match directly against loaded TOC using relocated href
  if (locationHref) {
    const byLocationHrefFromToc = findChapterByHref(chapterList, locationHref)
    if (byLocationHrefFromToc) {
      return byLocationHrefFromToc
    }
  }

  // Strategy 2: Resolve via navigation.get(locationHref) but only if it maps to loaded TOC
  if (locationHref) {
    const byLocationHref = navigation.get(locationHref)
    const byNavigationLocationHrefFromToc = findChapterFromNavigationItem(
      chapterList,
      byLocationHref
    )
    if (byNavigationLocationHrefFromToc) {
      return byNavigationLocationHrefFromToc
    }
  }

  const locationCfi = currentLocation?.start?.cfi
  const locationIndex = currentLocation?.start?.index
  const spineTarget =
    locationCfi || (typeof locationIndex === 'number' ? locationIndex : undefined) || locationHref
  const spineItem = spineTarget ? book?.spine.get(spineTarget) : undefined
  const spineHref = spineItem?.href
  if (!spineHref) {
    return undefined
  }

  // Strategy 3: Match via navigation.get(spineHref), but only if it maps to loaded TOC
  const bySpineHref = navigation.get(spineHref)
  const bySpineHrefFromToc = findChapterFromNavigationItem(chapterList, bySpineHref)
  if (bySpineHrefFromToc) {
    return bySpineHrefFromToc
  }

  // Strategy 4: Match by normalized spine href (without hash fragment)
  const normalizedSpineHref = spineHref.split('#')[0]
  const matchingChapters = chapterList.filter(
    (chapter) => chapter.href.split('#')[0] === normalizedSpineHref
  )

  if (matchingChapters.length === 1) {
    return matchingChapters[0]
  }

  // Strategy 4b: Multiple chapters in same file - find by DOM element position
  if (matchingChapters.length > 1 && locationCfi) {
    const resolved = findChapterByDomPosition(matchingChapters, locationCfi, rendition)
    if (resolved) {
      return resolved
    }

    // All candidates share the same spine item, so the first one in TOC order is the
    // closest available guess.
    return matchingChapters[0]
  }

  // Strategy 5: Resolve by nearest TOC chapter in spine order
  const currentSpineIndex = spineItem?.index
  if (typeof currentSpineIndex === 'number') {
    let nearestChapter: { chapter: NavItem; spineIndex: number; tocOrder: number } | undefined
    let firstChapterInSpine: { chapter: NavItem; spineIndex: number; tocOrder: number } | undefined

    for (const [tocOrder, chapter] of chapterList.entries()) {
      const chapterSpineItem = book?.spine.get(chapter.href.split('#')[0])
      const chapterSpineIndex = chapterSpineItem?.index
      if (typeof chapterSpineIndex !== 'number') {
        continue
      }

      const chapterAtIndex = { chapter, spineIndex: chapterSpineIndex, tocOrder }
      if (
        !firstChapterInSpine ||
        chapterSpineIndex < firstChapterInSpine.spineIndex ||
        (chapterSpineIndex === firstChapterInSpine.spineIndex &&
          tocOrder < firstChapterInSpine.tocOrder)
      ) {
        firstChapterInSpine = chapterAtIndex
      }

      if (
        chapterSpineIndex <= currentSpineIndex &&
        (!nearestChapter ||
          chapterSpineIndex > nearestChapter.spineIndex ||
          (chapterSpineIndex === nearestChapter.spineIndex && tocOrder < nearestChapter.tocOrder))
      ) {
        nearestChapter = chapterAtIndex
      }
    }

    return nearestChapter?.chapter ?? firstChapterInSpine?.chapter
  }

  return undefined
}
