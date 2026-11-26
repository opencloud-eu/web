import { shallowRef, unref, type ShallowRef } from 'vue'
import type { EventBus, PDFViewer } from 'pdfjs-dist/web/pdf_viewer.mjs'

/** Labels that only number the pages 1, 2, 3 … (or are all empty) add nothing. */
function isPlainNumbering(labels: string[]) {
  return (
    labels.every((label, index) => label === String(index + 1)) ||
    labels.every((label) => label === '')
  )
}

/**
 * The page labels of the document, e.g. "iii" for the third page of a preface, like in the
 * PDF.js viewer: undefined if the document has none worth showing. The pages get them too.
 */
export function usePdfPageLabels({
  viewer,
  eventBus
}: {
  viewer: ShallowRef<PDFViewer | undefined>
  eventBus: EventBus
}) {
  const pageLabels = shallowRef<string[]>()

  eventBus.on('pagesinit', async () => {
    pageLabels.value = undefined
    const pdfViewer = unref(viewer)
    const doc = pdfViewer?.pdfDocument
    // Broken labels in the file: page numbers instead.
    const labels = await doc?.getPageLabels().catch((): null => null)
    // A newer document came in meanwhile.
    if (!labels || doc !== unref(viewer)?.pdfDocument || isPlainNumbering(labels)) {
      return
    }
    pdfViewer.setPageLabels(labels)
    pageLabels.value = labels
  })

  return { pageLabels }
}
