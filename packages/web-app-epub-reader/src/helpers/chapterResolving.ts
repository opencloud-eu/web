import { Book, NavItem, Location } from 'epubjs'

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
  rendition: any
): NavItem | undefined {
  try {
    const contents = rendition?.getContents?.() as unknown as
      Array<{ document: Document }> | undefined
    const doc = contents?.[0]?.document
    if (!doc) return undefined

    const currentRange = rendition?.getRange?.(cfi)
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
 * Uses multiple fallback strategies to handle various EPUB structures:
 *
 * Strategy 1: Exact/normalized match directly against loaded TOC using relocated href
 * Strategy 2: Resolve via navigation.get(locationHref) but only if it maps to loaded TOC
 * Strategy 3: Match via navigation.get(spineHref), but only if it maps to loaded TOC
 * Strategy 4: Match by normalized spine href (without hash fragment)
 * Strategy 4b: Multiple chapters in same file - find by DOM element position
 * Strategy 5: Find containing chapter by spine index (for chapters spanning multiple files)
 * Final fallback: Return first chapter if available
 */
export function resolveCurrentChapter(
  currentLocation: Location,
  book: Book,
  chapters: NavItem[],
  rendition: any
): NavItem | undefined {
  const locationHref = currentLocation?.start?.href
  const navigation = book?.navigation
  const chapterList = chapters

  if (!navigation) {
    return chapterList[0]
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
    const byNavigationLocationHrefFromToc = findChapterByHref(chapterList, byLocationHref?.href)
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
    return chapterList[0]
  }

  // Strategy 3: Match via navigation.get(spineHref), but only if it maps to loaded TOC
  const bySpineHref = navigation.get(spineHref)
  const bySpineHrefFromToc = findChapterByHref(chapterList, bySpineHref?.href)
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

    // Fallback: Use spine index to find closest chapter instead of blindly using first
    const spineItem = book?.spine.get(locationCfi)
    const fallbackSpineIndex = spineItem?.index
    if (typeof fallbackSpineIndex === 'number') {
      const closestBySpineIndex = matchingChapters
        .map((ch) => ({
          chapter: ch,
          idx: book?.spine.get(ch.href.split('#')[0])?.index ?? -1
        }))
        .filter((item) => item.idx >= 0)
        .sort(
          (a, b) => Math.abs(a.idx - fallbackSpineIndex) - Math.abs(b.idx - fallbackSpineIndex)
        )[0]

      if (closestBySpineIndex) {
        return closestBySpineIndex.chapter
      }
    }

    return matchingChapters[0]
  }

  // Strategy 5: Find containing chapter by spine index (for chapters spanning multiple files)
  const currentSpineIndex = spineItem?.index
  if (typeof currentSpineIndex === 'number') {
    const chaptersWithSpineIndex = chapterList
      .map((chapter) => {
        const chapterSpineItem = book?.spine.get(chapter.href.split('#')[0])
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

  // Final fallback: return first chapter if available
  return chapterList[0]
}
