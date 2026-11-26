import { ref, shallowRef, unref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mock } from 'vitest-mock-extended'
import type { Resource } from '@opencloud-eu/web-client'
import { useAppNavigation, type FileContext } from '@opencloud-eu/web-pkg'
import type { AnnotationEditorUIManager, PDFDocumentProxy } from 'pdfjs-dist'
import type { EventBus } from 'pdfjs-dist/web/pdf_viewer.mjs'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import PdfViewer from '../../../src/components/PdfViewer.vue'
import { usePdfChangeTracking } from '../../../src/composables/usePdfChangeTracking'
import { usePdfDocument } from '../../../src/composables/usePdfDocument'
import { usePdfCloudImagePicker } from '../../../src/composables/usePdfCloudImagePicker'

const { createEditor, handleEscape, openPicker, closeApp, eventBusListeners, selectPageNumber } =
  vi.hoisted(() => ({
    handleEscape: vi.fn(),
    createEditor: vi.fn(),
    openPicker: vi.fn(),
    closeApp: vi.fn(),
    eventBusListeners: new Map<string, ((event: object) => void)[]>(),
    selectPageNumber: vi.fn()
  }))

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@opencloud-eu/web-pkg')>()),
  useAppNavigation: vi.fn(() => ({ closeApp }))
}))

vi.mock('pdfjs-dist/web/pdf_viewer.mjs', () => ({
  ScrollMode: { VERTICAL: 0, HORIZONTAL: 1, WRAPPED: 2, PAGE: 3 },
  SpreadMode: { NONE: 0, ODD: 1, EVEN: 2 },
  FindState: { FOUND: 0, NOT_FOUND: 1 }
}))
vi.mock('pdfjs-dist', () => ({
  AnnotationEditorType: { NONE: 0, STAMP: 13, POPUP: 16, SIGNATURE: 101 },
  AnnotationType: { TEXT: 1 },
  TouchManager: vi.fn(),
  SupportedImageMimeTypes: new Set(['image/png']),
  version: '0.0.0'
}))
vi.mock('pdfjs-dist/web/pdf_viewer.css', () => ({}))
vi.mock('../../../src/composables/usePdfViewer', () => ({
  pdfEventBusKey: Symbol('pdfEventBus'),
  usePdfViewer: () => ({
    eventBus: mock<EventBus>({
      on: (name: string, listener: (event: object) => void) => {
        eventBusListeners.set(name, [...(eventBusListeners.get(name) || []), listener])
      }
    }),
    linkService: {},
    editing: {
      uiManager: shallowRef(mock<AnnotationEditorUIManager>()),
      commitEditing: vi.fn(),
      isDrawing: () => false,
      hasUnfinishedEdits: () => false,
      finishDrawings: vi.fn(),
      editorMode: ref(0),
      isToolActive: ref(false),
      editingStates: ref({}),
      createEditor,
      handleEscape
    },
    pagesCount: ref(1),
    pageNumber: ref(1),
    scaleValue: ref('auto'),
    setDocument: vi.fn()
  })
}))
vi.mock('../../../src/composables/usePdfDocument', () => ({
  usePdfDocument: vi.fn()
}))
vi.mock('../../../src/composables/usePdfChangeTracking', () => ({
  usePdfChangeTracking: vi.fn()
}))
vi.mock('../../../src/composables/usePdfCloudImagePicker', () => ({
  usePdfCloudImagePicker: vi.fn(() => ({ openPicker })),
  useCanPickImageFromCloud: () => ({ value: true })
}))
vi.mock('../../../src/composables/usePdfPrint', () => ({
  usePdfPrint: () => ({ isPrinting: ref(false), print: vi.fn() })
}))

let mounted: ReturnType<typeof shallowMount> | undefined

function createWrapper({ isReadOnly = false }: { isReadOnly?: boolean } = {}) {
  const load = vi.fn()
  const scheduleCheck = vi.fn()
  const flushContent = vi.fn()
  const afterSave = vi.fn()
  vi.mocked(usePdfDocument).mockReturnValue({
    pdfDocument: shallowRef(
      mock<PDFDocumentProxy>({
        isPureXfa: false,
        getOutline: vi.fn().mockResolvedValue(null),
        getAttachments: vi.fn().mockResolvedValue(null)
      })
    ),
    isLoading: ref(false),
    loadError: ref<Error>(),
    documentKey: ref(1),
    load
  })
  vi.mocked(usePdfChangeTracking).mockReturnValue({
    scheduleCheck,
    flush: vi.fn(),
    reset: vi.fn(),
    flushContent,
    afterSave
  })

  const currentContent = new ArrayBuffer(1)
  const currentFileContext = mock<FileContext>()
  mounted = shallowMount(PdfViewer, {
    props: {
      resource: mock<Resource>({ etag: '1' }),
      currentContent,
      isReadOnly,
      isDirty: false,
      currentFileContext
    },
    global: {
      plugins: [...defaultPlugins()],
      stubs: {
        PdfToolbar: {
          name: 'PdfToolbar',
          template: '<div />',
          setup(_, { expose }) {
            expose({ selectPageNumber, focusFindToggle: vi.fn(), findToggleElement: undefined })
          }
        }
      }
    },
    attachTo: document.body
  })
  return {
    wrapper: mounted,
    load,
    flushContent,
    afterSave,
    scheduleCheck,
    currentContent,
    currentFileContext
  }
}

describe('PdfViewer', () => {
  afterEach(() => {
    mounted?.unmount()
    eventBusListeners.clear()
  })

  it('loads the current content on mount', async () => {
    const { load, currentContent } = createWrapper()
    await flushPromises()
    expect(load).toHaveBeenCalledWith(currentContent)
  })

  it('closes the app when the password prompt is cancelled', () => {
    const { currentFileContext } = createWrapper()
    expect(unref(vi.mocked(useAppNavigation).mock.lastCall[0].currentFileContext)).toBe(
      currentFileContext
    )
    const { pdfDocument } = vi.mocked(usePdfDocument).mock.results[0].value
    const { onPasswordCancelled } = vi.mocked(usePdfDocument).mock.lastCall[0]
    // Not for a prompt of a document rebuilt from the unlocked one, that one stays.
    onPasswordCancelled()
    expect(closeApp).not.toHaveBeenCalled()
    pdfDocument.value = undefined
    onPasswordCancelled()
    expect(closeApp).toHaveBeenCalled()
  })

  it('reports written changes as the content and registers for the saves of AppWrapper', () => {
    const { wrapper, flushContent, afterSave } = createWrapper()
    expect(wrapper.emitted('register:onFlushContentCallback')).toEqual([[flushContent]])
    expect(wrapper.emitted('register:onSaveCallback')).toEqual([[afterSave]])
    const content = new ArrayBuffer(2)
    vi.mocked(usePdfChangeTracking).mock.lastCall[0].onChange(content)
    expect(wrapper.emitted('update:currentContent')).toEqual([[content]])
  })

  it('hands Escape over to the editing', async () => {
    const { wrapper } = createWrapper()
    // The listener is added once the root element is there.
    await flushPromises()
    await wrapper.find('.pdf-viewer-viewer-container').trigger('keydown', { key: 'Escape' })
    expect(handleEscape).toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }))
  })

  // Like Ctrl+Alt+G and the PDF.js viewer.
  it('selects the page number for the "Go to page" buttons of forms', () => {
    createWrapper()
    for (const listener of eventBusListeners.get('namedaction')) {
      listener({ source: null, action: 'GoToPage' })
    }
    expect(selectPageNumber).toHaveBeenCalledTimes(1)
  })

  it('places images picked from the cloud as a new image annotation', async () => {
    createWrapper()
    const { onImage } = vi.mocked(usePdfCloudImagePicker).mock.calls.at(-1)[0]
    const file = new File(['x'], 'cat.png', { type: 'image/png' })
    await onImage(file)
    expect(createEditor).toHaveBeenCalledWith(13, { bitmapFile: file })
  })

  it('adds images from the device, PDF.js asks for the file', () => {
    const { wrapper } = createWrapper()
    wrapper.findComponent({ name: 'PdfToolbar' }).vm.$emit('addImage', 'device')
    expect(createEditor).toHaveBeenCalledWith(13)
    expect(openPicker).not.toHaveBeenCalled()
  })

  it('adds images from the cloud with the file picker', () => {
    const { wrapper } = createWrapper()
    wrapper.findComponent({ name: 'PdfToolbar' }).vm.$emit('addImage', 'cloud')
    expect(openPicker).toHaveBeenCalled()
    expect(createEditor).not.toHaveBeenCalled()
  })

  it('places saved signatures right away', () => {
    const { wrapper } = createWrapper()
    const signature = {
      uuid: 'uuid-1',
      description: 'Signature',
      lines: { curves: [{ points: [0, 0] }], thickness: 1, width: 1, height: 1 },
      areContours: false
    }
    wrapper.findComponent({ name: 'PdfToolbar' }).vm.$emit('addSavedSignature', signature)
    expect(createEditor).toHaveBeenCalledWith(
      101,
      expect.objectContaining({ signatureData: expect.objectContaining({ uuid: 'uuid-1' }) })
    )
  })
})
