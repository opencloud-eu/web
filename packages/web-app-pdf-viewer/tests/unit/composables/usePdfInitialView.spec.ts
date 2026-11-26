import { unref } from 'vue'
import { mock } from 'vitest-mock-extended'
import type { PDFDocumentProxy } from 'pdfjs-dist'
// pdf_viewer.mjs takes PDF.js from globalThis.pdfjsLib, which pdfjs-dist sets when imported.
import 'pdfjs-dist'
import { SpreadMode } from 'pdfjs-dist/web/pdf_viewer.mjs'
import { usePdfInitialView } from '../../../src/composables/usePdfInitialView'

function createDocument(pageMode: string | null, pageLayout: string) {
  return mock<PDFDocumentProxy>({
    getPageMode: vi.fn().mockResolvedValue(pageMode),
    getPageLayout: vi.fn().mockResolvedValue(pageLayout)
  })
}

async function open(doc: PDFDocumentProxy) {
  const setSpreadMode = vi.fn()
  const initialView = usePdfInitialView({ setSpreadMode })
  await initialView.applyInitialView(doc)
  return { ...initialView, setSpreadMode }
}

describe('usePdfInitialView', () => {
  it('starts with the sidebar closed on the pages, toggling opens and closes it', () => {
    const { isSidebarOpen, sidebarView, toggleSidebar } = usePdfInitialView({
      setSpreadMode: vi.fn()
    })
    expect(unref(isSidebarOpen)).toBe(false)
    expect(unref(sidebarView)).toBe('pages')
    toggleSidebar()
    expect(unref(isSidebarOpen)).toBe(true)
    toggleSidebar()
    expect(unref(isSidebarOpen)).toBe(false)
  })

  it.each([
    ['UseThumbs', 'pages'],
    ['UseOutlines', 'outline'],
    ['UseAttachments', 'attachments'],
    ['UseOC', 'layers']
  ])('opens the sidebar for page mode %s with %s', async (pageMode, view) => {
    const { isSidebarOpen, sidebarView } = await open(createDocument(pageMode, ''))
    expect(unref(isSidebarOpen)).toBe(true)
    expect(unref(sidebarView)).toBe(view)
  })

  it.each([
    ['TwoColumnLeft', SpreadMode.ODD],
    ['TwoPageLeft', SpreadMode.ODD],
    ['TwoColumnRight', SpreadMode.EVEN],
    ['TwoPageRight', SpreadMode.EVEN]
  ])('shows pages side by side for page layout %s', async (pageLayout, spreadMode) => {
    const { setSpreadMode } = await open(createDocument(null, pageLayout))
    expect(setSpreadMode).toHaveBeenCalledWith(spreadMode)
  })

  it.each([
    ['UseNone', 'SinglePage'],
    [null, '']
  ])('keeps the defaults if the document asks for nothing (%s, %s)', async (mode, layout) => {
    const { isSidebarOpen, sidebarView, setSpreadMode } = await open(createDocument(mode, layout))
    expect(unref(isSidebarOpen)).toBe(false)
    expect(unref(sidebarView)).toBe('pages')
    expect(setSpreadMode).not.toHaveBeenCalled()
  })

  it('keeps the default for a broken entry, follows the other one', async () => {
    const { isSidebarOpen, setSpreadMode } = await open(
      mock<PDFDocumentProxy>({
        getPageMode: vi.fn().mockRejectedValue(new Error('Broken')),
        getPageLayout: vi.fn().mockResolvedValue('TwoPageLeft')
      })
    )
    expect(unref(isSidebarOpen)).toBe(false)
    expect(setSpreadMode).toHaveBeenCalledWith(SpreadMode.ODD)
  })

  it('shows the view the document asks for only when it is opened', async () => {
    const { isSidebarOpen, sidebarView, toggleSidebar, applyInitialView, setSpreadMode } =
      await open(createDocument('UseOutlines', 'TwoPageLeft'))
    // E.g. the document rebuilt after a page operation.
    toggleSidebar()
    await applyInitialView(createDocument('UseAttachments', 'TwoPageRight'))
    expect(unref(isSidebarOpen)).toBe(false)
    expect(unref(sidebarView)).toBe('outline')
    expect(setSpreadMode).toHaveBeenCalledTimes(1)
  })
})
