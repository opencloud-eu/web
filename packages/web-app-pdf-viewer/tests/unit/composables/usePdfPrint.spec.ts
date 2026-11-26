import { mock } from 'vitest-mock-extended'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import type { EventBus } from 'pdfjs-dist/web/pdf_viewer.mjs'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useModals, type Modal } from '@opencloud-eu/web-pkg'
import { usePdfPrint } from '../../../src/composables/usePdfPrint'

function setup({ numPages = 2 } = {}) {
  const page = mock<PDFPageProxy>({ rotate: 0 })
  page.getViewport.mockReturnValue(
    mock<ReturnType<PDFPageProxy['getViewport']>>({ width: 100, height: 200 })
  )
  // Not a mock(), its proxy would break the promise.
  page.render.mockReturnValue({ promise: Promise.resolve() } as ReturnType<PDFPageProxy['render']>)
  const doc = mock<PDFDocumentProxy>({ numPages, isPureXfa: false })
  doc.getPage.mockResolvedValue(page)
  const eventBus = mock<EventBus>()
  const beforePrint = vi.fn()
  let print: ReturnType<typeof usePdfPrint>
  let modals: ReturnType<typeof useModals>
  const wrapper = getComposableWrapper(() => {
    modals = useModals()
    vi.mocked(modals.dispatchModal).mockImplementation((modal) => ({ ...modal, id: 'modal' }))
    print = usePdfPrint({ pdfDocument: doc, eventBus, beforePrint })
  })
  // The progress dialog
  function progressModal() {
    return vi.mocked(modals.dispatchModal).mock.calls.at(-1)[0] as Modal
  }
  return { print, doc, eventBus, beforePrint, modals, progressModal, wrapper }
}

function getPrintContainer() {
  return document.getElementById('pdf-viewer-print-container')
}

describe('usePdfPrint', () => {
  let urls = 0
  const printDialog = vi.fn()
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) =>
      callback(new Blob())
    )
    // The page images load right away.
    const src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')
    vi.spyOn(HTMLImageElement.prototype, 'src', 'set').mockImplementation(function (
      this: HTMLImageElement,
      value: string
    ) {
      src.set.call(this, value)
      queueMicrotask(() => this.onload?.(new Event('load')))
    })
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:page-${++urls}`)
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.stubGlobal('print', printDialog)
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    printDialog.mockClear()
    document.body.innerHTML = ''
  })

  it('prints the pages as images, after finishing what is being edited', async () => {
    const { print, beforePrint } = setup()
    await print.print()
    expect(beforePrint).toHaveBeenCalled()
    expect(printDialog).toHaveBeenCalled()
    expect(getPrintContainer().querySelectorAll('img')).toHaveLength(2)
    expect(print.isPrinting.value).toBe(true)
  })

  // window.print() doesn't wait for the print dialog in every browser.
  it('cleans up once printing is done', async () => {
    const { print } = setup()
    await print.print()
    const sources = [...getPrintContainer().querySelectorAll('img')].map(({ src }) => src)
    window.dispatchEvent(new Event('afterprint'))
    expect(getPrintContainer()).toBeNull()
    sources.forEach((src) => expect(URL.revokeObjectURL).toHaveBeenCalledWith(src))
    expect(print.isPrinting.value).toBe(false)
  })

  it('can be cancelled while long documents are prepared', async () => {
    const { print, doc, modals, progressModal } = setup({ numPages: 10 })
    const getPage = doc.getPage.getMockImplementation()
    doc.getPage.mockImplementation((pageNumber) => {
      if (pageNumber === 2) {
        progressModal().onCancel()
      }
      return getPage(pageNumber)
    })
    await print.print()
    expect(printDialog).not.toHaveBeenCalled()
    expect(modals.removeModal).toHaveBeenCalledWith('modal')
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2)
    expect(getPrintContainer()).toBeNull()
    expect(print.isPrinting.value).toBe(false)
  })

  it('prints with the print buttons of forms', async () => {
    const { eventBus } = setup()
    const [, onNamedAction] = eventBus.on.mock.calls.find(([name]) => name === 'namedaction')
    onNamedAction({ action: 'Print' })
    await vi.waitFor(() => expect(printDialog).toHaveBeenCalled())
  })
})
