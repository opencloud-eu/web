import { onBeforeUnmount, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { useIntersectionObserver, useObjectUrl, type MaybeComputedElementRef } from '@vueuse/core'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import type { EventBus } from 'pdfjs-dist/web/pdf_viewer.mjs'
import type { usePdfThumbnailCache } from './usePdfThumbnailCache'
import { getPageColors } from '../helpers/pageColors'

// Sharp on screens with twice the pixels, at the width of the sidebar.
const THUMBNAIL_WIDTH = 256

/**
 * The image of a page for its thumbnail. Only rendered once the element is scrolled into view,
 * documents can be long. From then on it follows the rotation of the view, like in the PDF.js
 * viewer, also while it is being rendered.
 */
export function usePdfThumbnailImage({
  element,
  pdfDocument,
  pageNumber,
  rotation,
  cache,
  eventBus
}: {
  element: MaybeComputedElementRef
  pdfDocument: MaybeRefOrGetter<PDFDocumentProxy>
  pageNumber: MaybeRefOrGetter<number>
  /** Of the view, on top of the page's own. */
  rotation: MaybeRefOrGetter<number>
  /** Shown until rendered, e.g. the image of the page before a page action. */
  cache?: ReturnType<typeof usePdfThumbnailCache>
  /**
   * Of the viewer: PDFViewer frees the memory of pages rendered only for the thumbnails once
   * it hears of them, like the thumbnails of the PDF.js viewer tell it.
   */
  eventBus?: Pick<EventBus, 'dispatch'>
}) {
  const image = shallowRef<Blob | null>(cache?.get(toValue(pageNumber), toValue(rotation)))
  // Revoked when replaced or unmounted.
  const imageUrl = useObjectUrl(image)
  let renderTask: RenderTask | undefined
  let isUnmounted = false
  let isVisible = false

  async function render() {
    renderTask?.cancel()
    // A newer rendering, e.g. for another rotation, replaces this one.
    const currentRotation = toValue(rotation)
    const page = await toValue(pdfDocument).getPage(toValue(pageNumber))
    if (currentRotation !== toValue(rotation) || isUnmounted) {
      return
    }
    const pageRotation = page.rotate + currentRotation
    const unscaled = page.getViewport({ scale: 1, rotation: pageRotation })
    const viewport = page.getViewport({
      scale: THUMBNAIL_WIDTH / unscaled.width,
      rotation: pageRotation
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    renderTask = page.render({ canvas, viewport, pageColors: getPageColors() })
    await renderTask.promise
    eventBus?.dispatch('thumbnailrendered', {
      source: null,
      pageNumber: toValue(pageNumber),
      pdfPage: page
    })
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve))
    if (currentRotation === toValue(rotation) && !isUnmounted && blob) {
      image.value = blob
      cache?.set(toValue(pageNumber), currentRotation, blob)
    }
  }

  function renderSafely() {
    render().catch((e) => {
      if (e?.name !== 'RenderingCancelledException') {
        console.error(e)
      }
    })
  }

  const { stop: stopObserving } = useIntersectionObserver(element, (entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) {
      return
    }
    stopObserving()
    isVisible = true
    renderSafely()
  })

  watch(
    () => toValue(rotation),
    () => {
      if (isVisible) {
        renderSafely()
      }
    }
  )

  onBeforeUnmount(() => {
    isUnmounted = true
    renderTask?.cancel()
  })

  return { imageUrl }
}
