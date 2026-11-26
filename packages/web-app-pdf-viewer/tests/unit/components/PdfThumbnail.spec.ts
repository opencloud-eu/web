import { flushPromises } from '@vue/test-utils'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { defaultPlugins, mount, ocDropStub } from '@opencloud-eu/web-test-helpers'
import PdfThumbnail from '../../../src/components/PdfThumbnail.vue'

function createWrapper({
  isCurrent = false,
  pageNumber = 2,
  numPages = 3,
  isReadOnly = false,
  pageLabel = undefined as string | undefined,
  focusTarget = undefined as string | undefined
} = {}) {
  const wrapper = mount(PdfThumbnail, {
    props: {
      pdfDocument: { numPages } as PDFDocumentProxy,
      pageNumber,
      isCurrent,
      isReadOnly,
      pageLabel,
      focusTarget
    },
    attachTo: document.body,
    global: { plugins: [...defaultPlugins()], stubs: { 'oc-icon': true, 'oc-drop': ocDropStub } }
  })
  return { wrapper }
}

describe('PdfThumbnail', () => {
  it('offers the page actions in a menu, a click on the page only goes to it', async () => {
    const { wrapper } = createWrapper()
    expect(wrapper.find('.pdf-viewer-page-actions').exists()).toBe(true)
    await wrapper.find('button[aria-label="Go to page 2"]').trigger('click')
    expect(wrapper.emitted('select')).toHaveLength(1)
    expect(wrapper.emitted('move')).toBeUndefined()
    expect(wrapper.emitted('delete')).toBeUndefined()
  })

  it('names the page by its label, like the PDF.js viewer', () => {
    const { wrapper } = createWrapper({ pageLabel: 'ii' })
    expect(wrapper.text()).toContain('ii')
    expect(wrapper.find('[aria-label="Go to page ii"]').exists()).toBe(true)
  })

  it('offers no page actions for read-only files', () => {
    const { wrapper } = createWrapper({ isReadOnly: true })
    expect(wrapper.find('.pdf-viewer-page-actions').exists()).toBe(false)
  })

  it.each([
    [1, 'move-page-up', true],
    [3, 'move-page-down', true],
    [2, 'move-page-up', false]
  ])('page %i: %s disabled is %s', (pageNumber, action, disabled) => {
    const { wrapper } = createWrapper({ pageNumber })
    expect(wrapper.find(`.pdf-viewer-${action}`).attributes('disabled') !== undefined).toBe(
      disabled
    )
  })

  // After moving a page, its actions are at hand again, not those of the page now below the
  // pointer.
  it.each([
    [2, 'page-actions', '.pdf-viewer-page-actions'],
    [2, 'page', 'button[aria-current]']
  ])('focuses %s / %s when shown after a page action', async (pageNumber, focusTarget, focused) => {
    const { wrapper } = createWrapper({ pageNumber, focusTarget, isCurrent: true })
    await flushPromises()
    expect(document.activeElement).toBe(wrapper.find(focused).element)
    expect(wrapper.emitted('focused')).toHaveLength(1)
    wrapper.unmount()
  })

  it('does not delete the only page', () => {
    const { wrapper } = createWrapper({ pageNumber: 1, numPages: 1 })
    expect(wrapper.find('.pdf-viewer-delete-page').attributes('disabled')).toBeDefined()
  })

  it('emits the page actions', async () => {
    const { wrapper } = createWrapper()
    await wrapper.find('.pdf-viewer-move-page-up').trigger('click', { detail: 1 })
    // Enter or Space on the button.
    await wrapper.find('.pdf-viewer-delete-page').trigger('click', { detail: 0 })
    expect(wrapper.emitted('move')).toEqual([[1, false]])
    expect(wrapper.emitted('delete')).toEqual([[true]])
  })
})
