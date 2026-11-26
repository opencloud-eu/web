import { nextTick, shallowRef } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mock } from 'vitest-mock-extended'
import type { PDFDocumentProxy } from 'pdfjs-dist'
// pdf_viewer.mjs takes PDF.js from globalThis.pdfjsLib, which pdfjs-dist sets when imported.
import 'pdfjs-dist'
import { EventBus } from 'pdfjs-dist/web/pdf_viewer.mjs'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { usePdfAttachments } from '../../../src/composables/usePdfAttachments'

function setup() {
  const files = new Map([['0', { filename: 'invoice.xml', description: 'Invoice data' }]])
  const pdfDocument = shallowRef(
    mock<PDFDocumentProxy>({ getAttachments: vi.fn().mockResolvedValue(files) })
  )
  const eventBus = new EventBus()
  const linkService = {
    getAttachmentContent: vi.fn().mockResolvedValue(new Uint8Array([1]))
  }
  const downloadManager = { downloadData: vi.fn() }
  let attachments: ReturnType<typeof usePdfAttachments>
  getComposableWrapper(() => {
    attachments = usePdfAttachments({ eventBus, pdfDocument, linkService, downloadManager })
  })
  return { attachments, eventBus, pdfDocument, linkService, downloadManager }
}

describe('usePdfAttachments', () => {
  it('lists the attachments of the document and of annotations, each file once', async () => {
    const { attachments, eventBus } = setup()
    await flushPromises()
    const content = new Uint8Array([2])
    eventBus.dispatch('fileattachmentannotation', { filename: 'data.csv', content })
    eventBus.dispatch('fileattachmentannotation', { filename: 'data.csv', content })
    expect(attachments.attachments.value.map(({ filename }) => filename)).toEqual([
      'invoice.xml',
      'data.csv'
    ])
  })

  // Like in the PDF.js viewer, whose list is keyed by the names in the PDF.
  it('leaves out files of annotations whose name is the key of a listed file', async () => {
    const { attachments, eventBus } = setup()
    await flushPromises()
    eventBus.dispatch('fileattachmentannotation', { filename: '0' })
    eventBus.dispatch('fileattachmentannotation', { filename: 'invoice.xml' })
    expect(attachments.attachments.value.map(({ key }) => key)).toEqual(['0', 'invoice.xml'])
  })

  it('opens attachments with the content PDF.js loads for them', async () => {
    const { attachments, linkService, downloadManager } = setup()
    await flushPromises()
    await attachments.openAttachment(attachments.attachments.value[0])
    expect(linkService.getAttachmentContent).toHaveBeenCalledWith('0')
    expect(downloadManager.downloadData).toHaveBeenCalledWith(new Uint8Array([1]), 'invoice.xml')
  })

  it('starts over with another document', async () => {
    const { attachments, pdfDocument } = setup()
    await flushPromises()
    pdfDocument.value = mock<PDFDocumentProxy>({
      getAttachments: vi.fn().mockResolvedValue(null)
    })
    await nextTick()
    await flushPromises()
    expect(attachments.attachments.value).toEqual([])
  })

  it('lists no files of a broken attachment list instead of loading forever', async () => {
    const { attachments, pdfDocument } = setup()
    pdfDocument.value = mock<PDFDocumentProxy>({
      getAttachments: vi.fn().mockRejectedValue(new Error('Broken'))
    })
    await flushPromises()
    expect(attachments.attachments.value).toEqual([])
  })
})
