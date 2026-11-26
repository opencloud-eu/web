import { ref, unref } from 'vue'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { SpreadMode } from 'pdfjs-dist/web/pdf_viewer.mjs'

export type SidebarView = 'pages' | 'outline' | 'attachments' | 'layers'

// Same mapping as the PDF.js viewer.
const SIDEBAR_VIEWS: Record<string, SidebarView> = {
  UseThumbs: 'pages',
  UseOutlines: 'outline',
  UseAttachments: 'attachments',
  UseOC: 'layers'
}
const SPREAD_MODES: Record<string, number> = {
  TwoColumnLeft: SpreadMode.ODD,
  TwoPageLeft: SpreadMode.ODD,
  TwoColumnRight: SpreadMode.EVEN,
  TwoPageRight: SpreadMode.EVEN
}

/**
 * The sidebar and the view a document asks for when it is opened (its page mode and layout), as
 * far as the PDF.js viewer follows it: e.g. with its outline or pages side by side.
 */
export function usePdfInitialView({ setSpreadMode }: { setSpreadMode: (mode: number) => void }) {
  const isSidebarOpen = ref(false)
  const sidebarView = ref<SidebarView>('pages')

  function toggleSidebar() {
    isSidebarOpen.value = !unref(isSidebarOpen)
  }

  // Once when the file is opened, not after page operations, like the PDF.js viewer.
  let hasInitialView = false
  async function applyInitialView(doc: PDFDocumentProxy) {
    if (hasInitialView) {
      return
    }
    hasInitialView = true
    // A broken entry in the file: the default for it.
    const [pageMode, pageLayout] = await Promise.all([
      doc.getPageMode().catch((): undefined => undefined),
      doc.getPageLayout().catch((): undefined => undefined)
    ])
    const view = SIDEBAR_VIEWS[pageMode]
    if (view) {
      sidebarView.value = view
      isSidebarOpen.value = true
    }
    const spreadMode = SPREAD_MODES[pageLayout]
    if (spreadMode !== undefined) {
      setSpreadMode(spreadMode)
    }
  }

  return { isSidebarOpen, sidebarView, toggleSidebar, applyInitialView }
}
