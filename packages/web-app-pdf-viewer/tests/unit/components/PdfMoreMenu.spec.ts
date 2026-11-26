import { ref } from 'vue'
// pdf_viewer.mjs takes PDF.js from globalThis.pdfjsLib, which pdfjs-dist sets when imported.
import 'pdfjs-dist'
import { ScrollMode, SpreadMode } from 'pdfjs-dist/web/pdf_viewer.mjs'
import { defaultPlugins, mount, ocDropStub } from '@opencloud-eu/web-test-helpers'
import PdfMoreMenu from '../../../src/components/PdfMoreMenu.vue'

const screen = { isMobile: ref(false) }
vi.mock('@opencloud-eu/design-system/composables', () => ({ useIsMobile: () => screen }))

function createWrapper(
  props: Partial<InstanceType<typeof PdfMoreMenu>['$props']> = {},
  { attachTo }: { attachTo?: HTMLElement } = {}
) {
  return mount(PdfMoreMenu, {
    props: {
      inMenu: { print: false, undo: false, zoom: false },
      scrollMode: ScrollMode.VERTICAL,
      spreadMode: SpreadMode.NONE,
      ...props
    },
    attachTo,
    global: {
      plugins: [...defaultPlugins()],
      stubs: { 'oc-icon': true, 'oc-drop': ocDropStub }
    }
  })
}

const tablet = { print: true, undo: true, zoom: false }
const phone = { print: true, undo: true, zoom: true }

function itemIds(wrapper: ReturnType<typeof createWrapper>) {
  return wrapper
    .findAll('button[class*="pdf-viewer-more-"]')
    .map((button) => button.classes().find((name) => name.startsWith('pdf-viewer-more-')))
}

describe('PdfMoreMenu', () => {
  afterEach(() => {
    screen.isMobile.value = false
  })

  it('offers what the toolbar of wide screens has no room for, like the PDF.js viewer', () => {
    const wrapper = createWrapper({ canAnnotate: true, canPresent: true })
    // No empty groups, e.g. printing is in the toolbar.
    expect(wrapper.findAll('ul').every((list) => list.find('button').exists())).toBe(true)
    expect(itemIds(wrapper)).toEqual([
      'pdf-viewer-more-present',
      'pdf-viewer-more-first-page',
      'pdf-viewer-more-last-page',
      'pdf-viewer-more-rotate-cw',
      'pdf-viewer-more-rotate-ccw',
      'pdf-viewer-more-text-selection',
      'pdf-viewer-more-hand-tool',
      'pdf-viewer-more-properties'
    ])
  })

  it('also offers what the toolbar has no room for', () => {
    const ids = itemIds(createWrapper({ inMenu: tablet, canAnnotate: true, canPresent: true }))
    for (const id of ['print', 'undo', 'redo', 'present', 'hand-tool']) {
      expect(ids).toContain(`pdf-viewer-more-${id}`)
    }
    expect(ids).not.toContain('pdf-viewer-more-zoom-in')
  })

  it('offers no presentation mode and hand tool on phones', () => {
    screen.isMobile.value = true
    const ids = itemIds(createWrapper({ inMenu: phone, canAnnotate: true, canPresent: true }))
    expect(ids).not.toContain('pdf-viewer-more-present')
    expect(ids).not.toContain('pdf-viewer-more-hand-tool')
    expect(ids).toContain('pdf-viewer-more-zoom-in')
  })

  it('offers undo and redo only where the document can be edited', () => {
    expect(createWrapper({ inMenu: tablet }).find('.pdf-viewer-more-undo').exists()).toBe(false)
    const wrapper = createWrapper({ inMenu: tablet, canAnnotate: true, canUndo: true })
    expect(wrapper.find('.pdf-viewer-more-undo').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('.pdf-viewer-more-redo').attributes('disabled')).toBeDefined()
  })

  it.each([
    ['zoom-in', 'zoomIn'],
    ['zoom-out', 'zoomOut']
  ])('emits %s on phones', async (id, event) => {
    const wrapper = createWrapper({ inMenu: phone })
    await wrapper.find(`.pdf-viewer-more-${id}`).trigger('click')
    expect(wrapper.emitted(event)).toEqual([[]])
  })

  it.each([
    ['print', 'print', []],
    ['present', 'present', []],
    ['first-page', 'firstPage', []],
    ['last-page', 'lastPage', []],
    ['rotate-cw', 'rotate', [90]],
    ['rotate-ccw', 'rotate', [-90]],
    ['text-selection', 'setHandTool', [false]],
    ['hand-tool', 'setHandTool', [true]],
    ['properties', 'showProperties', []]
  ])('emits %s', async (id, event, args) => {
    const wrapper = createWrapper({ inMenu: tablet, canPresent: true })
    await wrapper.find(`.pdf-viewer-more-${id}`).trigger('click')
    expect(wrapper.emitted(event)).toEqual([args])
  })

  it('disables what goes nowhere, like the PDF.js viewer', () => {
    const wrapper = createWrapper({
      inMenu: phone,
      canZoomIn: false,
      canZoomOut: false,
      isFirstPage: true,
      isLastPage: true
    })
    for (const id of ['zoom-in', 'zoom-out', 'first-page', 'last-page']) {
      expect(wrapper.find(`.pdf-viewer-more-${id}`).attributes('disabled')).toBeDefined()
    }
  })

  it('disables printing while it is being prepared', () => {
    const wrapper = createWrapper({ inMenu: tablet, isPrinting: true })
    expect(wrapper.find('.pdf-viewer-more-print').attributes('disabled')).toBeDefined()
  })

  // The dialog returns the focus to where it was, the menu item is gone then.
  it('moves the focus to its toggle before showing the document properties', async () => {
    const wrapper = createWrapper({}, { attachTo: document.body })
    await wrapper.find('.pdf-viewer-more-properties').trigger('click')
    expect(document.activeElement).toBe(wrapper.find('.pdf-viewer-more').element)
    wrapper.unmount()
  })

  it('marks the active cursor tool', () => {
    const wrapper = createWrapper({ isHandToolActive: true })
    expect(wrapper.find('.pdf-viewer-more-hand-tool').attributes('aria-current')).toBe('true')
    expect(
      wrapper.find('.pdf-viewer-more-text-selection').attributes('aria-current')
    ).toBeUndefined()
  })

  it('pauses text selection and hand tool while annotating, like the PDF.js viewer', () => {
    const wrapper = createWrapper({ isToolActive: true })
    expect(wrapper.find('.pdf-viewer-more-text-selection').attributes('disabled')).toBeDefined()
    expect(wrapper.find('.pdf-viewer-more-hand-tool').attributes('disabled')).toBeDefined()
  })

  it('offers the scroll and spread modes of the PDF.js viewer, the current ones marked', async () => {
    const wrapper = createWrapper({ spreadMode: SpreadMode.ODD })
    const scroll = wrapper.findAll('.pdf-viewer-scroll-option')
    const spread = wrapper.findAll('.pdf-viewer-spread-option')
    expect(scroll.map((option) => option.text())).toEqual([
      'Page scrolling',
      'Vertical scrolling',
      'Horizontal scrolling',
      'Wrapped scrolling'
    ])
    expect(spread.map((option) => option.text())).toEqual([
      'No spreads',
      'Odd spreads',
      'Even spreads'
    ])
    expect(
      wrapper.findAll('[data-mode][aria-current]').map((option) => option.attributes('data-mode'))
    ).toEqual([`${ScrollMode.VERTICAL}`, `${SpreadMode.ODD}`])
    expect(wrapper.find('[aria-label="Scrolling"]').exists()).toBe(true)
    await wrapper
      .find(`.pdf-viewer-scroll-option[data-mode="${ScrollMode.WRAPPED}"]`)
      .trigger('click')
    await wrapper.find(`.pdf-viewer-spread-option[data-mode="${SpreadMode.NONE}"]`).trigger('click')
    expect(wrapper.emitted('setScrollMode')).toEqual([[ScrollMode.WRAPPED]])
    expect(wrapper.emitted('setSpreadMode')).toEqual([[SpreadMode.NONE]])
  })
})
