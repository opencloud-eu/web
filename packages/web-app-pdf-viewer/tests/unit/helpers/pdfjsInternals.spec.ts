import { mock } from 'vitest-mock-extended'
import { AnnotationEditorUIManager, AnnotationLayer, AnnotationType } from 'pdfjs-dist'
import { EventBus, PDFViewer } from 'pdfjs-dist/web/pdf_viewer.mjs'
import {
  getAnnotationPopup,
  getEditorUiManager,
  hasRenderedAnnotations,
  getImageBitmap,
  isCreatingSignature,
  isDrawing
} from '../../../src/helpers/pdfjsInternals'
import { hasString, includesCode } from '../pdfjsSource'

// Against PDF.js itself: these tests fail when an update changes what the app relies on.
describe('PDF.js', () => {
  // The app looks for them in PDF.js' elements, see the uses in src.
  it.each([
    'noUserSelect',
    'signatureEditor',
    'annotationLayer',
    'annotationEditorLayer',
    'waiting',
    'editToolbar',
    'annotationCommentButton',
    'popupTriggerArea'
  ])('still has the class "%s"', (className) => {
    expect(hasString(className)).toBe(true)
  })

  // "page" is also the name of a URL parameter in PDF.js.
  it('still has the class "page"', () => {
    expect(includesCode('className = "page"')).toBe(true)
  })

  // Ctrl+S while typing ends the typing like in the PDF.js viewer, and AppWrapper still gets
  // the key to save.
  it('ends the typing of a text on Ctrl+S, passing the key on', () => {
    expect(
      includesCode(
        '[["ctrl+s", "mac+meta+s", "ctrl+p", "mac+meta+p"], proto.commitOrRemove, {\n      bubbles: true\n    }]'
      )
    ).toBe(true)
  })

  // The app passes no scripting manager, see usePdfViewer.
  it('runs no form scripts without a scripting manager', () => {
    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.append(document.createElement('div'))
    const viewer = new PDFViewer({ container, eventBus: new EventBus() })
    expect(viewer.enableScripting).toBe(false)
  })

  // Saving and printing take the values from there, no commit by form scripts needed.
  it('writes what is typed into a form field into the storage right away', async () => {
    const div = document.createElement('div')
    const annotationStorage = {
      getValue: (_id: string, defaultValue: object) => defaultValue,
      setValue: vi.fn(),
      has: () => false
    }
    const layer = new AnnotationLayer({
      div,
      viewport: {
        rawDims: { pageWidth: 200, pageHeight: 200, pageX: 0, pageY: 0 },
        viewBox: [0, 0, 200, 200],
        rotation: 0
      },
      page: { view: [0, 0, 200, 200] },
      annotationStorage
    } as never)
    await layer.render({
      annotations: [
        {
          annotationType: AnnotationType.WIDGET,
          fieldType: 'Tx',
          id: '12R',
          rect: [10, 10, 110, 30],
          fieldName: 'name',
          fieldValue: '',
          borderStyle: { width: 0 },
          defaultAppearanceData: { fontSize: 12, fontColor: [0, 0, 0] }
        }
      ],
      renderForms: true
    } as never)
    const field = div.querySelector('input')
    field.value = 'Jane'
    field.dispatchEvent(new Event('input'))
    expect(annotationStorage.setValue).toHaveBeenCalledWith('12R', { value: 'Jane' })
  })

  const managers: AnnotationEditorUIManager[] = []
  afterEach(() => managers.splice(0).forEach((manager) => manager.destroy()))

  function createUiManager() {
    const eventBus = new EventBus()
    const viewer = document.createElement('div')
    const UiManager = AnnotationEditorUIManager as unknown as new (
      ...args: unknown[]
    ) => AnnotationEditorUIManager
    const uiManager = new UiManager(
      document.createElement('div'),
      viewer,
      null,
      null,
      null,
      null,
      eventBus,
      { annotationStorage: {}, filterFactory: {} }
    )
    managers.push(uiManager)
    return { uiManager, eventBus, viewer }
  }

  it("changes the uiManager's settings with the event of the viewer's toolbars", () => {
    const { uiManager, eventBus } = createUiManager()
    const updateParams = vi.spyOn(uiManager, 'updateParams')
    eventBus.dispatch('switchannotationeditorparams', { source: null, type: 22, value: 5 })
    expect(updateParams).toHaveBeenCalledWith(22, 5)
  })

  it.each(['undo', 'redo'] as const)('does "%s" on the editing action event', (name) => {
    const { uiManager, eventBus } = createUiManager()
    const action = vi.spyOn(uiManager, name).mockImplementation(() => {})
    eventBus.dispatch('editingaction', { source: null, name })
    expect(action).toHaveBeenCalled()
  })

  it('marks the viewer while drawing', () => {
    const { uiManager, viewer } = createUiManager()
    const pdfViewer = mock<PDFViewer>()
    Object.defineProperty(pdfViewer, 'viewer', { value: viewer })
    uiManager.disableUserSelect(true)
    expect(isDrawing(pdfViewer)).toBe(true)
    uiManager.disableUserSelect(false)
    expect(isDrawing(pdfViewer)).toBe(false)
  })

  it('reads image files', () => {
    const { uiManager } = createUiManager()
    expect(uiManager.imageManager.getFromFile).toBeTypeOf('function')
  })

  it('finds the editable annotations of a page', () => {
    expect(AnnotationLayer.prototype.getEditableAnnotation).toBeTypeOf('function')
  })
})

describe('pdfjsInternals', () => {
  it('knows about a new signature waiting for its dialog, hidden until then', () => {
    const pdfViewer = mock<PDFViewer>()
    Object.defineProperty(pdfViewer, 'viewer', { value: document.createElement('div') })
    expect(isCreatingSignature(pdfViewer)).toBe(false)
    const signature = document.createElement('div')
    signature.className = 'signatureEditor'
    signature.hidden = true
    pdfViewer.viewer.append(signature)
    expect(isCreatingSignature(pdfViewer)).toBe(true)
  })

  it("knows the uiManager of editors, not of annotations PDF.js can't edit", () => {
    const uiManager = mock<AnnotationEditorUIManager>()
    expect(getEditorUiManager({ _uiManager: uiManager })).toBe(uiManager)
    expect(getEditorUiManager({ _uiManager: null })).toBeUndefined()
    expect(getEditorUiManager({})).toBeUndefined()
  })

  it('reads image files, null if they are no images', async () => {
    const bitmap = {} as ImageBitmap
    const getFromFile = vi.fn().mockResolvedValueOnce({ bitmap }).mockResolvedValueOnce(null)
    const uiManager = mock<AnnotationEditorUIManager>({ imageManager: { getFromFile } })
    const file = new File([], 'a.png')
    expect(await getImageBitmap(uiManager, file)).toBe(bitmap)
    expect(await getImageBitmap(uiManager, file)).toBeNull()
  })

  it('knows whether the annotations of a page are rendered', () => {
    const div = document.createElement('div')
    div.innerHTML = '<section data-annotation-id="12R"></section>'
    const viewer = mock<PDFViewer>({
      getPageView: vi.fn((pageIndex: number) =>
        pageIndex === 0 ? { annotationLayer: { div } } : { annotationLayer: { div: null } }
      )
    })
    expect(hasRenderedAnnotations(viewer, 0)).toBe(true)
    expect(hasRenderedAnnotations(viewer, 1)).toBe(false)
  })

  it('finds the comment popup of a saved annotation once its page is rendered', () => {
    const popup = {}
    const getEditableAnnotation = vi.fn().mockReturnValue({ popup })
    const viewer = mock<PDFViewer>({
      getPageView: vi.fn((pageIndex: number) =>
        pageIndex === 0 ? { annotationLayer: { annotationLayer: { getEditableAnnotation } } } : {}
      )
    })
    expect(getAnnotationPopup(viewer, 0, '12R')).toBe(popup)
    expect(getEditableAnnotation).toHaveBeenCalledWith('12R')
    expect(getAnnotationPopup(viewer, 1, '12R')).toBeUndefined()
  })
})
