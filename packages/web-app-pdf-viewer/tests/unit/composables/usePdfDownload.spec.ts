import { mock } from 'vitest-mock-extended'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { EventBus } from 'pdfjs-dist/web/pdf_viewer.mjs'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useMessages } from '@opencloud-eu/web-pkg'
import { usePdfDownload } from '../../../src/composables/usePdfDownload'

function setup({ storageSize = 0 } = {}) {
  const doc = mock<PDFDocumentProxy>({
    annotationStorage: { size: storageSize } as PDFDocumentProxy['annotationStorage']
  })
  const saved = new Uint8Array([1])
  const original = new Uint8Array([2])
  doc.saveDocument.mockResolvedValue(saved)
  doc.getData.mockResolvedValue(original)
  const eventBus = mock<EventBus>()
  const downloadManager = { downloadData: vi.fn() }
  const beforeDownload = vi.fn()
  let messages: ReturnType<typeof useMessages>
  getComposableWrapper(() => {
    messages = useMessages()
    usePdfDownload({
      pdfDocument: doc,
      eventBus,
      downloadManager,
      fileName: 'form.pdf',
      beforeDownload
    })
  })
  const [, onNamedAction] = eventBus.on.mock.calls.find(([name]) => name === 'namedaction')
  return { doc, saved, original, onNamedAction, downloadManager, beforeDownload, messages }
}

describe('usePdfDownload', () => {
  it('downloads the document with its changes for the "Save as" buttons of forms', async () => {
    const { onNamedAction, downloadManager, beforeDownload, saved } = setup({ storageSize: 1 })
    onNamedAction({ action: 'SaveAs' })
    await vi.waitFor(() =>
      expect(downloadManager.downloadData).toHaveBeenCalledWith(saved, 'form.pdf')
    )
    expect(beforeDownload).toHaveBeenCalled()
  })

  it('downloads the original file without changes', async () => {
    const { onNamedAction, downloadManager, doc, original } = setup()
    onNamedAction({ action: 'SaveAs' })
    await vi.waitFor(() =>
      expect(downloadManager.downloadData).toHaveBeenCalledWith(original, 'form.pdf')
    )
    expect(doc.saveDocument).not.toHaveBeenCalled()
  })

  it('ignores other actions', () => {
    const { onNamedAction, beforeDownload } = setup()
    onNamedAction({ action: 'Print' })
    expect(beforeDownload).not.toHaveBeenCalled()
  })

  it('reports a failure', async () => {
    const { onNamedAction, doc, messages, downloadManager } = setup({ storageSize: 1 })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    doc.saveDocument.mockRejectedValue(new Error('broken'))
    onNamedAction({ action: 'SaveAs' })
    await vi.waitFor(() => expect(messages.showErrorMessage).toHaveBeenCalled())
    expect(downloadManager.downloadData).not.toHaveBeenCalled()
  })
})
