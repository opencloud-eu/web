// pdf_viewer.mjs takes PDF.js from globalThis.pdfjsLib, which pdfjs-dist sets when imported.
import 'pdfjs-dist'
import { EventBus, LinkTarget } from 'pdfjs-dist/web/pdf_viewer.mjs'
import { ExternalLinkService } from '../../../src/helpers/externalLinkService'

function getLink(url: string) {
  const linkService = new ExternalLinkService({
    eventBus: new EventBus(),
    externalLinkTarget: LinkTarget.BLANK
  })
  const link = document.createElement('a')
  linkService.addLinkAttributes(link, url)
  return link
}

describe('ExternalLinkService', () => {
  it.each(['https://example.com', 'HTTP://example.com'])('opens %s in a new tab', (url) => {
    const link = getLink(url)
    expect(link.target).toBe('_blank')
    expect(link.rel).toContain('noopener noreferrer')
  })

  // Their app opens, a new tab would stay empty.
  it.each(['mailto:alice@example.com', 'tel:+491234'])('opens %s without a new tab', (url) => {
    const link = getLink(url)
    expect(link.href).toBe(url)
    expect(link.target).toBe('')
    expect(link.rel).toContain('noopener noreferrer')
  })
})
