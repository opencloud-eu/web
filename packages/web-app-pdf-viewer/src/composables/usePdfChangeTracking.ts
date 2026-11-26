import { nextTick, ref, toValue, unref, watch, type MaybeRefOrGetter } from 'vue'
import { until, useEventListener, useMutationObserver, useTimeoutFn } from '@vueuse/core'
import { AnnotationEditorType, type PDFDocumentProxy } from 'pdfjs-dist'
import type { EditingStates } from './usePdfEditing'

const CHECK_DELAY_MS = 300
// A new image is there once its bitmap is decoded, one save waits for it that long at most.
const IMAGE_LOAD_TIMEOUT_MS = 30_000

/** cyrb53 by bryc (public domain), a fast 53-bit hash of a string. */
function hashString(value: string) {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i)
    h1 = Math.imul(h1 ^ char, 2654435761)
    h2 = Math.imul(h2 ^ char, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

/**
 * The entry without the bitmap of an image: PDF.js puts it only on the first entry per image,
 * depending on the order of the storage, and it serializes to nothing anyway. Not with a replacer
 * of JSON.stringify(), calling it for every point of a drawing takes a multiple of the time.
 */
function withoutBitmap(value: unknown) {
  if (!value || typeof value !== 'object' || !('bitmap' in value)) {
    return value
  }
  return { ...value, bitmap: undefined }
}

/**
 * The state of the storage, by its entries as PDF.js saves them, '' if empty. Not PDF.js' own
 * hash, which depends on the order of the entries: undoing and redoing puts an annotation at the
 * end, e.g. after a form value filled in later, and the saved state would never come back. One
 * short hash per entry, so it stays small with many annotations.
 */
function getStorageHash(map: Map<string, unknown> | null | undefined) {
  if (!map?.size) {
    return ''
  }
  return [...map]
    .map(([key, value]) => `${key}:${hashString(JSON.stringify(withoutBitmap(value)))}`)
    .sort()
    .join(',')
}

/**
 * Turns edits in PDF.js' annotation storage (form values and annotation editors) into
 * new file contents, for saving with AppWrapper (see `flushContent()` and `afterSave()`).
 *
 * `annotationStorage.onSetModified` alone is not enough: it only fires on the first change
 * after a save, and editors that are already stored (moved, resized, recolored) don't
 * trigger it at all. Instead, callers report possible changes via `scheduleCheck()` and the
 * storage hash decides whether anything actually changed.
 *
 * Writing the content takes PDF.js a while on big files and blocks the page, so it happens
 * only in `flush()`, when AppWrapper needs the content. Until then, a copy of the last content
 * marks the file as changed (see `markChanged()`).
 *
 * Opening a document can fill the storage as well, e.g. while PDF.js renders form fields.
 * That must not count as a change, so the storage state at the user's first interaction
 * (`startTracking()`) is the baseline. Before that, nothing is reported.
 */
export function usePdfChangeTracking({
  pdfDocument,
  root,
  isEnabled,
  isReadOnly,
  content,
  isDirty,
  editing,
  onChange
}: {
  pdfDocument: MaybeRefOrGetter<PDFDocumentProxy | undefined>
  /** The app, interactions in it may change the document. */
  root: MaybeRefOrGetter<HTMLElement | null>
  /** E.g. false while pages get rebuilt, they write the changes themselves. */
  isEnabled: MaybeRefOrGetter<boolean>
  isReadOnly: MaybeRefOrGetter<boolean>
  content: MaybeRefOrGetter<ArrayBuffer>
  isDirty: MaybeRefOrGetter<boolean>
  editing: {
    editorMode: MaybeRefOrGetter<number>
    editingStates: MaybeRefOrGetter<EditingStates>
    /** Whether strokes are being drawn, PDF.js stores them once the drawing is finished. */
    isDrawing: () => boolean
    /**
     * Edits PDF.js keeps out of its storage until they're finished, e.g. text being typed. A
     * storage that can't be serialized meanwhile is not an error.
     */
    hasUnfinishedEdits: () => boolean
    /** Finishes these edits, e.g. text being typed, so they are part of the document. */
    commitEditing: () => void
  }
  onChange: (content: ArrayBuffer) => void
}) {
  const { isDrawing, hasUnfinishedEdits } = editing
  // The hash of the storage that the last emitted content (or the baseline) was built from.
  let emittedHash = ''
  let isTracking = false
  let runningFlush: Promise<boolean> | undefined
  // The file was marked as changed since the last flushContent(), see markChanged().
  let hasChangeMarker = false
  // What was emitted last, the props catch up only with the next render.
  let latestContent: ArrayBuffer | undefined
  // The content the emitted hash stands for, without the copies of markChanged().
  let hashedContent: ArrayBuffer | undefined
  // The storage state of the content last saved (or loaded), see afterSave().
  let saved: { hash: string; content: ArrayBuffer } | undefined

  function canTrack() {
    return !toValue(isReadOnly) && toValue(isEnabled)
  }

  const { start: startCheckTimer, stop: cancelCheck } = useTimeoutFn(checkChanges, CHECK_DELAY_MS, {
    immediate: false
  })

  function scheduleCheck() {
    if (!canTrack()) {
      return
    }
    // Marked as changed right away, the check follows a moment later.
    if (!toValue(isDirty) && hasPendingChanges()) {
      markChanged()
    }
    startCheckTimer()
  }

  function reset() {
    cancelCheck()
    emittedHash = ''
    isTracking = false
    hasChangeMarker = false
    latestContent = undefined
    hashedContent = undefined
    saved = undefined
  }

  function emit(newContent: ArrayBuffer) {
    latestContent = newContent
    onChange(newContent)
  }

  /**
   * Marks the file as changed with a copy of the last content, for changes whose content
   * follows later: AppWrapper's save action and a closing tab only look at whether the file is
   * changed, and PDF.js keeps some edits out of its storage until they're finished.
   */
  function markChanged() {
    hasChangeMarker = true
    if (!toValue(isDirty)) {
      emit((latestContent ?? toValue(content)).slice(0))
    }
  }

  /** Takes the current storage as the unchanged state, once per document. */
  function startTracking() {
    const doc = toValue(pdfDocument)
    if (isTracking || !doc) {
      return
    }
    const { hash } = readStorage(doc)
    if (hash === undefined) {
      return
    }
    emittedHash = hash
    isTracking = true
    saved = { hash, content: toValue(content) }
    hashedContent = saved.content
  }

  /** The hash of the storage (see getStorageHash), undefined while it can't be saved (yet). */
  function readStorage(doc: PDFDocumentProxy): {
    hash?: string
    isImageLoading: boolean
    error?: Error
  } {
    try {
      const { map, transfer } = doc.annotationStorage.serializable
      // Copies of image bitmaps, meant to be transferred to the worker. Only the hash is needed.
      for (const bitmap of transfer ?? []) {
        ;(bitmap as ImageBitmap).close?.()
      }
      // An image that is still loading has no bitmap yet, so saving it would fail.
      const isImageLoading = hasLoadingImage(map)
      return { hash: isImageLoading ? undefined : getStorageHash(map), isImageLoading }
    } catch (error) {
      // An annotation that is still being created (e.g. a signature while its dialog is
      // open) can't be serialized yet. It reports the change once it is done.
      if (hasUnfinishedEdits()) {
        return { isImageLoading: false }
      }
      // E.g. a bug of PDF.js.
      return { isImageLoading: false, error: new Error(String(error), { cause: error }) }
    }
  }

  function hasLoadingImage(map: Map<string, unknown> | undefined) {
    return [...(map?.values() ?? [])].some((value) => {
      const { annotationType, bitmapId, id } = value as Record<string, unknown>
      return annotationType === AnnotationEditorType.STAMP && !id && !bitmapId
    })
  }

  /** The hash of changes that were not emitted yet, if any. */
  function getChanges(): { hash?: string; isImageLoading: boolean; error?: Error } {
    const doc = toValue(pdfDocument)
    if (!doc || !isTracking) {
      return { isImageLoading: false }
    }
    const { hash, ...state } = readStorage(doc)
    return { hash: hash === emittedHash ? undefined : hash, ...state }
  }

  function hasPendingChanges() {
    const { hash, error, isImageLoading } = getChanges()
    return hash !== undefined || !!error || isImageLoading
  }

  // PDF.js marks its editor layers as waiting while it decodes a new image.
  const isImageDecoding = ref(false)

  /** Resolves to true once the image is decoded, false if that takes too long. */
  async function waitForImage(doc: PDFDocumentProxy) {
    await until(isImageDecoding).toBe(false, { timeout: IMAGE_LOAD_TIMEOUT_MS })
    return !unref(isImageDecoding) && doc === toValue(pdfDocument)
  }

  /**
   * A change undone before it was written: a copy marked the file as changed (see
   * markChanged()), the content of the storage as it is takes its place again, which may be the
   * saved one. Not while an edit is still unfinished, that is what the copy is for.
   */
  function takeBackCopy() {
    if (!latestContent || latestContent === hashedContent || hasUnfinishedEdits()) {
      return false
    }
    emit(hashedContent)
    return true
  }

  /** Back in the saved state, e.g. by undoing: its content needs no writing. */
  function emitSaved() {
    emittedHash = saved.hash
    hashedContent = saved.content
    emit(saved.content)
  }

  /**
   * The check after edits, without writing the content: a copy marks a change, flush() writes it.
   * Errors show up there as well, when saving. Not while a flush runs: until the content is
   * written, the storage differs from it, and a check would mark the edits as unsaved although
   * the save contains them.
   */
  function checkChanges() {
    if (runningFlush) {
      startCheckTimer()
      return
    }
    const { hash, isImageLoading, error } = getChanges()
    // Checked again until the image is chosen (or not, the file dialog is outside of the app).
    if (isImageLoading) {
      startCheckTimer()
    }
    if (hash === undefined && !error && !isImageLoading) {
      takeBackCopy()
      return
    }
    if (hash === saved?.hash) {
      emitSaved()
      return
    }
    markChanged()
  }

  async function writeChanges(): Promise<boolean> {
    const doc = toValue(pdfDocument)
    const { hash, isImageLoading, error } = getChanges()
    if (error) {
      // The file stays changed, though its content can't be written as it is.
      markChanged()
      throw error
    }
    // PDF.js can't save an image without its bitmap, so saving waits for it. Not while the
    // image is still being chosen (the file dialog is open): checked again later.
    if (isImageLoading) {
      if (!unref(isImageDecoding) || !(await waitForImage(doc))) {
        startCheckTimer()
        return false
      }
      return writeChanges()
    }
    if (hash === undefined) {
      return takeBackCopy()
    }
    if (hash === saved?.hash) {
      emitSaved()
      return true
    }

    // With an empty storage (e.g. every new annotation was removed again) the original
    // bytes are the correct result, saveDocument() would only warn about it.
    const bytes = hash ? await doc.saveDocument() : await doc.getData()
    if (doc !== toValue(pdfDocument)) {
      return false
    }
    emittedHash = hash
    // WebDAV expects a plain ArrayBuffer of exactly the file, a copy only if it is a part of one.
    const isWholeBuffer = bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
    hashedContent = isWholeBuffer ? (bytes.buffer as ArrayBuffer) : bytes.slice().buffer
    emit(hashedContent)

    // Edits that landed while the worker was busy are not part of the content, like edits made
    // while AppWrapper uploads it: they stay unsaved (see afterSave()) and the next flush
    // writes them. Writing again right away could keep a save waiting while the edits go on.
    if (readStorage(doc).hash !== emittedHash) {
      hasChangeMarker = true
    }
    return true
  }

  /** Writes pending changes right away. Resolves to true if new content was emitted. */
  async function flush(): Promise<boolean> {
    cancelCheck()
    // Let a running save finish first, then check whether anything is still pending. A loop,
    // because several callers may be waiting for the same running save. Its failure is reported
    // by its own caller, this one gets its own result.
    while (runningFlush) {
      await runningFlush.catch(() => {})
    }
    runningFlush = writeChanges().finally(() => {
      runningFlush = undefined
    })
    return runningFlush
  }

  // Interactions inside the app: the first one starts the tracking, each may have changed
  // something.
  useEventListener(root, ['pointerdown', 'keydown', 'beforeinput', 'drop'], () => startTracking(), {
    capture: true
  })
  // Values can also come without a key or click, e.g. from autofill or dictation, but always
  // into a focused field. Not on any focus, the pages get it when the document opens.
  useEventListener(
    root,
    'focusin',
    (event: FocusEvent) => {
      if ((event.target as Element).matches?.('input, textarea, select, [contenteditable]')) {
        startTracking()
      }
    },
    { capture: true }
  )
  useEventListener(root, ['pointerup', 'keyup', 'change'], () => scheduleCheck())
  // Typing and drawing count as changes right away, also before PDF.js stores them.
  useEventListener(root, 'input', () => {
    scheduleCheck()
    if (canTrack() && isTracking && hasUnfinishedEdits()) {
      markChanged()
    }
  })
  // A new image: PDF.js asks for the file with an input of its own, outside of the app, and marks
  // its layers as waiting while the image decodes. That is the change, it counts right away.
  useMutationObserver(
    root,
    (mutations) => {
      if (!mutations.some(({ target }) => (target as Element).matches('.annotationEditorLayer'))) {
        return
      }
      const isDecoding = !!toValue(root)?.querySelector('.annotationEditorLayer.waiting')
      if (isDecoding !== unref(isImageDecoding)) {
        isImageDecoding.value = isDecoding
        scheduleCheck()
      }
    },
    { subtree: true, attributes: true, attributeFilter: ['class'] }
  )

  // After PDF.js' own handling on window. Drawing counts from the first stroke, PDF.js stores it
  // once the pointer is released.
  const { start: checkDrawing } = useTimeoutFn(
    () => {
      if (canTrack() && isTracking && isDrawing()) {
        markChanged()
      }
    },
    0,
    { immediate: false }
  )
  useEventListener(root, ['pointerdown', 'pointerup'], () => checkDrawing())

  // Annotations get committed by PDF.js asynchronously, e.g. when leaving a tool.
  watch(() => [toValue(editing.editorMode), toValue(editing.editingStates)], scheduleCheck)

  /**
   * Writes the latest edits into the content, to register with AppWrapper as its flush callback:
   * it runs before every save and before AppWrapper decides about unsaved changes. A failure
   * rejects, AppWrapper reports it and keeps the file changed.
   */
  async function flushContent() {
    if (toValue(isReadOnly)) {
      return
    }
    // Text being typed or a drawing is only part of the document once finished.
    editing.commitEditing()
    // The commit put every edit so far into the storage, a save takes them with the content.
    // Edits marked from now on may not be part of it, e.g. text typed while it runs.
    hasChangeMarker = false
    await flush()
  }

  /**
   * After every save of AppWrapper, to register with it as its save callback. Getting back to
   * the saved state, e.g. by undoing, emits exactly its content again, which AppWrapper takes as
   * unchanged.
   */
  async function afterSave() {
    await nextTick()
    // Edits made while saving are not part of the saved content.
    if (toValue(isDirty) || !isTracking) {
      return
    }
    saved = { hash: emittedHash, content: toValue(content) }
    hashedContent = saved.content
    // Typed or drawn while saving, but not committed yet: still not saved.
    if (hasChangeMarker) {
      markChanged()
    }
  }

  return { scheduleCheck, flush, reset, flushContent, afterSave }
}
