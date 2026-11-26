import { flushPromises } from '@vue/test-utils'
import { mock } from 'vitest-mock-extended'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { PDFLinkService } from 'pdfjs-dist/web/pdf_viewer.mjs'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import PdfOutline from '../../../src/components/PdfOutline.vue'
import {
  pdfOutlineKey,
  usePdfOutline,
  type OutlineItem
} from '../../../src/composables/usePdfOutline'

function item(title: string, extra: Partial<OutlineItem> = {}): OutlineItem {
  return {
    title,
    dest: [0],
    url: null,
    bold: false,
    italic: false,
    items: [],
    count: undefined,
    ...extra
  } as OutlineItem
}

async function createWrapper(items: OutlineItem[], pageNumber = 1) {
  const pdfDocument = mock<PDFDocumentProxy>({
    numPages: 10,
    getOutline: vi.fn().mockResolvedValue(items)
  })
  const linkService = mock<PDFLinkService>()
  const outline = usePdfOutline({ pdfDocument, pageNumber, linkService, openAttachment: vi.fn() })
  await flushPromises()
  const wrapper = mount(PdfOutline, {
    props: { items },
    global: {
      plugins: [...defaultPlugins()],
      stubs: { 'oc-icon': true },
      provide: { [pdfOutlineKey as symbol]: outline }
    }
  })
  return Object.assign(wrapper, { linkService })
}

function titles(wrapper: Awaited<ReturnType<typeof createWrapper>>) {
  return wrapper.findAll('.pdf-viewer-outline-item').map((e) => e.text())
}

describe('PdfOutline', () => {
  it('opens and closes entries like the PDF says, and lets users toggle them', async () => {
    const wrapper = await createWrapper([
      item('Open chapter', { count: 1, items: [item('Open section')] }),
      item('Closed chapter', { count: -1, items: [item('Hidden section')] })
    ])
    expect(titles(wrapper)).toEqual(['Open chapter', 'Open section', 'Closed chapter'])
    await wrapper.findAll('.pdf-viewer-outline-toggle')[1].trigger('click')
    expect(titles(wrapper)).toContain('Hidden section')
    await wrapper.findAll('.pdf-viewer-outline-toggle')[0].trigger('click')
    expect(titles(wrapper)).not.toContain('Open section')
  })

  // Like in the PDF.js viewer.
  it('keeps nested entries expanded while their parent is collapsed', async () => {
    const wrapper = await createWrapper([
      item('Chapter', { items: [item('Section', { count: -1, items: [item('Paragraph')] })] })
    ])
    const toggles = () => wrapper.findAll('.pdf-viewer-outline-toggle')
    await toggles()[1].trigger('click')
    await toggles()[0].trigger('click')
    await toggles()[0].trigger('click')
    expect(titles(wrapper)).toContain('Paragraph')
  })

  it('opens entries, also nested ones', async () => {
    const section = item('Section', { dest: [2] })
    const wrapper = await createWrapper([item('Chapter', { items: [section] })])
    await wrapper.findAll('.pdf-viewer-outline-item')[1].trigger('click')
    expect(wrapper.linkService.goToDestination).toHaveBeenCalledWith([2])
  })

  it('opens web links in a new tab', async () => {
    const wrapper = await createWrapper([
      item('Website', { url: 'https://example.com', dest: null, bold: true })
    ])
    const link = wrapper.find('a.pdf-viewer-outline-item')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toContain('noopener')
    expect(link.classes()).toContain('font-semibold')
  })

  it('opens email links without a new tab, which would stay empty', async () => {
    const wrapper = await createWrapper([
      item('Contact', { url: 'mailto:alice@example.com', dest: null })
    ])
    const link = wrapper.find('a.pdf-viewer-outline-item')
    expect(link.attributes('href')).toBe('mailto:alice@example.com')
    expect(link.attributes('target')).toBeUndefined()
  })

  // Like in the PDF.js viewer.
  it('shows a dash for empty titles and drops invisible characters', async () => {
    const wrapper = await createWrapper([item('  '), item('Null\x00 char')])
    expect(titles(wrapper)).toEqual(['–', 'Null char'])
  })

  it('marks the collapsed entry the current section is hidden in', async () => {
    const wrapper = await createWrapper(
      [item('Chapter', { count: -1, items: [item('Section', { dest: [4] })] })],
      5
    )
    expect(wrapper.find('.pdf-viewer-outline-item').attributes('aria-current')).toBe('location')
  })
})
