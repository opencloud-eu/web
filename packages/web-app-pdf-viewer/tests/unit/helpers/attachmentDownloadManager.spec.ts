// pdf_viewer.mjs takes PDF.js from globalThis.pdfjsLib, which pdfjs-dist sets when imported.
import 'pdfjs-dist'
import { AttachmentDownloadManager } from '../../../src/helpers/attachmentDownloadManager'
import {
  countCode,
  countWorkerCode,
  getUsedMembers,
  includesCode,
  includesWorkerCode
} from '../pdfjsSource'

describe('AttachmentDownloadManager', () => {
  const downloads: { href: string; download: string }[] = []
  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:attachment')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      downloads.push({ href: this.href, download: this.download })
    })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    downloads.length = 0
  })

  function createdBlob() {
    return vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob
  }

  it.each(['page.html', 'image.svg', 'invoice.pdf'])(
    'downloads %s as binary data with its name, PDF.js uses openOrDownloadData',
    (filename) => {
      const opened = new AttachmentDownloadManager().openOrDownloadData(
        new Uint8Array([1, 2]),
        filename
      )
      expect(opened).toBe(false)
      expect(createdBlob().type).toBe('application/octet-stream')
      expect(downloads).toEqual([{ href: 'blob:attachment', download: filename }])
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:attachment')
    }
  )

  it('downloads files of the attachments list as binary data as well', () => {
    new AttachmentDownloadManager().downloadData(new Uint8Array([1]), 'page.html')
    expect(createdBlob().type).toBe('application/octet-stream')
    expect(downloads).toEqual([{ href: 'blob:attachment', download: 'page.html' }])
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:attachment')
  })

  // File attachment annotations and links to attachments, PDF.js would take the download
  // manager's own way for anything else.
  it('covers all PDF.js uses of the download manager', () => {
    expect(getUsedMembers('downloadManager')).toEqual(['openOrDownloadData'])
  })

  // The download manager's own three, audio and video of media annotations and the worker of
  // another origin. A new one needs a look at the type of what it serves.
  it('knows all places where PDF.js creates object URLs', () => {
    expect(countCode('URL.createObjectURL(')).toBe(5)
  })

  // The images of XFA forms.
  it('knows all places where the worker of PDF.js creates object URLs', () => {
    expect(countWorkerCode('URL.createObjectURL(')).toBe(1)
  })

  // Audio and video get an object URL of the page's origin, with the type the PDF names. The
  // worker only lets plain audio and video types through, the viewer checks the beginning only.
  // A PDF.js update changing these needs a look at what types can reach an object URL.
  it('knows how PDF.js checks the type of audio and video', () => {
    expect(includesCode(String.raw`if (!/^(?:video|audio)\//.test(blob.type)) {`)).toBe(true)
    expect(
      includesWorkerCode(
        String.raw`static #MEDIA_MIME_TYPE_RE = /^(?:video|audio)\/[a-z0-9][\w!#$&^.+-]{0,126}$/i;`
      )
    ).toBe(true)
    expect(
      includesWorkerCode(
        String.raw`static #MEDIA_CONTENT_TYPE_RE = /^(?:video|audio)\/[a-z0-9][\w!#$&^.+-]{0,126}(?: *; *[a-z0-9][\w!#$&^.+-]{0,126} *= *(?:[-!#$%&'*+.^\x60{|}~\w]+|"(?:[\x20\x21\x23-\x5b\x5d-\x7e]|\\[\x20-\x7e])*"))* *$/i;`
      )
    ).toBe(true)
  })
})
