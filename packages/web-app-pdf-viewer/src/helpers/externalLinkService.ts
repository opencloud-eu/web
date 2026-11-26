import { PDFLinkService } from 'pdfjs-dist/web/pdf_viewer.mjs'
import { isWebUrl } from './externalLinks'

/**
 * Opens web pages in a new tab, but other links like mailto: and tel: without one: their app
 * opens instead, the new tab would stay empty.
 */
export class ExternalLinkService extends PDFLinkService {
  override addLinkAttributes(link: HTMLAnchorElement, url: string, newWindow = false) {
    super.addLinkAttributes(link, url, newWindow)
    if (!isWebUrl(url)) {
      link.target = ''
    }
  }
}
