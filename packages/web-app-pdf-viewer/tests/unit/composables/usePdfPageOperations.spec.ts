import { nextTick, ref, shallowRef, unref } from 'vue'
import type { Mock } from 'vitest'
import { mock } from 'vitest-mock-extended'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import {
  getMovedPageIndices,
  usePdfPageOperations
} from '../../../src/composables/usePdfPageOperations'
import { useMessages } from '@opencloud-eu/web-pkg'

function setup({ numPages = 3, pageNumber = 2 } = {}) {
  const extractPages = vi.fn().mockResolvedValue(new Uint8Array([7]))
  const doc = mock<PDFDocumentProxy>({ numPages, extractPages })
  const edits = {
    states: ref({ hasSomethingToUndo: false, hasSomethingToRedo: false, hasSelectedEditor: false }),
    undo: vi.fn(),
    redo: vi.fn()
  }
  const onDocumentChanged = vi.fn()
  const beforeChange = vi.fn().mockResolvedValue(undefined)
  // Changeable, e.g. scrolling while the pending changes are written.
  const viewed = { pageNumber }
  const content = shallowRef(new Uint8Array([1]).buffer)
  // Loading the new document changes the current content.
  onDocumentChanged.mockImplementation((newContent: ArrayBuffer) => {
    content.value = newContent
  })
  let operations: ReturnType<typeof usePdfPageOperations>
  let messages: ReturnType<typeof useMessages>
  getComposableWrapper(() => {
    messages = useMessages()
    operations = usePdfPageOperations({
      pdfDocument: shallowRef(doc),
      edits,
      getContent: () => unref(content),
      getPageNumber: () => viewed.pageNumber,
      beforeChange,
      onDocumentChanged
    })
  })
  return {
    operations,
    extractPages,
    beforeChange,
    onDocumentChanged,
    showErrorMessage: messages.showErrorMessage,
    content,
    edits,
    viewed
  }
}

describe('usePdfPageOperations', () => {
  describe('getMovedPageIndices', () => {
    it.each([
      [4, 0, 1, [1, 0, 2, 3]],
      [4, 1, 0, [1, 0, 2, 3]],
      [4, 0, 3, [3, 0, 1, 2]],
      [4, 3, 0, [1, 2, 3, 0]],
      [3, 1, 1, [0, 1, 2]]
    ])('moves in %i pages page %i to %i', (count, from, to, expected) => {
      expect(getMovedPageIndices(count, from, to)).toEqual(expected)
    })
  })

  describe('deletePage', () => {
    it('extracts all other pages and reports the new document', async () => {
      const { operations, extractPages, onDocumentChanged } = setup()
      await operations.deletePage(3)
      expect(extractPages).toHaveBeenCalledWith([{ document: null, excludePages: [2] }])
      // The others keep their numbers.
      expect(onDocumentChanged).toHaveBeenCalledWith(expect.any(ArrayBuffer), 2, [1, 2])
    })

    it.each([
      ['stays on the viewed page before the deleted one', 2, 3, 2],
      ['stays on the viewed page after the deleted one', 2, 1, 1],
      ['shows the page that takes the place of the deleted one', 2, 2, 2],
      ['shows the new last page when the viewed last page is deleted', 3, 3, 2]
    ])('%s', async (_, pageNumber, deleted, expected) => {
      const { operations, onDocumentChanged } = setup({ pageNumber })
      await operations.deletePage(deleted)
      expect(onDocumentChanged).toHaveBeenCalledWith(
        expect.any(ArrayBuffer),
        expected,
        expect.any(Array)
      )
    })

    it('takes the page viewed once the pending changes are written', async () => {
      const { operations, onDocumentChanged, viewed } = setup({ pageNumber: 1 })
      const done = operations.deletePage(3)
      // Scrolled to the deleted page in the meantime.
      viewed.pageNumber = 3
      await done
      expect(onDocumentChanged).toHaveBeenCalledWith(expect.any(ArrayBuffer), 2, expect.any(Array))
    })

    it('focuses the page that takes the place of the deleted one with the keyboard', async () => {
      const { operations } = setup({ pageNumber: 3 })
      const done = operations.deletePage(1, true)
      expect(unref(operations.lastAction)).toEqual({ pageNumber: 1, focusTarget: 'page' })
      await done
    })
  })

  describe('movePage', () => {
    it('reorders the pages and follows the moved page', async () => {
      const { operations, extractPages, onDocumentChanged } = setup()
      await operations.movePage(1, 2)
      expect(extractPages).toHaveBeenCalledWith([{ document: null, pageIndices: [1, 0, 2] }])
      expect(onDocumentChanged).toHaveBeenCalledWith(expect.any(ArrayBuffer), 2, [2, 1, 3])
    })
  })

  // They are outside of PDF.js' undo, which goes first.
  it('undoes and redoes page changes after the edits of PDF.js', async () => {
    const { operations, onDocumentChanged, content, edits } = setup()
    const original = content.value
    expect(operations.undoStates.value.hasSomethingToUndo).toBe(false)
    await operations.deletePage(1)
    const changed = content.value
    edits.states.value = { ...edits.states.value, hasSomethingToUndo: true }
    await operations.undo()
    expect(edits.undo).toHaveBeenCalled()
    edits.states.value = { ...edits.states.value, hasSomethingToUndo: false }
    expect(operations.undoStates.value.hasSomethingToUndo).toBe(true)
    await operations.undo()
    // The deleted first page is new again, the others move back.
    expect(onDocumentChanged).toHaveBeenLastCalledWith(original, 2, [undefined, 1, 2])
    expect(operations.undoStates.value).toMatchObject({
      hasSomethingToUndo: false,
      hasSomethingToRedo: true
    })
    await operations.redo()
    expect(onDocumentChanged).toHaveBeenLastCalledWith(changed, 2, expect.any(Array))
    await operations.undo()
    // A new edit makes redoing the page change pointless.
    edits.states.value = { ...edits.states.value, hasSomethingToUndo: true }
    await nextTick()
    expect(operations.undoStates.value.hasSomethingToRedo).toBe(false)
  })

  describe("form values, which are outside of PDF.js' undo", () => {
    function typeInto(layerClass: string) {
      const layer = document.createElement('div')
      layer.className = layerClass
      const input = layer.appendChild(document.createElement('input'))
      document.body.appendChild(layer)
      input.dispatchEvent(new Event('input', { bubbles: true }))
      layer.remove()
    }

    it('end the page undo instead of getting lost', async () => {
      const { operations } = setup()
      await operations.deletePage(1)
      typeInto('annotationLayer')
      expect(operations.undoStates.value.hasSomethingToUndo).toBe(false)
    })

    it('are not the annotations of PDF.js, which it undoes itself', async () => {
      const { operations } = setup()
      await operations.deletePage(1)
      typeInto('annotationEditorLayer')
      expect(operations.undoStates.value.hasSomethingToUndo).toBe(true)
    })
  })

  it('keeps only as many steps as fit into memory, at least one', async () => {
    function largeContent() {
      return mock<ArrayBuffer>({ byteLength: 150_000_000 })
    }
    const { operations, content, extractPages, onDocumentChanged } = setup()
    content.value = largeContent()
    extractPages.mockImplementation(() => {
      const extracted = mock<Uint8Array>()
      const copy = mock<Uint8Array<ArrayBuffer>>()
      Object.defineProperty(copy, 'buffer', { value: largeContent() })
      extracted.slice.mockReturnValue(copy)
      return Promise.resolve(extracted)
    })
    await operations.deletePage(1)
    const afterFirst = content.value
    await operations.deletePage(1)
    await operations.undo()
    expect(onDocumentChanged).toHaveBeenLastCalledWith(afterFirst, 2, expect.any(Array))
    expect(operations.undoStates.value).toMatchObject({
      hasSomethingToUndo: false,
      hasSomethingToRedo: true
    })
  })

  it('keeps fewer steps on touch devices, they have far less memory for a tab', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(pointer: coarse)' }))
    function content60mb() {
      return mock<ArrayBuffer>({ byteLength: 60_000_000 })
    }
    const { operations, content, extractPages } = setup()
    content.value = content60mb()
    extractPages.mockImplementation(() => {
      const extracted = mock<Uint8Array>()
      const copy = mock<Uint8Array<ArrayBuffer>>()
      Object.defineProperty(copy, 'buffer', { value: content60mb() })
      extracted.slice.mockReturnValue(copy)
      return Promise.resolve(extracted)
    })
    // 60 MB per step: on a desktop three fit, on a phone one.
    await operations.deletePage(1)
    await operations.deletePage(1)
    await operations.undo()
    expect(operations.undoStates.value.hasSomethingToUndo).toBe(false)
    vi.unstubAllGlobals()
  })

  it('tells the new thumbnails what to focus after a keyboard action', async () => {
    const { operations } = setup()
    const moving = operations.movePage(1, 2, true)
    expect(operations.lastAction.value).toEqual({ pageNumber: 2, focusTarget: 'page-actions' })
    await moving
    expect(operations.lastAction.value).toBeUndefined()
    operations.deletePage(2)
    expect(operations.lastAction.value).toBeUndefined()
  })

  it.each([
    ['an error', (extractPages: Mock) => extractPages.mockRejectedValueOnce(new Error('broken'))],
    // PDF.js' worker reports extraction errors as an empty result.
    ['an empty result', (extractPages: Mock) => extractPages.mockResolvedValueOnce(null)]
  ])('reports %s of the extraction and unlocks again', async (_, fail) => {
    const { operations, extractPages, onDocumentChanged, showErrorMessage } = setup()
    fail(extractPages)
    await operations.deletePage(1)
    expect(showErrorMessage).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Deleting the page failed' })
    )
    expect(onDocumentChanged).not.toHaveBeenCalled()
    expect(operations.isProcessing.value).toBe(false)
  })

  it('writes pending changes before rebuilding the document', async () => {
    const { operations, extractPages, beforeChange } = setup()
    await operations.deletePage(1)
    expect(beforeChange.mock.invocationCallOrder[0]).toBeLessThan(
      extractPages.mock.invocationCallOrder[0]
    )
  })

  it('runs one operation at a time', async () => {
    const { operations, extractPages } = setup()
    await Promise.all([operations.deletePage(1), operations.deletePage(2)])
    expect(extractPages).toHaveBeenCalledTimes(1)
    expect(operations.isProcessing.value).toBe(false)
  })
})
