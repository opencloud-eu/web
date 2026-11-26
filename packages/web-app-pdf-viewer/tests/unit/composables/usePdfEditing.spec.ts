import { shallowRef } from 'vue'
import { mock } from 'vitest-mock-extended'
import { AnnotationEditorParamsType, AnnotationEditorType } from 'pdfjs-dist'
import { EventBus, type PDFViewer } from 'pdfjs-dist/web/pdf_viewer.mjs'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { usePdfEditing } from '../../../src/composables/usePdfEditing'

function setup() {
  const eventBus = new EventBus()
  const viewer = mock<PDFViewer>({ pagesCount: 2 })
  Object.defineProperties(viewer, {
    viewer: { value: document.createElement('div') },
    // PDF.js switches tools asynchronously and reports it.
    annotationEditorMode: {
      set: ({ mode }: { mode: number }) =>
        queueMicrotask(() => eventBus.dispatch('annotationeditormodechanged', { mode }))
    }
  })
  const layers = [{ commitOrRemove: vi.fn() }, { commitOrRemove: vi.fn() }]
  const uiManager = {
    hasSelection: false,
    getActive: vi.fn(),
    getLayer: (pageIndex: number) => layers[pageIndex],
    commitOrRemove: vi.fn(),
    firstSelectedEditor: undefined as unknown,
    keydown: vi.fn(),
    unselectAll: vi.fn(),
    updateParams: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn()
  }
  let editing: ReturnType<typeof usePdfEditing>
  getComposableWrapper(() => {
    editing = usePdfEditing({
      eventBus,
      viewer: shallowRef(viewer)
    })
  })
  // Like PDF.js' uiManager, see pdfjsInternals.spec.ts.
  eventBus.on('switchannotationeditorparams', ({ type, value }: { type: number; value: unknown }) =>
    uiManager.updateParams(type, value)
  )
  eventBus.on('editingaction', ({ name }: { name: 'undo' | 'redo' }) => uiManager[name]())
  eventBus.dispatch('annotationeditoruimanager', { uiManager })
  return { editing, eventBus, uiManager, viewer, layers }
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve))
}

describe('usePdfEditing', () => {
  it('follows the tool PDF.js reports', async () => {
    const { editing } = setup()
    editing.selectTool(AnnotationEditorType.INK)
    await flush()
    expect(editing.editorMode.value).toBe(AnnotationEditorType.INK)
    // The active tool again turns it off.
    editing.selectTool(AnnotationEditorType.INK)
    await flush()
    expect(editing.editorMode.value).toBe(AnnotationEditorType.NONE)
  })

  it('creates annotations once the tool is ready', async () => {
    const { editing, uiManager } = setup()
    await editing.createEditor(AnnotationEditorType.HIGHLIGHT, { foo: 1 })
    expect(editing.editorMode.value).toBe(AnnotationEditorType.HIGHLIGHT)
    expect(uiManager.updateParams).toHaveBeenCalledWith(AnnotationEditorParamsType.CREATE, {
      foo: 1
    })
  })

  it('asks for a new signature right away when choosing the signature tool', async () => {
    const { editing, uiManager } = setup()
    editing.selectTool(AnnotationEditorType.SIGNATURE)
    await flush()
    expect(uiManager.updateParams).toHaveBeenCalledWith(AnnotationEditorParamsType.CREATE, null)
    // Also for further signatures, instead of leaving the tool.
    editing.selectTool(AnnotationEditorType.SIGNATURE)
    await flush()
    expect(uiManager.updateParams).toHaveBeenCalledTimes(2)
    expect(editing.editorMode.value).toBe(AnnotationEditorType.SIGNATURE)
  })

  describe('Escape', () => {
    function escapeKeydown() {
      return new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
    }

    it('hands it to PDF.js and keeps the tool, like the PDF.js viewer', async () => {
      const { editing, uiManager } = setup()
      editing.selectTool(AnnotationEditorType.INK)
      await flush()
      const event = escapeKeydown()
      editing.handleEscape(event)
      await flush()
      expect(uiManager.keydown).toHaveBeenCalledWith(event)
      expect(editing.editorMode.value).toBe(AnnotationEditorType.INK)
    })
  })

  describe('tool settings', () => {
    it('change the selection, otherwise the defaults (PDF.js decides)', async () => {
      const { editing, uiManager } = setup()
      editing.selectTool(AnnotationEditorType.INK)
      await flush()
      await editing.updateEditorSetting(
        AnnotationEditorType.INK,
        AnnotationEditorParamsType.INK_THICKNESS,
        5
      )
      expect(uiManager.updateParams).toHaveBeenCalledWith(
        AnnotationEditorParamsType.INK_THICKNESS,
        5
      )
      expect(uiManager.unselectAll).not.toHaveBeenCalled()
      expect(editing.editorParams.value.get(AnnotationEditorParamsType.INK_THICKNESS)).toBe(5)
    })

    // A selection of another tool would get the setting.
    it('switch to their tool first', async () => {
      const { editing, uiManager } = setup()
      await editing.updateEditorSetting(
        AnnotationEditorType.HIGHLIGHT,
        AnnotationEditorParamsType.HIGHLIGHT_COLOR,
        '#FFFF98'
      )
      expect(editing.editorMode.value).toBe(AnnotationEditorType.HIGHLIGHT)
      expect(uiManager.updateParams).toHaveBeenCalledWith(
        AnnotationEditorParamsType.HIGHLIGHT_COLOR,
        '#FFFF98'
      )
    })

    it('finish the drawing so far, which then gets the setting', async () => {
      const { editing, layers } = setup()
      editing.selectTool(AnnotationEditorType.INK)
      await flush()
      await editing.updateEditorSetting(
        AnnotationEditorType.INK,
        AnnotationEditorParamsType.INK_THICKNESS,
        5
      )
      expect(layers[0].commitOrRemove).toHaveBeenCalled()
    })

    // E.g. of a selected annotation, or the defaults when a new drawing starts.
    it('show what PDF.js reports', () => {
      const { editing, eventBus } = setup()
      const type = AnnotationEditorParamsType.INK_THICKNESS
      eventBus.dispatch('annotationeditorparamschanged', { details: [[type, 10]] })
      expect(editing.editorParams.value.get(type)).toBe(10)
      eventBus.dispatch('annotationeditorparamschanged', { details: [[type, 1]] })
      expect(editing.editorParams.value.get(type)).toBe(1)
    })
  })

  it('knows about edits PDF.js keeps out of its storage until they are finished', () => {
    const { editing, uiManager, viewer } = setup()
    expect(editing.hasUnfinishedEdits()).toBe(false)
    // Text being typed.
    uiManager.getActive.mockReturnValue({})
    expect(editing.hasUnfinishedEdits()).toBe(true)
    uiManager.getActive.mockReturnValue(null)
    // A drawing.
    viewer.viewer.classList.add('noUserSelect')
    expect(editing.isDrawing()).toBe(true)
    expect(editing.hasUnfinishedEdits()).toBe(true)
    // Dragging a selected annotation looks the same to PDF.js' text selection.
    uiManager.hasSelection = true
    expect(editing.isDrawing()).toBe(false)
  })

  it('knows about a signature whose dialog is open, it cannot be saved yet', () => {
    const { editing, viewer } = setup()
    const signature = document.createElement('div')
    signature.className = 'signatureEditor'
    signature.hidden = true
    viewer.viewer.append(signature)
    expect(editing.hasUnfinishedEdits()).toBe(true)
    signature.hidden = false
    expect(editing.hasUnfinishedEdits()).toBe(false)
  })

  it('finishes text being typed and drawings on all pages', () => {
    const { editing, uiManager, layers } = setup()
    editing.commitEditing()
    expect(uiManager.commitOrRemove).toHaveBeenCalled()
    expect(layers.every(({ commitOrRemove }) => commitOrRemove.mock.calls.length)).toBe(true)
  })

  it('undoes and redoes, the drawing so far as a whole', () => {
    const { editing, uiManager, layers } = setup()
    editing.undo()
    expect(layers[0].commitOrRemove).toHaveBeenCalled()
    expect(uiManager.undo).toHaveBeenCalled()
    editing.redo()
    expect(uiManager.redo).toHaveBeenCalled()
  })

  it('switches tools when PDF.js asks, e.g. "Comment" on selected text', async () => {
    const { editing, eventBus } = setup()
    eventBus.dispatch('showannotationeditorui', { mode: AnnotationEditorType.HIGHLIGHT })
    await flush()
    expect(editing.editorMode.value).toBe(AnnotationEditorType.HIGHLIGHT)
  })
})
