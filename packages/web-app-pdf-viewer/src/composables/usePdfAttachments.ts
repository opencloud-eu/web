import { shallowRef, toValue, unref, watch, type MaybeRefOrGetter } from 'vue'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { EventBus, PDFLinkService } from 'pdfjs-dist/web/pdf_viewer.mjs'
import type { AttachmentDownloadManager } from '../helpers/attachmentDownloadManager'

export type PdfAttachment = {
  /** Unique in the list, like in the PDF.js viewer: the key in the PDF, or the file name. */
  key: string
  /** PDF.js loads the content by it when it is needed. */
  id?: string
  filename: string
  description?: string
  /** Of some attachments of annotations, PDF.js loads it for the others. */
  content?: Uint8Array | null
}

/**
 * The files attached to the document, like in the attachments view of the PDF.js viewer: those
 * of the document (e.g. the XML of an e-invoice) and those of file attachment annotations,
 * which PDF.js reports once their page is rendered.
 */
export function usePdfAttachments({
  eventBus,
  pdfDocument,
  linkService,
  downloadManager
}: {
  eventBus: EventBus
  pdfDocument: MaybeRefOrGetter<PDFDocumentProxy | undefined>
  linkService: Pick<PDFLinkService, 'getAttachmentContent'>
  downloadManager: Pick<AttachmentDownloadManager, 'downloadData'>
}) {
  // Undefined while loading.
  const attachments = shallowRef<PdfAttachment[]>()

  watch(
    () => toValue(pdfDocument),
    async (doc) => {
      attachments.value = undefined
      // A broken part of the file is left out instead of loading forever.
      const files = await doc?.getAttachments().catch((): null => null)
      if (!doc || doc !== toValue(pdfDocument)) {
        return
      }
      const ofDocument = [...(files ?? [])].map(([id, { filename, description }]) => ({
        key: id,
        id,
        filename,
        description
      }))
      // Files of annotations reported in the meantime.
      const ofAnnotations = (unref(attachments) ?? []).filter(({ key }) => !files?.has(key))
      attachments.value = [...ofDocument, ...ofAnnotations]
    },
    { immediate: true }
  )

  eventBus.on(
    'fileattachmentannotation',
    ({
      attachmentId,
      filename,
      content,
      description
    }: Omit<PdfAttachment, 'key'> & { attachmentId?: string }) => {
      const list = unref(attachments) ?? []
      // Left out if their name is the key of a listed file, like in the PDF.js viewer.
      if (list.some(({ key }) => key === filename)) {
        return
      }
      attachments.value = [
        ...list,
        { key: filename, id: attachmentId, filename, content, description }
      ]
    }
  )

  /** Downloads it, PDF.js' components can't open files (the PDF.js viewer opens PDFs). */
  async function openAttachment({
    id,
    filename,
    content
  }: Pick<PdfAttachment, 'id' | 'filename' | 'content'>) {
    const data = (id && (await linkService.getAttachmentContent(id))) || content
    if (data) {
      downloadManager.downloadData(data, filename)
    }
  }

  return { attachments, openAttachment }
}
