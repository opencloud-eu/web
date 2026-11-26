import { mock } from 'vitest-mock-extended'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import { getDocumentProperties, getPageSize } from '../../../src/helpers/documentProperties'

vi.mock('pdfjs-dist', async (importOriginal) => ({
  ...(await importOriginal<typeof import('pdfjs-dist')>()),
  PDFDateString: {
    toDateObject: (value: string) => (value ? new Date(Date.UTC(2024, 2, 1)) : null)
  }
}))

function page(width: number, height: number, rotate = 0) {
  return mock<PDFPageProxy>({ view: [0, 0, width, height], userUnit: 1, rotate })
}

describe('getPageSize', () => {
  it.each([
    [
      page(595.28, 841.89),
      0,
      'de-DE',
      { width: 210, height: 297, unit: 'mm', name: 'A4', isPortrait: true }
    ],
    [
      page(612, 792),
      0,
      'en-GB',
      { width: 215.9, height: 279.4, unit: 'mm', name: 'Letter', isPortrait: true }
    ],
    [
      page(595.28, 841.89),
      90,
      'de',
      { width: 297, height: 210, unit: 'mm', name: 'A4', isPortrait: false }
    ],
    [
      page(612, 792),
      0,
      'en-US',
      { width: 8.5, height: 11, unit: 'in', name: 'Letter', isPortrait: true }
    ],
    // Like the PDF.js viewer: the inches of the standard size, not of the points.
    [
      page(595, 842),
      0,
      'en-US',
      { width: 8.27, height: 11.69, unit: 'in', name: 'A4', isPortrait: true }
    ],
    [
      page(500, 300, 90),
      0,
      'de',
      { width: 105.8, height: 176.4, unit: 'mm', name: undefined, isPortrait: true }
    ]
  ])('measures %o rotated by %i in %s', (pdfPage, rotation, locale, size) => {
    expect(getPageSize(pdfPage, rotation, locale)).toEqual(size)
  })
})

describe('getDocumentProperties', () => {
  it('takes XMP first, then the info dictionary, like the PDF.js viewer', async () => {
    const xmp = new Map<string, string | string[]>([
      ['dc:title', 'XMP title'],
      ['dc:creator', ['Ada', 'Grace']]
    ])
    const doc = mock<PDFDocumentProxy>({
      numPages: 3,
      getMetadata: () =>
        Promise.resolve({
          info: {
            Title: 'Info title',
            Subject: 'Forms',
            Producer: 'Producer 1',
            PDFFormatVersion: '1.7',
            CreationDate: 'D:20240301',
            IsLinearized: true
          },
          metadata: { get: (name: string) => xmp.get(name) }
        } as Awaited<ReturnType<PDFDocumentProxy['getMetadata']>>),
      getPage: () => Promise.resolve(page(612, 792))
    })
    const properties = await getDocumentProperties(doc, {
      pageNumber: 1,
      rotation: 0,
      locale: 'de'
    })
    expect(properties).toMatchObject({
      title: 'XMP title',
      author: 'Ada\nGrace',
      subject: 'Forms',
      producer: 'Producer 1',
      version: '1.7',
      pageCount: 3,
      isLinearized: true,
      creationDate: new Date(Date.UTC(2024, 2, 1)),
      pageSize: { unit: 'mm', isPortrait: true }
    })
    expect(properties.keywords).toBeUndefined()
  })

  it('shows the properties of the document itself with broken metadata', async () => {
    const doc = mock<PDFDocumentProxy>({
      numPages: 3,
      getMetadata: vi.fn().mockRejectedValue(new Error('Broken')),
      getPage: () => Promise.resolve(page(612, 792))
    })
    const properties = await getDocumentProperties(doc, {
      pageNumber: 1,
      rotation: 0,
      locale: 'de'
    })
    expect(properties).toMatchObject({ title: undefined, pageCount: 3, isLinearized: false })
  })
})
