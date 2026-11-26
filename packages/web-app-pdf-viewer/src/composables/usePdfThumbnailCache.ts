import type { InjectionKey } from 'vue'

/** For each page of a new document, its page number before, undefined for new pages. */
export type PreviousPageNumbers = (number | undefined)[]

/**
 * The rendered thumbnails by page number. After a page action, they are shown at the new
 * position of their page until the new document is rendered, instead of blank ones.
 */
export function usePdfThumbnailCache() {
  let images = new Map<number, Blob>()
  let imagesRotation = 0

  function get(pageNumber: number, rotation: number) {
    return rotation === imagesRotation ? images.get(pageNumber) : undefined
  }

  function set(pageNumber: number, rotation: number, image: Blob) {
    if (rotation !== imagesRotation) {
      images = new Map()
      imagesRotation = rotation
    }
    images.set(pageNumber, image)
  }

  function remap(previousPageNumbers: PreviousPageNumbers) {
    const previous = images
    images = new Map()
    previousPageNumbers.forEach((previousPageNumber, index) => {
      const image = previousPageNumber && previous.get(previousPageNumber)
      if (image) {
        images.set(index + 1, image)
      }
    })
  }

  return { get, set, remap }
}

export const pdfThumbnailCacheKey: InjectionKey<ReturnType<typeof usePdfThumbnailCache>> =
  Symbol('pdfThumbnailCache')
