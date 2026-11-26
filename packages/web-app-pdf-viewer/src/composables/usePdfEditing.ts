import { computed, ref, shallowRef, toValue, unref, type MaybeRefOrGetter } from 'vue'
import { until } from '@vueuse/core'
import {
  AnnotationEditorParamsType,
  AnnotationEditorType,
  type AnnotationEditorUIManager
} from 'pdfjs-dist'
import type { EventBus, PDFViewer } from 'pdfjs-dist/web/pdf_viewer.mjs'
import { isCreatingSignature, isDrawing as isViewerDrawing } from '../helpers/pdfjsInternals'

export type EditingStates = {
  hasSomethingToUndo: boolean
  hasSomethingToRedo: boolean
  hasSelectedEditor: boolean
}

const NO_EDITING_STATES: EditingStates = {
  hasSomethingToUndo: false,
  hasSomethingToRedo: false,
  hasSelectedEditor: false
}

/** PDF.js' annotation editing: the active tool, its settings, undo/redo, committing edits. */
export function usePdfEditing({
  eventBus,
  viewer
}: {
  eventBus: EventBus
  viewer: MaybeRefOrGetter<PDFViewer | undefined>
}) {
  // Missing for read-only files and XFA forms, PDF.js doesn't edit them.
  const uiManager = shallowRef<AnnotationEditorUIManager>()
  const editorMode = ref<number>(AnnotationEditorType.NONE)
  const isToolActive = computed(() => unref(editorMode) !== AnnotationEditorType.NONE)
  const editingStates = ref<EditingStates>(NO_EDITING_STATES)
  // Settings (color, size, …) by type as PDF.js reports them, like the inputs of the PDF.js
  // viewer: those of the selected annotation, otherwise the defaults for new ones.
  const editorParams = shallowRef<Map<number, unknown>>(new Map())

  eventBus.on('annotationeditoruimanager', (evt: { uiManager: AnnotationEditorUIManager }) => {
    uiManager.value = evt.uiManager
  })
  // PDF.js asks for a different tool, e.g. on double click on an existing annotation.
  eventBus.on('switchannotationeditormode', setAnnotationEditorMode)
  // E.g. "Comment" on selected text switches to the highlight tool first.
  eventBus.on('showannotationeditorui', ({ mode }: { mode: number }) =>
    setAnnotationEditorMode({ mode })
  )
  eventBus.on('annotationeditormodechanged', ({ mode }: { mode: number }) => {
    editorMode.value = mode
  })
  eventBus.on('editingstateschanged', ({ details }: { details: Partial<EditingStates> }) => {
    editingStates.value = { ...unref(editingStates), ...details }
  })
  eventBus.on(
    'annotationeditorparamschanged',
    ({ details }: { details: [type: number, value: unknown][] }) => setEditorParams(details)
  )

  function setEditorParams(details: [type: number, value: unknown][]) {
    editorParams.value = new Map([...unref(editorParams), ...details])
  }

  /** For a new document, PDF.js creates a new uiManager for it. */
  function reset() {
    uiManager.value = undefined
    editorMode.value = AnnotationEditorType.NONE
    editingStates.value = NO_EDITING_STATES
    editorParams.value = new Map()
  }

  // Same events as the toolbars of the PDF.js viewer, PDF.js' uiManager listens to them.
  function updateParams(type: number, value: unknown) {
    eventBus.dispatch('switchannotationeditorparams', { source: null, type, value })
  }

  function setAnnotationEditorMode(options: PDFViewer['annotationEditorMode']) {
    if (unref(uiManager)) {
      toValue(viewer).annotationEditorMode = options
    }
  }

  function setEditorMode(mode: number) {
    // Clicking the active tool again turns it off, like in the PDF.js viewer.
    setAnnotationEditorMode({
      mode: unref(editorMode) === mode ? AnnotationEditorType.NONE : mode
    })
  }

  /** Switches to the given tool (if needed) and resolves once PDF.js is ready for it. */
  async function ensureEditorMode(mode: number) {
    if (!unref(uiManager) || unref(editorMode) === mode) {
      return
    }
    toValue(viewer).annotationEditorMode = { mode }
    // Another switch in the meantime cancels this one.
    await until(editorMode).toBe(mode, { timeout: 1000 })
  }

  /**
   * Creates an annotation with the given tool, e.g. an image from a file. Without `params`
   * PDF.js asks for the content, e.g. opens the file dialog for images.
   */
  async function createEditor(mode: number, params: object | null = null) {
    await ensureEditorMode(mode)
    if (unref(editorMode) === mode) {
      updateParams(AnnotationEditorParamsType.CREATE, params)
    }
  }

  function selectTool(mode: number) {
    // A signature tool without a signature is no use, PDF.js asks for a new one right away,
    // also for further ones.
    if (mode === AnnotationEditorType.SIGNATURE) {
      createEditor(AnnotationEditorType.SIGNATURE)
      return
    }
    setEditorMode(mode)
  }

  function leaveTool() {
    setAnnotationEditorMode({ mode: AnnotationEditorType.NONE })
  }

  /**
   * AppWrapper closes the app on Escape. Inside the viewer PDF.js uses it to leave form fields
   * and to deselect annotations, so it must not bubble up. That also keeps it from PDF.js' own
   * listener on window, so it is handed over directly.
   */
  function handleEscape(event: KeyboardEvent) {
    event.stopPropagation()
    // Like in the PDF.js viewer, the tool stays active.
    unref(uiManager)?.keydown(event)
  }

  /**
   * Changes a tool setting (color, size, …), like in the PDF.js viewer: the selected
   * annotations, e.g. a drawing that was just finished, otherwise the annotations created from
   * now on. Switches to the tool first, the selection of another tool would get the setting.
   */
  async function updateEditorSetting(mode: number, type: number, value: unknown) {
    await ensureEditorMode(mode)
    if (unref(editorMode) !== mode) {
      return
    }
    // The setting applies to the drawing so far, which the PDF.js viewer finishes when the
    // focus moves to its settings.
    finishDrawings()
    setEditorParams([[type, value]])
    updateParams(type, value)
  }

  /** PDF.js disables text selection for drawing, and for dragging a selected annotation. */
  function isDrawing() {
    const pdfViewer = toValue(viewer)
    return !!pdfViewer && isViewerDrawing(pdfViewer) && !unref(uiManager)?.hasSelection
  }

  /**
   * Edits PDF.js keeps out of its storage until they're finished: drawings, text being typed, a
   * signature whose dialog is open (stored already, but it can't be saved yet).
   */
  function hasUnfinishedEdits() {
    const pdfViewer = toValue(viewer)
    return (
      isDrawing() ||
      !!unref(uiManager)?.getActive() ||
      (!!pdfViewer && isCreatingSignature(pdfViewer))
    )
  }

  /**
   * The strokes of a drawing become an annotation once the drawing is finished. PDF.js does that
   * when the page loses the focus, which clicking a button doesn't do in every browser (Safari).
   */
  function finishDrawings() {
    const manager = unref(uiManager)
    for (let pageIndex = 0; pageIndex < (toValue(viewer)?.pagesCount ?? 0); pageIndex++) {
      manager?.getLayer(pageIndex)?.commitOrRemove()
    }
  }

  /** Finishes these edits, so they are part of the document. */
  function commitEditing() {
    unref(uiManager)?.commitOrRemove()
    finishDrawings()
  }

  function undo() {
    // Undoes the drawing so far as a whole, like after clicking anywhere else.
    finishDrawings()
    eventBus.dispatch('editingaction', { source: null, name: 'undo' })
  }

  function redo() {
    eventBus.dispatch('editingaction', { source: null, name: 'redo' })
  }

  return {
    uiManager,
    editorMode,
    isToolActive,
    editingStates,
    editorParams,
    reset,
    createEditor,
    selectTool,
    leaveTool,
    handleEscape,
    isDrawing,
    hasUnfinishedEdits,
    finishDrawings,
    commitEditing,
    updateEditorSetting,
    undo,
    redo
  }
}
