import { flushPromises } from '@vue/test-utils'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
// pdf_viewer.mjs takes PDF.js from globalThis.pdfjsLib, which pdfjs-dist sets when imported.
import 'pdfjs-dist'
import { EventBus } from 'pdfjs-dist/web/pdf_viewer.mjs'
import PdfCommentPopup from '../../../src/components/PdfCommentPopup.vue'
import type { CommentPopup } from '../../../src/composables/usePdfComments'
import { pdfEventBusKey } from '../../../src/composables/usePdfViewer'

vi.mock('pdfjs-dist', async (importOriginal) => ({
  ...(await importOriginal<typeof import('pdfjs-dist')>()),
  renderRichText: ({ html }: { html: string }, element: HTMLElement) => {
    element.textContent = html
  }
}))

function createWrapper({ isSelected = true, isEditable = true } = {}) {
  const parent = document.createElement('div')
  parent.className = 'page'
  const button = document.createElement('button')
  parent.append(button)
  document.body.append(parent)
  const popup = {
    target: {
      comment: 'Hi',
      elementBeforePopup: button,
      commentPopupPosition: [0.9, 0.2],
      commentButtonWidth: 0.02,
      parentBoundingClientRect: new DOMRect(0, 0, 1000, 1000),
      getData: vi.fn(),
      hasDefaultPopupPosition: () => true,
      setCommentButtonStates: vi.fn(),
      editComment: vi.fn(),
      focusCommentButton: vi.fn()
    },
    data: {
      id: 'a',
      pageIndex: 0,
      rect: [],
      color: [255, 0, 0],
      contentsObj: { str: 'Hi there' },
      modificationDate: 'D:20260101'
    },
    isSelected,
    isEditable
  } as unknown as CommentPopup
  const eventBus = new EventBus()
  const wrapper = mount(PdfCommentPopup, {
    props: { popup },
    global: {
      plugins: [...defaultPlugins()],
      provide: { [pdfEventBusKey]: eventBus },
      stubs: { 'oc-icon': true }
    },
    attachTo: document.body
  })
  return { wrapper, parent, button, eventBus }
}

describe('PdfCommentPopup', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('shows date and text next to the comment button', async () => {
    const { parent } = createWrapper()
    await flushPromises()
    const popup = parent.querySelector('.pdf-viewer-comment-popup') as HTMLElement
    expect(popup.textContent).toMatch(/Jan 1, 2026, \d{1,2}:\d{2}/)
    expect(popup.textContent).toContain('Hi there')
    // Moved left of the button, there is no room on the right of the page.
    expect(parseFloat(popup.style.left)).toBeLessThan(90)
    expect(
      (popup.querySelector('[style*="background-color"]') as HTMLElement).style.backgroundColor
    ).toBe('rgb(255, 0, 0)')
  })

  it.each([
    [true, true, true],
    [false, true, false],
    [true, false, false]
  ])('offers edit and delete (selected: %s, editable: %s)', (isSelected, isEditable, shown) => {
    const { parent } = createWrapper({ isSelected, isEditable })
    expect(!!parent.querySelector('.pdf-viewer-comment-edit')).toBe(shown)
    expect(!!parent.querySelector('.pdf-viewer-comment-delete')).toBe(shown)
  })

  it.each([
    [true, 1],
    [false, 0]
  ])(
    'closes on clicks elsewhere if opened by clicking (selected: %s)',
    async (isSelected, count) => {
      const { wrapper } = createWrapper({ isSelected })
      await flushPromises()
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
      document.body.dispatchEvent(new PointerEvent('click', { bubbles: true }))
      expect(wrapper.emitted('dismiss') ?? []).toHaveLength(count)
    }
  )

  // PDF.js removes everything but its own layers from a page it resets, e.g. when zooming,
  // and all of the page when it is far away from the visible ones.
  it.each([
    ['the popup', (parent: HTMLElement) => parent.querySelector('.pdf-viewer-comment-popup')],
    ['the comment button', (parent: HTMLElement) => parent.querySelector('button')],
    ['nothing', (): HTMLElement => null]
  ])('goes away once PDF.js removed %s from the page', async (_, getRemoved) => {
    const { wrapper, parent, eventBus } = createWrapper()
    await flushPromises()
    const removed = getRemoved(parent)
    removed?.remove()
    eventBus.dispatch('updateviewarea', { source: null })
    expect(wrapper.emitted('dismiss') ?? []).toHaveLength(removed ? 1 : 0)
  })

  it('emits edit, delete and close', async () => {
    const { wrapper, parent } = createWrapper()
    ;(parent.querySelector('.pdf-viewer-comment-edit') as HTMLElement).click()
    ;(parent.querySelector('.pdf-viewer-comment-delete') as HTMLElement).click()
    parent
      .querySelector('.pdf-viewer-comment-popup')
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(wrapper.emitted('edit')).toHaveLength(1)
    expect(wrapper.emitted('delete')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
