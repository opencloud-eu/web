import { markRaw, onBeforeUnmount, ref, toValue, unref, type MaybeRefOrGetter } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useMessages, useModals } from '@opencloud-eu/web-pkg'
import { AnnotationMode, PixelsPerInch, XfaLayer, type PDFDocumentProxy } from 'pdfjs-dist'
import PdfPrintProgress from '../components/PdfPrintProgress.vue'
import { SimpleLinkService, XfaLayerBuilder, type EventBus } from 'pdfjs-dist/web/pdf_viewer.mjs'

const PRINT_DPI = 150
const PRINT_CONTAINER_ID = 'pdf-viewer-print-container'
// Short documents are ready before a progress dialog could be read.
const MIN_PAGES_FOR_PROGRESS = 10

/**
 * Prints the document including filled form fields and new annotations by rendering each
 * page into an image, the same approach the PDF.js viewer takes. Unlike printing a blob
 * URL in an iframe, this neither depends on the browser's PDF plugin nor on the CSP.
 * The print-only styles live in styles/print.css.
 */
export function usePdfPrint({
  pdfDocument,
  eventBus,
  beforePrint
}: {
  pdfDocument: MaybeRefOrGetter<PDFDocumentProxy | undefined>
  eventBus: EventBus
  /** E.g. to finish what is being edited, so it gets printed. */
  beforePrint: () => void
}) {
  const { $gettext } = useGettext()
  const { showErrorMessage } = useMessages()
  const { dispatchModal, removeModal } = useModals()
  const isPrinting = ref(false)
  // Closing the app ends the preparation, the document is gone then.
  let isUnmounted = false
  onBeforeUnmount(() => {
    isUnmounted = true
  })

  /** A page as image, rendered on `canvas`, which all pages share like in the PDF.js viewer. */
  async function renderPage(
    doc: PDFDocumentProxy,
    pageNumber: number,
    storage: PDFDocumentProxy['annotationStorage']['print'],
    isPortrait: boolean,
    canvas: HTMLCanvasElement
  ) {
    const page = await doc.getPage(pageNumber)
    const { width, height } = page.getViewport({ scale: 1 })
    // Like the PDF.js viewer: pages in the other orientation than the first one are turned to
    // fit the paper.
    const rotation = width <= height === isPortrait ? page.rotate : page.rotate - 90
    const viewport = page.getViewport({ scale: PRINT_DPI / 72, rotation })
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    await page.render({
      canvas,
      viewport,
      intent: 'print',
      annotationMode: AnnotationMode.ENABLE_STORAGE,
      printAnnotationStorage: storage
    }).promise
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Rendering page failed'))))
    })
    const img = document.createElement('img')
    // Loaded is enough for printing, like in the PDF.js viewer, decoding each one isn't.
    const isLoaded = new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
    })
    img.src = URL.createObjectURL(blob)
    try {
      await isLoaded
    } catch (e) {
      // Not in the container yet, so cleanup() wouldn't revoke it.
      URL.revokeObjectURL(img.src)
      throw e
    }
    return img
  }

  // Pure XFA forms are HTML, not canvas content. Same as getXfaHtmlForPrinting() of the
  // PDF.js viewer.
  function renderXfaPages(doc: PDFDocumentProxy, container: HTMLElement) {
    const xfaHtml = doc.allXfaHtml as { children: object[] }
    const linkService = new SimpleLinkService()
    const scale = Math.round(PixelsPerInch.PDF_TO_CSS_UNITS * 100) / 100
    for (const xfaPage of xfaHtml.children) {
      const page = document.createElement('div')
      page.className = 'xfaPrintedPage'
      container.append(page)
      const builder = new XfaLayerBuilder({
        pdfPage: null,
        annotationStorage: doc.annotationStorage,
        linkService,
        xfaHtml: xfaPage
      })
      const viewport = XfaLayer.getPageViewport(xfaPage, { scale })
      builder.render({ viewport, intent: 'print' })
      page.append(builder.div)
    }
  }

  /**
   * Renders the pages into the container, with progress and a way out for long documents,
   * like the PDF.js viewer. False if cancelled (or the app was closed meanwhile).
   */
  async function renderPages(doc: PDFDocumentProxy, container: HTMLElement, isPortrait: boolean) {
    // Freezes the current form values and annotations for the duration of the print.
    const storage = doc.annotationStorage.print
    const preparedPages = ref(0)
    let isCancelled = false
    const progressModal =
      doc.numPages >= MIN_PAGES_FOR_PROGRESS &&
      dispatchModal({
        elementClass: 'pdf-viewer-print-progress-modal',
        title: $gettext('Preparing document for printing'),
        // Cancelled with the dialog's close button.
        hideActions: true,
        customComponent: markRaw(PdfPrintProgress),
        customComponentAttrs: () => ({ current: unref(preparedPages), total: doc.numPages }),
        onCancel: () => {
          isCancelled = true
        }
      })
    const canvas = document.createElement('canvas')
    try {
      for (
        let pageNumber = 1;
        pageNumber <= doc.numPages && !isCancelled && !isUnmounted;
        pageNumber++
      ) {
        container.append(await renderPage(doc, pageNumber, storage, isPortrait, canvas))
        preparedPages.value = pageNumber
      }
    } finally {
      // Frees the canvas memory right away.
      canvas.width = 0
      canvas.height = 0
      if (progressModal) {
        removeModal(progressModal.id)
      }
    }
    return !isCancelled && !isUnmounted
  }

  async function print() {
    beforePrint()
    const doc = toValue(pdfDocument)
    if (!doc || unref(isPrinting)) {
      return
    }
    isPrinting.value = true
    const container = document.createElement('div')
    container.id = PRINT_CONTAINER_ID
    // PDF.js' variables are scoped to .pdf-viewer (see dev/vite-plugins/pdfjs.ts), XFA pages
    // need them.
    container.className = 'pdf-viewer'
    // The paper of the first page, without margins, like the PDF.js viewer.
    const pageStyle = document.createElement('style')

    function cleanup() {
      container.querySelectorAll('img').forEach((img) => URL.revokeObjectURL(img.src))
      container.remove()
      pageStyle.remove()
      // Only now, window.print() doesn't wait for the print dialog in every browser.
      isPrinting.value = false
    }

    try {
      const { width, height } = (await doc.getPage(1)).getViewport({ scale: 1 })
      pageStyle.textContent = `@page { size: ${width}pt ${height}pt; margin: 0; }`
      if (doc.isPureXfa) {
        renderXfaPages(doc, container)
      } else if (!(await renderPages(doc, container, width <= height))) {
        cleanup()
        return
      }
      document.head.append(pageStyle)
      document.body.append(container)
      window.addEventListener('afterprint', cleanup, { once: true })
      window.print()
    } catch (e) {
      cleanup()
      if (isUnmounted) {
        return
      }
      console.error(e)
      showErrorMessage({ title: $gettext('Printing failed'), errors: [e as Error] })
    }
  }

  // Print buttons of forms.
  eventBus.on('namedaction', ({ action }: { action: string }) => {
    if (action === 'Print') {
      print()
    }
  })

  return { isPrinting, print }
}
