import { PDFDateString, type PDFDocumentProxy, type PDFPageProxy } from 'pdfjs-dist'

// Like the PDF.js viewer (PDFDocumentProperties): inches for these locales, millimeters else.
const NON_METRIC_LOCALES = ['en-us', 'en-lr', 'my']
const US_PAGE_NAMES: Record<string, string> = { '8.5x11': 'Letter', '8.5x14': 'Legal' }
const METRIC_PAGE_NAMES: Record<string, string> = { '297x420': 'A3', '210x297': 'A4' }

export type PageSize = {
  width: number
  height: number
  unit: 'in' | 'mm'
  isPortrait: boolean
  /** E.g. A4, if it's a standard size. */
  name?: string
}

export type DocumentProperties = {
  title?: string
  author?: string
  subject?: string
  keywords?: string
  creationDate?: Date
  modificationDate?: Date
  creator?: string
  producer?: string
  version?: string
  pageCount: number
  pageSize?: PageSize
  isLinearized: boolean
}

type DocumentInfo = {
  Title?: string
  Author?: string
  Subject?: string
  Keywords?: string
  CreationDate?: string
  ModDate?: string
  Creator?: string
  Producer?: string
  PDFFormatVersion?: string
  IsLinearized?: boolean
}

type Size = { width: number; height: number }

function getPageName(size: Size, isPortrait: boolean, names: Record<string, string>) {
  const [width, height] = isPortrait ? [size.width, size.height] : [size.height, size.width]
  return names[`${width}x${height}`]
}

/**
 * The size of a page as the PDF.js viewer shows it, turned by the rotation of the view. Like
 * the PDF.js viewer, the unit depends on the browser's locale (e.g. navigator.language).
 */
export function getPageSize(page: PDFPageProxy, rotation: number, locale: string): PageSize {
  const [x1, y1, x2, y2] = page.view
  const isTurned = (page.rotate + rotation) % 180 !== 0
  const width = ((x2 - x1) / 72) * page.userUnit
  const height = ((y2 - y1) / 72) * page.userUnit
  const inches = isTurned ? { width: height, height: width } : { width, height }
  const isPortrait = inches.width <= inches.height
  let sizeInches = {
    width: Math.round(inches.width * 100) / 100,
    height: Math.round(inches.height * 100) / 100
  }
  let sizeMillimeters = {
    width: Math.round(inches.width * 25.4 * 10) / 10,
    height: Math.round(inches.height * 25.4 * 10) / 10
  }
  let name =
    getPageName(sizeInches, isPortrait, US_PAGE_NAMES) ||
    getPageName(sizeMillimeters, isPortrait, METRIC_PAGE_NAMES)
  // A4 and others in points are often a fraction of a millimeter off. Like the PDF.js viewer,
  // the standard size counts then, also for the inches.
  if (
    !name &&
    !(Number.isInteger(sizeMillimeters.width) && Number.isInteger(sizeMillimeters.height))
  ) {
    const rounded = {
      width: Math.round(sizeMillimeters.width),
      height: Math.round(sizeMillimeters.height)
    }
    const isClose =
      Math.abs(inches.width * 25.4 - rounded.width) < 0.1 &&
      Math.abs(inches.height * 25.4 - rounded.height) < 0.1
    name = isClose ? getPageName(rounded, isPortrait, METRIC_PAGE_NAMES) : undefined
    if (name) {
      sizeInches = {
        width: Math.round((rounded.width / 25.4) * 100) / 100,
        height: Math.round((rounded.height / 25.4) * 100) / 100
      }
      sizeMillimeters = rounded
    }
  }
  if (NON_METRIC_LOCALES.includes(locale.toLowerCase())) {
    return { ...sizeInches, unit: 'in', isPortrait, name }
  }
  return { ...sizeMillimeters, unit: 'mm', isPortrait, name }
}

function parseDate(metadataDate: string | undefined, infoDate: string | undefined) {
  const time = metadataDate ? Date.parse(metadataDate) : NaN
  return Number.isNaN(time) ? (PDFDateString.toDateObject(infoDate) ?? undefined) : new Date(time)
}

/** The properties of the document, like the PDF.js viewer reads them: XMP first, then /Info. */
export async function getDocumentProperties(
  doc: PDFDocumentProxy,
  { pageNumber, rotation, locale }: { pageNumber: number; rotation: number; locale: string }
): Promise<DocumentProperties> {
  // Broken metadata in the file: the properties from the document itself only.
  const { info, metadata } = (await doc
    .getMetadata()
    .catch(() => ({ info: {}, metadata: null as null }))) as {
    info: DocumentInfo
    metadata: { get(name: string): string | string[] | undefined } | null
  }
  function fromXmp(name: string) {
    const value = metadata?.get(name)
    return Array.isArray(value) ? value.join('\n') : value
  }
  function text(xmpName: string, infoName: keyof Omit<DocumentInfo, 'IsLinearized'>) {
    return fromXmp(xmpName) || info[infoName] || undefined
  }
  const pageSize = await doc
    .getPage(pageNumber)
    .then((page) => getPageSize(page, rotation, locale))
    .catch((): undefined => undefined)
  return {
    title: text('dc:title', 'Title'),
    author: text('dc:creator', 'Author'),
    subject: text('dc:subject', 'Subject'),
    keywords: text('pdf:keywords', 'Keywords'),
    creationDate: parseDate(fromXmp('xmp:createdate'), info.CreationDate),
    modificationDate: parseDate(fromXmp('xmp:modifydate'), info.ModDate),
    creator: text('xmp:creatortool', 'Creator'),
    producer: text('pdf:producer', 'Producer'),
    version: info.PDFFormatVersion,
    pageCount: doc.numPages,
    pageSize,
    isLinearized: !!info.IsLinearized
  }
}
