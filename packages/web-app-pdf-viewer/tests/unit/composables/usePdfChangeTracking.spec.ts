import { nextTick, ref, shallowRef } from 'vue'
import { mock } from 'vitest-mock-extended'
import { AnnotationEditorType, type PDFDocumentProxy } from 'pdfjs-dist'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { usePdfChangeTracking } from '../../../src/composables/usePdfChangeTracking'

function createDocument() {
  const state = {
    hash: '',
    isSerializable: true,
    transfer: [] as { close: () => void }[],
    map: new Map<string, object>()
  }
  const mocks = {
    annotationStorage: {
      get serializable() {
        if (!state.isSerializable) {
          throw new TypeError("Cannot read properties of null (reading 'serialize')")
        }
        // `hash` stands for the entries, e.g. 'a' for an annotation with that state.
        const map = new Map<string, unknown>(state.map)
        if (state.hash) {
          map.set('state', state.hash)
        }
        // Like PDF.js' own hash, it depends on the order of the entries.
        return { map, hash: map.size ? JSON.stringify([...map]) : '', transfer: state.transfer }
      }
    },
    saveDocument: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    getData: vi.fn().mockResolvedValue(new Uint8Array([9]))
  }
  // mock() would replace the storage's getter by its value.
  const doc = mock<PDFDocumentProxy>({
    saveDocument: mocks.saveDocument,
    getData: mocks.getData
  })
  Object.defineProperty(doc, 'annotationStorage', { value: mocks.annotationStorage })
  return { doc, state, mocks }
}

function setup(
  doc: PDFDocumentProxy,
  {
    startTracking = true,
    isEnabled = true,
    isReadOnly = false,
    isDirty = false,
    isDrawing = false,
    hasUnfinishedEdits = false
  } = {}
) {
  const state = { isDirty, isDrawing, hasUnfinishedEdits }
  const pdfDocument = shallowRef<PDFDocumentProxy>(doc)
  const root = document.createElement('div')
  document.body.append(root)
  const content = new Uint8Array([4, 2]).buffer
  const onChange = vi.fn()
  const editing = {
    editorMode: ref(0),
    editingStates: ref({
      hasSomethingToUndo: false,
      hasSomethingToRedo: false,
      hasSelectedEditor: false
    }),
    isDrawing: () => state.isDrawing,
    hasUnfinishedEdits: () => state.hasUnfinishedEdits,
    commitEditing: vi.fn()
  }
  let tracking: ReturnType<typeof usePdfChangeTracking>
  getComposableWrapper(() => {
    tracking = usePdfChangeTracking({
      pdfDocument,
      root: ref(root),
      isEnabled: () => isEnabled,
      isReadOnly,
      content,
      isDirty: () => state.isDirty,
      editing,
      onChange
    })
  })
  // The first interaction starts the tracking.
  if (startTracking) {
    root.dispatchEvent(new Event('pointerdown'))
  }
  return { tracking, onChange, pdfDocument, root, content, state, editing }
}

describe('usePdfChangeTracking', () => {
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it.each([{ isEnabled: false }, { isReadOnly: true }])(
    'does not check when disabled (%o)',
    async (options) => {
      vi.useFakeTimers()
      const { doc, state, mocks } = createDocument()
      const { tracking, onChange } = setup(doc, options)
      state.hash = 'a'
      tracking.scheduleCheck()
      await vi.runAllTimersAsync()
      expect(onChange).not.toHaveBeenCalled()
      expect(mocks.saveDocument).not.toHaveBeenCalled()
    }
  )

  it('leaves read-only files alone when AppWrapper saves', async () => {
    const { doc, state, mocks } = createDocument()
    const { tracking, editing } = setup(doc, { isReadOnly: true })
    state.hash = 'a'
    await tracking.flushContent()
    expect(editing.commitEditing).not.toHaveBeenCalled()
    expect(mocks.saveDocument).not.toHaveBeenCalled()
  })

  // PDF.js commits annotations asynchronously, e.g. when leaving a tool.
  it('checks for changes when the tool or the editing state changes', async () => {
    const { doc, state } = createDocument()
    const { onChange, editing } = setup(doc)
    state.hash = 'a'
    editing.editorMode.value = 15
    await nextTick()
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('frees the bitmap copies made for the hash', () => {
    const { doc, state } = createDocument()
    const bitmap = { close: vi.fn() }
    state.transfer = [bitmap]
    setup(doc)
    expect(bitmap.close).toHaveBeenCalled()
  })

  // AppWrapper reports it when saving.
  it('fails only when the changes get written', async () => {
    vi.useFakeTimers()
    const { doc, state, mocks } = createDocument()
    const error = new Error('broken')
    mocks.saveDocument.mockRejectedValue(error)
    const { tracking } = setup(doc)
    state.hash = 'a'
    tracking.scheduleCheck()
    await vi.runAllTimersAsync()
    expect(mocks.saveDocument).not.toHaveBeenCalled()
    await expect(tracking.flushContent()).rejects.toBe(error)
  })

  // PDF.js stores text being typed and drawings only once they are finished.
  it('marks the file as changed while typing or drawing', async () => {
    vi.useFakeTimers()
    const { doc } = createDocument()
    const { onChange, root, state } = setup(doc)
    root.dispatchEvent(new Event('input', { bubbles: true }))
    expect(onChange).not.toHaveBeenCalled()
    // Clicking into a text box changes nothing yet.
    state.hasUnfinishedEdits = true
    root.dispatchEvent(new Event('pointerup', { bubbles: true }))
    await vi.runAllTimersAsync()
    expect(onChange).not.toHaveBeenCalled()
    // Still drawing after PDF.js handled the pointer, unlike after dragging an annotation.
    state.isDrawing = true
    root.dispatchEvent(new Event('pointerup', { bubbles: true }))
    state.isDrawing = false
    await vi.runAllTimersAsync()
    expect(onChange).not.toHaveBeenCalled()
    state.isDrawing = true
    root.dispatchEvent(new Event('pointerup', { bubbles: true }))
    await vi.runAllTimersAsync()
    expect(Array.from(new Uint8Array(onChange.mock.calls[0][0]))).toEqual([4, 2])
    // Marked once, not for every key.
    state.isDirty = true
    root.dispatchEvent(new Event('input', { bubbles: true }))
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('counts a drawing from its first stroke, before the pointer is released', async () => {
    vi.useFakeTimers()
    const { doc } = createDocument()
    const { onChange, root, state } = setup(doc)
    // PDF.js starts the drawing with the pointer down.
    root.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    state.isDrawing = true
    await vi.runAllTimersAsync()
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  // Writing takes PDF.js a while on big files, it blocks the page.
  it('marks the file as changed right away, the new content follows once flushed', async () => {
    vi.useFakeTimers()
    const { doc, state, mocks } = createDocument()
    const { tracking, onChange, state: tracked } = setup(doc)
    state.hash = 'a'
    tracking.scheduleCheck()
    expect(Array.from(new Uint8Array(onChange.mock.calls[0][0]))).toEqual([4, 2])
    tracked.isDirty = true
    await vi.runAllTimersAsync()
    expect(mocks.saveDocument).not.toHaveBeenCalled()
    expect(onChange).toHaveBeenCalledTimes(1)
    await tracking.flush()
    expect(Array.from(new Uint8Array(onChange.mock.calls[1][0]))).toEqual([1, 2, 3])
  })

  it('marks changes after a delay as well, e.g. annotations PDF.js commits later', async () => {
    vi.useFakeTimers()
    const { doc, state, mocks } = createDocument()
    const { tracking, onChange } = setup(doc)
    tracking.scheduleCheck()
    state.hash = 'a'
    expect(onChange).not.toHaveBeenCalled()
    await vi.runAllTimersAsync()
    expect(Array.from(new Uint8Array(onChange.mock.calls[0][0]))).toEqual([4, 2])
    expect(mocks.saveDocument).not.toHaveBeenCalled()
  })

  it('takes the saved content back when its state is reached again, without writing', async () => {
    vi.useFakeTimers()
    const { doc, state, mocks } = createDocument()
    const { tracking, onChange, content, state: tracked } = setup(doc)
    state.hash = 'a'
    await tracking.flush()
    await tracking.afterSave()
    state.hash = 'b'
    await tracking.flush()
    tracked.isDirty = true
    // E.g. undone.
    state.hash = 'a'
    tracking.scheduleCheck()
    await vi.runAllTimersAsync()
    expect(onChange.mock.calls.at(-1)[0]).toBe(content)
    expect(mocks.saveDocument).toHaveBeenCalledTimes(2)
  })

  it('marks with the newest content, not the one of the last render', async () => {
    const { doc, state: storage } = createDocument()
    const { tracking, onChange, root, state } = setup(doc)
    storage.hash = 'a'
    await tracking.flush()
    state.hasUnfinishedEdits = true
    root.dispatchEvent(new Event('input', { bubbles: true }))
    expect(Array.from(new Uint8Array(onChange.mock.calls[1][0]))).toEqual([1, 2, 3])
  })

  it('emits the saved document once the storage changed', async () => {
    const { doc, state } = createDocument()
    const { tracking, onChange } = setup(doc)
    state.hash = 'a'
    expect(await tracking.flush()).toBe(true)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(Array.from(new Uint8Array(onChange.mock.calls[0][0]))).toEqual([1, 2, 3])

    // Same storage again, nothing new to emit.
    expect(await tracking.flush()).toBe(false)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  // AppWrapper compares by reference, so undoing every change is no change anymore.
  it('emits the saved content when its state is reached again', async () => {
    const { doc, state, mocks } = createDocument()
    const { tracking, onChange, content } = setup(doc)
    state.hash = 'a'
    await tracking.flush()
    state.hash = ''
    await tracking.flush()
    expect(onChange.mock.calls[1][0]).toBe(content)
    expect(mocks.getData).not.toHaveBeenCalled()
    // After saving a change, its state is the saved one, with the content saved then.
    state.hash = 'a'
    await tracking.flush()
    await tracking.afterSave()
    state.hash = 'b'
    await tracking.flush()
    state.hash = 'a'
    await tracking.flush()
    expect(onChange.mock.calls[4][0]).toBe(content)
    expect(mocks.saveDocument).toHaveBeenCalledTimes(3)
  })

  it('takes the copy back that marked a change undone before it was written', async () => {
    vi.useFakeTimers()
    const { doc, state } = createDocument()
    const { tracking, onChange, content } = setup(doc)
    state.hash = 'a'
    tracking.scheduleCheck()
    expect(onChange).toHaveBeenCalledTimes(1)
    // Undone before the check, e.g. with a quick undo.
    state.hash = ''
    await vi.runAllTimersAsync()
    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChange.mock.calls[1][0]).toBe(content)
    // The same back to a written change, which stays unsaved.
    state.hash = 'a'
    await tracking.flush()
    const written = onChange.mock.calls[2][0]
    state.hash = 'b'
    tracking.scheduleCheck()
    state.hash = 'a'
    await vi.runAllTimersAsync()
    expect(onChange).toHaveBeenCalledTimes(5)
    expect(onChange.mock.calls[4][0]).toBe(written)
  })

  it('keeps the copy that marks an unfinished edit', async () => {
    vi.useFakeTimers()
    const { doc } = createDocument()
    const { onChange, root, state } = setup(doc)
    state.hasUnfinishedEdits = true
    root.dispatchEvent(new Event('input', { bubbles: true }))
    expect(onChange).toHaveBeenCalledTimes(1)
    await vi.runAllTimersAsync()
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('emits the original bytes when all annotations were removed again', async () => {
    const { doc, state, mocks } = createDocument()
    // E.g. PDF.js filled the storage when opening.
    state.hash = 'opened'
    const { tracking, onChange } = setup(doc)
    state.hash = ''
    await tracking.flush()
    expect(mocks.getData).toHaveBeenCalled()
    expect(Array.from(new Uint8Array(onChange.mock.calls[0][0]))).toEqual([9])
  })

  it('serializes concurrent flushes', async () => {
    const { doc, state, mocks } = createDocument()
    const { tracking, onChange } = setup(doc)
    state.hash = 'a'
    const results = await Promise.all([tracking.flush(), tracking.flush(), tracking.flush()])
    expect(results).toEqual([true, false, false])
    expect(mocks.saveDocument).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('keeps changes made while writing unsaved, the next flush writes them', async () => {
    const { doc, state, mocks } = createDocument()
    const { tracking, onChange } = setup(doc)
    state.hash = 'a'
    mocks.saveDocument.mockImplementationOnce(() => {
      state.hash = 'b'
      return Promise.resolve(new Uint8Array([1]))
    })
    await tracking.flush()
    expect(Array.from(new Uint8Array(onChange.mock.calls[0][0]))).toEqual([1])
    await tracking.afterSave()
    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChange.mock.calls[1][0]).not.toBe(onChange.mock.calls[0][0])
    expect(await tracking.flush()).toBe(true)
    expect(mocks.saveDocument).toHaveBeenCalledTimes(2)
  })

  it('checks only once a flush is done, also a failed one', async () => {
    vi.useFakeTimers()
    const { doc, state, mocks } = createDocument()
    const { tracking, onChange } = setup(doc)
    let fail: (error: Error) => void
    mocks.saveDocument.mockReturnValueOnce(
      new Promise<Uint8Array>((_, reject) => {
        fail = reject
      })
    )
    state.hash = 'a'
    const flushing = tracking.flush()
    // Marked right away, the check follows later.
    tracking.scheduleCheck()
    expect(onChange).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1000)
    expect(onChange).toHaveBeenCalledTimes(1)
    const error = new Error('cannot serialize')
    fail(error)
    await expect(flushing).rejects.toBe(error)
    await vi.runAllTimersAsync()
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  // With a save like AppWrapper's: flush, PUT, save callback.
  describe('editing while AppWrapper saves', () => {
    function setupSave() {
      const { doc, state: storage, mocks } = createDocument()
      const root = document.createElement('div')
      document.body.append(root)
      const loaded = new Uint8Array([4, 2]).buffer
      // AppWrapper compares the current content with the one on the server.
      const app = { current: loaded, server: loaded }
      const isDirty = () => app.current !== app.server
      const editingState = { isTyping: false, isDrawing: false }
      let tracking: ReturnType<typeof usePdfChangeTracking>
      getComposableWrapper(() => {
        tracking = usePdfChangeTracking({
          pdfDocument: shallowRef(doc),
          root: ref(root),
          isEnabled: true,
          isReadOnly: false,
          isDirty,
          content: () => app.current,
          editing: {
            editorMode: ref(0),
            editingStates: ref({
              hasSomethingToUndo: false,
              hasSomethingToRedo: false,
              hasSelectedEditor: false
            }),
            isDrawing: () => editingState.isDrawing,
            hasUnfinishedEdits: () => editingState.isTyping || editingState.isDrawing,
            // Writes the text or drawing into the storage, which ends the typing.
            commitEditing: () => {
              storage.hash = 'committed'
              editingState.isTyping = false
              editingState.isDrawing = false
            }
          },
          onChange: (content) => {
            app.current = content
          }
        })
      })
      // The first interaction starts the tracking.
      root.dispatchEvent(new Event('pointerdown'))

      async function save(editWhilePutRuns: () => Promise<void> | void = () => {}) {
        await tracking.flushContent()
        const putContent = app.current
        await editWhilePutRuns()
        app.server = putContent
        await tracking.afterSave()
      }
      return { tracking, root, isDirty, editingState, save, storage, mocks, app }
    }

    it('writes edits only when AppWrapper needs them, undoing needs no save', async () => {
      vi.useFakeTimers()
      const { root, isDirty, save, storage, mocks, app } = setupSave()
      // The state committing the edits leads to when saving (see setupSave()).
      storage.hash = 'committed'
      root.dispatchEvent(new Event('pointerup'))
      expect(isDirty()).toBe(true)
      await vi.runAllTimersAsync()
      expect(mocks.saveDocument).not.toHaveBeenCalled()
      // Undone.
      storage.hash = ''
      root.dispatchEvent(new Event('pointerup'))
      await vi.runAllTimersAsync()
      expect(isDirty()).toBe(false)

      storage.hash = 'committed'
      root.dispatchEvent(new Event('pointerup'))
      await save()
      expect(mocks.saveDocument).toHaveBeenCalledTimes(1)
      expect(Array.from(new Uint8Array(app.server))).toEqual([1, 2, 3])
      expect(isDirty()).toBe(false)
      // Undone after saving: changed again, back at the saved state unchanged.
      storage.hash = ''
      root.dispatchEvent(new Event('pointerup'))
      await vi.runAllTimersAsync()
      expect(isDirty()).toBe(true)
      storage.hash = 'committed'
      root.dispatchEvent(new Event('pointerup'))
      await vi.runAllTimersAsync()
      expect(isDirty()).toBe(false)
      expect(mocks.saveDocument).toHaveBeenCalledTimes(1)
    })

    // PDF.js' hash depends on the order of the entries, undoing and redoing puts the drawing at
    // the end, after a form value filled in later.
    it('is back at the saved state after undoing and redoing, in another order', async () => {
      vi.useFakeTimers()
      const { root, isDirty, save, storage, mocks } = setupSave()
      const drawing: [string, object] = ['pdfjs_internal_editor_1', { annotationType: 15 }]
      const formValue: [string, object] = ['29R', { value: 'Name' }]
      storage.map = new Map([drawing, formValue])
      root.dispatchEvent(new Event('pointerup'))
      await save()
      expect(isDirty()).toBe(false)
      // Undone.
      storage.map = new Map([formValue])
      root.dispatchEvent(new Event('pointerup'))
      await vi.runAllTimersAsync()
      expect(isDirty()).toBe(true)
      // Redone.
      storage.map = new Map([formValue, drawing])
      root.dispatchEvent(new Event('pointerup'))
      await vi.runAllTimersAsync()
      expect(isDirty()).toBe(false)
      expect(mocks.saveDocument).toHaveBeenCalledTimes(1)
    })

    // PDF.js puts the bitmap only on the first entry of an image in the storage, undoing and
    // redoing the first copy moves it to the other one.
    it('is back at the saved state after undoing and redoing a copy of an image', async () => {
      vi.useFakeTimers()
      const { root, isDirty, save, storage, mocks } = setupSave()
      function image(rect: number[], withBitmap: boolean) {
        const stamp = { annotationType: AnnotationEditorType.STAMP, bitmapId: 'img_1', rect }
        // An ImageBitmap, serialized to {}.
        return withBitmap ? { ...stamp, bitmap: {} } : stamp
      }
      const first = 'pdfjs_internal_editor_1'
      const second = 'pdfjs_internal_editor_2'
      storage.map = new Map([
        [first, image([0, 0, 10, 10], true)],
        [second, image([20, 20, 30, 30], false)]
      ])
      root.dispatchEvent(new Event('pointerup'))
      await save()
      expect(isDirty()).toBe(false)
      // Undone.
      storage.map = new Map([[second, image([20, 20, 30, 30], true)]])
      root.dispatchEvent(new Event('pointerup'))
      await vi.runAllTimersAsync()
      expect(isDirty()).toBe(true)
      // Redone.
      storage.map = new Map([
        [second, image([20, 20, 30, 30], true)],
        [first, image([0, 0, 10, 10], false)]
      ])
      root.dispatchEvent(new Event('pointerup'))
      await vi.runAllTimersAsync()
      expect(isDirty()).toBe(false)
      expect(mocks.saveDocument).toHaveBeenCalledTimes(1)
    })

    it('notices a change inside one of the annotations', async () => {
      vi.useFakeTimers()
      const { root, isDirty, save, storage } = setupSave()
      const formValue: [string, object] = ['29R', { value: 'Name' }]
      const drawing = { annotationType: AnnotationEditorType.INK, color: [0, 0, 0], thickness: 1 }
      storage.map = new Map([['pdfjs_internal_editor_1', drawing], formValue])
      root.dispatchEvent(new Event('pointerup'))
      await save()
      expect(isDirty()).toBe(false)
      storage.map = new Map([['pdfjs_internal_editor_1', { ...drawing, thickness: 2 }], formValue])
      root.dispatchEvent(new Event('pointerup'))
      await vi.runAllTimersAsync()
      expect(isDirty()).toBe(true)
    })

    it('keeps text typed while saving unsaved', async () => {
      const { root, isDirty, editingState, save } = setupSave()
      editingState.isTyping = true
      root.dispatchEvent(new Event('input'))
      expect(isDirty()).toBe(true)
      // The save ended the typing, it goes on in the text again.
      await save(() => {
        editingState.isTyping = true
        root.dispatchEvent(new Event('input'))
      })
      expect(isDirty()).toBe(true)
    })

    // E.g. Ctrl+S while typing, which ends the typing.
    it('saves when nothing was typed while saving', async () => {
      const { root, isDirty, editingState, save, app } = setupSave()
      editingState.isTyping = true
      root.dispatchEvent(new Event('input'))
      await save()
      expect(isDirty()).toBe(false)
      expect(Array.from(new Uint8Array(app.server))).toEqual([1, 2, 3])
    })

    it('keeps a stroke drawn while saving unsaved', async () => {
      const { root, isDirty, editingState, save } = setupSave()
      editingState.isDrawing = true
      root.dispatchEvent(new Event('pointerup'))
      await vi.waitFor(() => expect(isDirty()).toBe(true))
      await save(async () => {
        editingState.isDrawing = true
        root.dispatchEvent(new Event('pointerup'))
        // PDF.js handles the pointer first.
        await new Promise((resolve) => setTimeout(resolve))
      })
      expect(isDirty()).toBe(true)
    })

    // E.g. the key up of Ctrl+S, while PDF.js writes a big file.
    it('saves when the app is used while the content is written', async () => {
      vi.useFakeTimers()
      const { root, isDirty, save, storage, mocks } = setupSave()
      storage.hash = 'a'
      root.dispatchEvent(new Event('pointerup'))
      await vi.runAllTimersAsync()
      mocks.saveDocument.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(new Uint8Array([1, 2, 3])), 1000))
      )
      const saved = save()
      await vi.advanceTimersByTimeAsync(50)
      root.dispatchEvent(new Event('keyup'))
      await vi.runAllTimersAsync()
      await saved
      expect(isDirty()).toBe(false)
    })

    // The check of an edit right before saving is still due.
    it('saves right after an edit', async () => {
      vi.useFakeTimers()
      const { root, isDirty, save, storage, mocks } = setupSave()
      mocks.saveDocument.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(new Uint8Array([1, 2, 3])), 500))
      )
      storage.hash = 'a'
      root.dispatchEvent(new Event('pointerup'))
      await vi.advanceTimersByTimeAsync(100)
      const saved = save()
      await vi.runAllTimersAsync()
      await saved
      expect(mocks.saveDocument).toHaveBeenCalled()
      expect(isDirty()).toBe(false)
    })
  })

  it('drops the result if the document was replaced while saving', async () => {
    const { doc, state, mocks } = createDocument()
    const { tracking, onChange, pdfDocument } = setup(doc)
    state.hash = 'a'
    mocks.saveDocument.mockImplementationOnce(() => {
      pdfDocument.value = createDocument().doc
      return Promise.resolve(new Uint8Array([1]))
    })
    expect(await tracking.flush()).toBe(false)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('starts over for a newly loaded document', async () => {
    const { doc, state } = createDocument()
    const { tracking, onChange, root } = setup(doc)
    state.hash = 'a'
    await tracking.flush()
    tracking.reset()
    state.hash = 'b'
    expect(await tracking.flush()).toBe(false)
    root.dispatchEvent(new Event('pointerdown'))
    expect(await tracking.flush()).toBe(false)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('reports nothing before the user interacted', async () => {
    const { doc, state, mocks } = createDocument()
    const { tracking, onChange } = setup(doc, { startTracking: false })
    state.hash = 'a'
    expect(await tracking.flush()).toBe(false)
    expect(mocks.saveDocument).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
  })

  it.each(['pointerdown', 'keydown', 'beforeinput', 'drop'])(
    'takes the state at the first %s in the app as unchanged',
    async (eventName) => {
      const { doc, state } = createDocument()
      state.hash = 'calculated-on-open'
      const { tracking, root, onChange } = setup(doc, { startTracking: false })
      root.dispatchEvent(new Event(eventName))
      state.hash = 'edited'
      expect(await tracking.flush()).toBe(true)
      expect(onChange).toHaveBeenCalledTimes(1)
    }
  )

  it('takes the state as unchanged once a form field gets the focus, e.g. for autofill', async () => {
    const { doc, state } = createDocument()
    state.hash = 'calculated-on-open'
    const { tracking, root, onChange } = setup(doc, { startTracking: false })
    root.dispatchEvent(new FocusEvent('focusin'))
    const field = document.createElement('input')
    root.append(field)
    field.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    state.hash = 'autofilled'
    expect(await tracking.flush()).toBe(true)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it.each(['pointerup', 'keyup', 'input', 'change'])(
    'checks for changes after %s in the app',
    async (eventName) => {
      vi.useFakeTimers()
      const { doc, state, mocks } = createDocument()
      const { root, onChange } = setup(doc)
      root.dispatchEvent(new Event(eventName))
      // E.g. an annotation PDF.js commits right after the event.
      state.hash = 'a'
      expect(onChange).not.toHaveBeenCalled()
      await vi.runAllTimersAsync()
      expect(onChange).toHaveBeenCalledTimes(1)
      expect(mocks.saveDocument).not.toHaveBeenCalled()
    }
  )

  it('does not count what filled the storage when opening the document', async () => {
    const { doc, state, mocks } = createDocument()
    state.hash = 'calculated-on-open'
    const { tracking, onChange } = setup(doc)
    expect(await tracking.flush()).toBe(false)
    expect(mocks.saveDocument).not.toHaveBeenCalled()
    state.hash = 'edited'
    expect(await tracking.flush()).toBe(true)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('waits while an annotation is still being created and cannot be serialized', async () => {
    const { doc, state: docState, mocks } = createDocument()
    const { tracking, onChange, state } = setup(doc)
    docState.hash = 'a'
    docState.isSerializable = false
    state.hasUnfinishedEdits = true
    expect(await tracking.flush()).toBe(false)
    expect(mocks.saveDocument).not.toHaveBeenCalled()

    docState.isSerializable = true
    state.hasUnfinishedEdits = false
    expect(await tracking.flush()).toBe(true)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  // E.g. a PDF.js bug, saving the old content instead would lose every later edit.
  it('keeps the file changed when PDF.js cannot serialize its storage', async () => {
    vi.useFakeTimers()
    const { doc, state, mocks } = createDocument()
    const { tracking, onChange, content } = setup(doc)
    state.hash = 'a'
    state.isSerializable = false
    tracking.scheduleCheck()
    expect(Array.from(new Uint8Array(onChange.mock.calls[0][0]))).toEqual([4, 2])
    expect(onChange.mock.calls[0][0]).not.toBe(content)
    await vi.runAllTimersAsync()
    // Saving reports it.
    await expect(tracking.flush()).rejects.toThrow(/Cannot read properties of null/)
    expect(mocks.saveDocument).not.toHaveBeenCalled()
    // Still marked by a copy, not taken back to the unchanged content.
    expect(onChange.mock.calls.at(-1)[0]).not.toBe(content)
    expect(Array.from(new Uint8Array(onChange.mock.calls.at(-1)[0]))).toEqual([4, 2])

    state.isSerializable = true
    expect(await tracking.flush()).toBe(true)
    expect(Array.from(new Uint8Array(onChange.mock.calls.at(-1)[0]))).toEqual([1, 2, 3])
  })

  it('takes the change back when choosing a new image was cancelled', async () => {
    vi.useFakeTimers()
    const { doc, state: storage } = createDocument()
    const { tracking, onChange, content, state } = setup(doc)
    storage.map.set('stamp', { annotationType: AnnotationEditorType.STAMP, bitmapId: null })
    tracking.scheduleCheck()
    expect(onChange.mock.calls[0][0]).not.toBe(content)
    state.isDirty = true
    await vi.advanceTimersByTimeAsync(1000)
    expect(onChange).toHaveBeenCalledTimes(1)
    // The file dialog is outside of the app, nothing there reports the cancel.
    storage.map.clear()
    await vi.advanceTimersByTimeAsync(1000)
    expect(onChange.mock.calls.at(-1)[0]).toBe(content)
  })

  it('marks the file as changed while a new image decodes, saving then waits for it', async () => {
    vi.useFakeTimers()
    const { doc, state, mocks } = createDocument()
    const { tracking, onChange, content, root } = setup(doc)
    const layer = document.createElement('div')
    layer.className = 'annotationEditorLayer'
    root.append(layer)
    state.hash = 'a'
    state.map.set('stamp', { annotationType: AnnotationEditorType.STAMP, bitmapId: null })
    // PDF.js marks its layers while decoding, the file was chosen outside the app.
    layer.classList.add('waiting')
    await vi.advanceTimersByTimeAsync(0)
    // E.g. closing the app asks about the change right away.
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0]).not.toBe(content)
    // E.g. Ctrl+S: the save gets the image, not the copy.
    const flush = tracking.flush()
    await vi.advanceTimersByTimeAsync(500)
    expect(mocks.saveDocument).not.toHaveBeenCalled()
    state.map.set('stamp', { annotationType: AnnotationEditorType.STAMP, bitmapId: 'image' })
    layer.classList.remove('waiting')
    await vi.advanceTimersByTimeAsync(0)
    expect(await flush).toBe(true)
    expect(mocks.saveDocument).toHaveBeenCalledTimes(1)
    expect(Array.from(new Uint8Array(onChange.mock.calls.at(-1)[0]))).toEqual([1, 2, 3])
  })

  it('does not wait while the image is still being chosen, e.g. in the file dialog', async () => {
    vi.useFakeTimers()
    const { doc, state, mocks } = createDocument()
    const { tracking } = setup(doc, { isDirty: true })
    state.hash = 'a'
    state.map.set('stamp', { annotationType: AnnotationEditorType.STAMP, bitmapId: null })
    expect(await tracking.flush()).toBe(false)
    expect(mocks.saveDocument).not.toHaveBeenCalled()
  })

  it('gives up waiting for an image after a while', async () => {
    vi.useFakeTimers()
    const { doc, state, mocks } = createDocument()
    const { tracking, root } = setup(doc, { isDirty: true })
    const layer = document.createElement('div')
    layer.className = 'annotationEditorLayer waiting'
    root.append(layer)
    await vi.advanceTimersByTimeAsync(0)
    state.hash = 'a'
    state.map.set('stamp', { annotationType: AnnotationEditorType.STAMP, bitmapId: null })
    const flush = tracking.flush()
    await vi.advanceTimersByTimeAsync(31_000)
    expect(await flush).toBe(false)
    expect(mocks.saveDocument).not.toHaveBeenCalled()
    // Once the image is there, the next save writes it.
    state.map.set('stamp', { annotationType: AnnotationEditorType.STAMP, bitmapId: 'image' })
    layer.classList.remove('waiting')
    expect(await tracking.flush()).toBe(true)
    expect(mocks.saveDocument).toHaveBeenCalledTimes(1)
  })
})
