import { ref, shallowRef } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mock } from 'vitest-mock-extended'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { PDFLinkService } from 'pdfjs-dist/web/pdf_viewer.mjs'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { usePdfOutline, type OutlineItem } from '../../../src/composables/usePdfOutline'

function item(title: string, pageIndex: number, items: OutlineItem[] = [], count?: number) {
  return { title, dest: [pageIndex], items, count } as OutlineItem
}

async function setup(pageNumber: number) {
  const contributions = item('Contributions', 1)
  const example = item('Example program', 1)
  const outline = [
    item('Introduction', 0, [contributions], -1),
    item('Overview', 1, [example]),
    item('Evaluation', 9),
    item('Out of range', 99)
  ]
  const pdfDocument = shallowRef(
    mock<PDFDocumentProxy>({ numPages: 14, getOutline: vi.fn().mockResolvedValue(outline) })
  )
  const page = ref(pageNumber)
  const linkService = mock<PDFLinkService>()
  const openAttachment = vi.fn()
  let result: ReturnType<typeof usePdfOutline>
  getComposableWrapper(() => {
    result = usePdfOutline({
      pdfDocument,
      pageNumber: () => page.value,
      linkService,
      openAttachment
    })
  })
  await flushPromises()
  return {
    ...result,
    pdfDocument,
    page,
    contributions,
    example,
    items: outline,
    linkService,
    openAttachment
  }
}

describe('usePdfOutline', () => {
  it('knows the pages of the entries, only of those that exist', async () => {
    const { getPageNumber, items } = await setup(1)
    expect(getPageNumber(items[2])).toBe(10)
    expect(getPageNumber(items[3])).toBeUndefined()
  })

  it('takes the last entry before the current page as current section', async () => {
    const { isCurrent, example, page, items } = await setup(2)
    expect(isCurrent(example)).toBe(true)
    page.value = 12
    expect(isCurrent(items[2])).toBe(true)
  })

  // Several entries start on page 2.
  it('keeps the clicked entry current on its page', async () => {
    const { isCurrent, open, contributions, example, page } = await setup(2)
    open(contributions)
    expect(isCurrent(contributions)).toBe(true)
    expect(isCurrent(example)).toBe(false)
    page.value = 3
    expect(isCurrent(example)).toBe(true)
  })

  it('expands entries unless the PDF marks them as closed, toggles them', async () => {
    const { isExpanded, toggle, items } = await setup(1)
    expect(isExpanded(items[0])).toBe(false)
    expect(isExpanded(items[1])).toBe(true)
    toggle(items[0])
    expect(isExpanded(items[0])).toBe(true)
  })

  // Like Shift+click on a toggle in the PDF.js viewer.
  it('toggles the entries below along with an entry', async () => {
    const outer = item('Part', 0, [item('Chapter', 0, [item('Section', 0)], -1)])
    const { isExpanded, toggle, pdfDocument } = await setup(1)
    pdfDocument.value = mock<PDFDocumentProxy>({
      numPages: 14,
      getOutline: vi.fn().mockResolvedValue([outer])
    })
    await flushPromises()
    const [chapter] = outer.items
    toggle(outer, true)
    expect(isExpanded(outer)).toBe(false)
    toggle(outer, true)
    expect(isExpanded(outer)).toBe(true)
    expect(isExpanded(chapter)).toBe(true)
  })

  it('forgets the clicked entry with another document', async () => {
    const { isCurrent, open, contributions, example, pdfDocument, items } = await setup(2)
    open(contributions)
    pdfDocument.value = mock<PDFDocumentProxy>({
      numPages: 14,
      getOutline: vi.fn().mockResolvedValue(items)
    })
    await flushPromises()
    expect(isCurrent(contributions)).toBe(false)
    expect(isCurrent(example)).toBe(true)
  })

  it('opens entries like the PDF.js viewer', async () => {
    const { open, linkService, openAttachment } = await setup(1)
    function entry(extra: Partial<OutlineItem>) {
      return { title: '', items: [], ...extra } as OutlineItem
    }
    open(entry({ dest: [3] }))
    open(entry({ action: 'NextPage' }))
    open(entry({ attachmentId: 'a', attachment: { filename: 'invoice.xml' } }))
    open(entry({ setOCGState: { state: [] } }))
    expect(linkService.goToDestination).toHaveBeenCalledWith([3])
    expect(linkService.executeNamedAction).toHaveBeenCalledWith('NextPage')
    expect(openAttachment).toHaveBeenCalledWith({ id: 'a', filename: 'invoice.xml' })
    expect(linkService.executeSetOCGState).toHaveBeenCalledWith({ state: [] })
  })

  it('has no outline for a broken one instead of loading forever', async () => {
    const { outline, pdfDocument } = await setup(1)
    pdfDocument.value = mock<PDFDocumentProxy>({
      getOutline: vi.fn().mockRejectedValue(new Error('Broken'))
    })
    await flushPromises()
    expect(outline.value).toEqual([])
  })
})
