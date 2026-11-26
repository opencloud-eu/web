import { shallowRef } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mock } from 'vitest-mock-extended'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { EventBus, PDFViewer } from 'pdfjs-dist/web/pdf_viewer.mjs'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { usePdfPageLabels } from '../../../src/composables/usePdfPageLabels'

async function setup(labels: string[] | null | Error) {
  const listeners: Record<string, () => void> = {}
  const eventBus = mock<EventBus>({
    on: (name: string, listener: () => void) => (listeners[name] = listener)
  })
  const pdfDocument = mock<PDFDocumentProxy>()
  if (labels instanceof Error) {
    pdfDocument.getPageLabels.mockRejectedValue(labels)
  } else {
    pdfDocument.getPageLabels.mockResolvedValue(labels)
  }
  const viewer = mock<PDFViewer>()
  Object.defineProperty(viewer, 'pdfDocument', { value: pdfDocument })
  let pageLabels: ReturnType<typeof usePdfPageLabels>['pageLabels']
  getComposableWrapper(() => {
    ;({ pageLabels } = usePdfPageLabels({ viewer: shallowRef(viewer), eventBus }))
  })
  listeners.pagesinit()
  await flushPromises()
  return { pageLabels, viewer }
}

describe('usePdfPageLabels', () => {
  it('gives the pages their labels, e.g. of a preface', async () => {
    const labels = ['i', 'ii', '1', '2']
    const { pageLabels, viewer } = await setup(labels)
    expect(pageLabels.value).toEqual(labels)
    expect(viewer.setPageLabels).toHaveBeenCalledWith(labels)
  })

  it.each([
    ['none', null],
    ['plain numbers', ['1', '2', '3']],
    ['empty labels', ['', '', '']]
  ])('ignores %s, like the PDF.js viewer', async (_, labels) => {
    const { pageLabels, viewer } = await setup(labels)
    expect(pageLabels.value).toBeUndefined()
    expect(viewer.setPageLabels).not.toHaveBeenCalled()
  })

  it('keeps the page numbers for broken labels', async () => {
    const { pageLabels, viewer } = await setup(new Error('Broken'))
    expect(pageLabels.value).toBeUndefined()
    expect(viewer.setPageLabels).not.toHaveBeenCalled()
  })
})
