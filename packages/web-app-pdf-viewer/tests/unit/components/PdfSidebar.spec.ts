import { computed, nextTick, ref, shallowRef, unref, type Ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mock } from 'vitest-mock-extended'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { PDFLinkService } from 'pdfjs-dist/web/pdf_viewer.mjs'
import { defaultPlugins, ocDropStub, shallowMount } from '@opencloud-eu/web-test-helpers'
import PdfSidebar from '../../../src/components/PdfSidebar.vue'
import type { SidebarView } from '../../../src/composables/usePdfInitialView'
import type { PdfAttachment } from '../../../src/composables/usePdfAttachments'
import { pdfOutlineKey, usePdfOutline } from '../../../src/composables/usePdfOutline'
import { pdfLayersKey, type PdfLayerItem } from '../../../src/composables/usePdfLayers'
import type { PageAction } from '../../../src/composables/usePdfPageOperations'

// happy-dom has no layout, so the virtual list gets all pages.
vi.mock('@vueuse/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@vueuse/core')>()),
  useVirtualList: (source: Ref<number[]>) => ({
    list: computed(() => unref(source).map((data, index) => ({ data, index }))),
    containerProps: { ref: ref<HTMLElement>() },
    wrapperProps: computed(() => ({}))
  })
}))

function createWrapper(
  pageNumber = 2,
  {
    outline = [] as unknown[],
    attachments = undefined as PdfAttachment[] | undefined,
    layers = [] as PdfLayerItem[] | undefined,
    view = undefined as SidebarView | undefined,
    lastAction = undefined as PageAction | undefined
  } = {}
) {
  const pdfDocument = mock<PDFDocumentProxy>({
    numPages: 30,
    getOutline: vi.fn().mockResolvedValue(outline),
    getDestination: vi.fn().mockResolvedValue(null)
  })
  return shallowMount(PdfSidebar, {
    props: { pdfDocument, pageNumber, attachments, view, lastAction },
    global: {
      plugins: [...defaultPlugins()],
      provide: {
        [pdfOutlineKey as symbol]: usePdfOutline({
          pdfDocument,
          pageNumber,
          linkService: mock<PDFLinkService>(),
          openAttachment: vi.fn()
        }),
        [pdfLayersKey as symbol]: { layers: shallowRef(layers), setVisible: vi.fn() }
      },
      // The views menu is in a drop.
      stubs: {
        'oc-icon': true,
        'oc-drop': ocDropStub,
        'oc-list': { template: '<ul><slot /></ul>' }
      }
    }
  })
}

describe('PdfSidebar', () => {
  describe('views', () => {
    function viewItem(wrapper: ReturnType<typeof createWrapper>, id: string) {
      return wrapper
        .findAllComponents({ name: 'PdfMenuItem' })
        .find((item) => item.classes().includes(`pdf-viewer-sidebar-view-${id}`))
    }

    // Like in the PDF.js viewer.
    it('are disabled without content', async () => {
      const wrapper = createWrapper()
      await flushPromises()
      expect(viewItem(wrapper, 'pages').attributes('disabled')).toBe('false')
      expect(viewItem(wrapper, 'outline').attributes('disabled')).toBe('true')
      expect(viewItem(wrapper, 'attachments').attributes('disabled')).toBe('true')
      expect(viewItem(wrapper, 'layers').attributes('disabled')).toBe('true')
    })

    it('show the layers', async () => {
      const layers = [{ id: '5R', name: 'Background', isVisible: true }]
      const wrapper = createWrapper(2, { layers })
      await flushPromises()
      viewItem(wrapper, 'layers').vm.$emit('click')
      await nextTick()
      expect(wrapper.findComponent({ name: 'PdfLayers' }).props('items')).toEqual(layers)
    })

    it('show the outline', async () => {
      const outline = [{ title: 'Chapter', dest: 'chapter', items: [] as unknown[] }]
      const wrapper = createWrapper(2, { outline })
      await flushPromises()
      viewItem(wrapper, 'outline').vm.$emit('click')
      await nextTick()
      const outlineView = wrapper.findComponent({ name: 'PdfOutline' })
      expect(outlineView.props('items')).toEqual(outline)
    })

    it('show the attachments and open them, back to the pages once there are none', async () => {
      const attachment = { key: 'a', id: 'a', filename: 'invoice.xml' }
      const wrapper = createWrapper(2, { attachments: [attachment] })
      await flushPromises()
      viewItem(wrapper, 'attachments').vm.$emit('click')
      await nextTick()
      const attachmentsView = wrapper.findComponent({ name: 'PdfAttachments' })
      attachmentsView.vm.$emit('open', attachment)
      expect(wrapper.emitted('openAttachment')).toEqual([[attachment]])
      await wrapper.setProps({ attachments: [] })
      expect(wrapper.findComponent({ name: 'PdfAttachments' }).exists()).toBe(false)
      expect(wrapper.emitted('update:view').at(-1)).toEqual(['pages'])
    })

    // E.g. after undo, which loads the document again, or when opening a file.
    it('stay while their content is loading', async () => {
      const wrapper = createWrapper(2, { attachments: undefined, view: 'attachments' })
      await flushPromises()
      expect(wrapper.emitted('update:view')).toBeUndefined()
    })
  })

  it('shows a thumbnail per page and marks the current one', () => {
    const thumbnails = createWrapper().findAllComponents({ name: 'PdfThumbnail' })
    expect(thumbnails).toHaveLength(30)
    expect(thumbnails.slice(0, 3).map((t) => t.props('isCurrent'))).toEqual([false, true, false])
  })

  it('relays page actions of the thumbnails', () => {
    const wrapper = createWrapper()
    const thumbnail = wrapper.findAllComponents({ name: 'PdfThumbnail' })[2]
    thumbnail.vm.$emit('delete', false)
    thumbnail.vm.$emit('move', 2, true)
    thumbnail.vm.$emit('select')
    expect(wrapper.emitted('deletePage')).toEqual([[3, false]])
    expect(wrapper.emitted('movePage')).toEqual([[3, 2, true]])
    expect(wrapper.emitted('goToPage')).toEqual([[3]])
  })

  // The thumbnail of a page further down mounts only once scrolled to, after the action is done.
  it('keeps what to focus after a page action until the thumbnail took it', async () => {
    const lastAction = { pageNumber: 12, focusTarget: 'page-actions' }
    const wrapper = createWrapper(2, { lastAction })
    await wrapper.setProps({ lastAction: undefined })
    const thumbnail = wrapper.findAllComponents({ name: 'PdfThumbnail' })[11]
    expect(thumbnail.props('focusTarget')).toBe('page-actions')
    thumbnail.vm.$emit('focused')
    await nextTick()
    expect(thumbnail.props('focusTarget')).toBeUndefined()
  })
})
