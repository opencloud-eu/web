import { toValue, type MaybeRefOrGetter } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useMessages } from '@opencloud-eu/web-pkg'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { EventBus } from 'pdfjs-dist/web/pdf_viewer.mjs'
import type { AttachmentDownloadManager } from '../helpers/attachmentDownloadManager'

/**
 * Downloads the document with the changes made in the viewer, for the "Save as" buttons of
 * forms. Like the PDF.js viewer: the original file unless something was filled in or edited.
 */
export function usePdfDownload({
  pdfDocument,
  eventBus,
  downloadManager,
  fileName,
  beforeDownload
}: {
  pdfDocument: MaybeRefOrGetter<PDFDocumentProxy | undefined>
  eventBus: EventBus
  downloadManager: Pick<AttachmentDownloadManager, 'downloadData'>
  fileName: MaybeRefOrGetter<string>
  /** E.g. to finish what is being edited, so it is part of the file. */
  beforeDownload: () => void
}) {
  const { $gettext } = useGettext()
  const { showErrorMessage } = useMessages()

  async function download() {
    const doc = toValue(pdfDocument)
    if (!doc) {
      return
    }
    beforeDownload()
    try {
      const data = doc.annotationStorage.size > 0 ? await doc.saveDocument() : await doc.getData()
      downloadManager.downloadData(data, toValue(fileName))
    } catch (e) {
      console.error(e)
      showErrorMessage({ title: $gettext('Download failed'), errors: [e as Error] })
    }
  }

  // "Save as" buttons of forms.
  eventBus.on('namedaction', ({ action }: { action: string }) => {
    if (action === 'SaveAs') {
      download()
    }
  })

  return { download }
}
