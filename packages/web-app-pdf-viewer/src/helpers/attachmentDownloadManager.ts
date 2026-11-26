import { triggerDownloadWithFilename } from '@opencloud-eu/web-pkg'
import { DownloadManager } from 'pdfjs-dist/web/pdf_viewer.mjs'

/**
 * Downloads the files attached to the PDF (from the attachments list, the outline, file
 * attachment annotations and links to attachments) and the document itself, for the "Save as"
 * buttons of forms. Always as binary data, whatever the file type, so the browser saves them
 * instead of showing them.
 */
export class AttachmentDownloadManager extends DownloadManager {
  override downloadData(data: Uint8Array, filename: string) {
    const blob = new Blob([data as Uint8Array<ArrayBuffer>], { type: 'application/octet-stream' })
    const blobUrl = URL.createObjectURL(blob)
    triggerDownloadWithFilename(blobUrl, filename)
    URL.revokeObjectURL(blobUrl)
  }

  /** PDF.js would open PDFs in its viewer, there is none here. */
  override openOrDownloadData(data: Uint8Array, filename: string) {
    this.downloadData(data, filename)
    return false
  }
}
