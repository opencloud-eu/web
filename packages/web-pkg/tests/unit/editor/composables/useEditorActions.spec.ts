import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import type { Range } from '@tiptap/core'
import { createMockEditor } from './helpers'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

import { useEditorActions } from '../../../../src/editor/composables/useEditorActions'
import type { TextEditorState } from '../../../../src/editor/types'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import { useModals } from '../../../../src/composables/piniaStores'

function createState(): TextEditorState {
  return { sourceMode: ref(false) }
}

const mockRange: Range = { from: 0, to: 5 }

describe('useEditorActions', () => {
  let state: TextEditorState
  let actions: ReturnType<typeof useEditorActions>

  beforeEach(() => {
    createTestingPinia({ stubActions: false })
    state = createState()
    actions = useEditorActions(state)
  })

  describe('history', () => {
    it('undo: toolbarAction calls editor undo chain', () => {
      const editor = createMockEditor()
      actions.undo().toolbarAction!(editor)
      expect(editor.chain).toHaveBeenCalled()
      expect(editor._chain.focus).toHaveBeenCalled()
      expect(editor._chain.undo).toHaveBeenCalled()
      expect(editor._chain.run).toHaveBeenCalled()
    })

    it('undo: isEnabled delegates to editor.can().undo()', () => {
      const editor = createMockEditor({ canUndo: true })
      expect(actions.undo().isEnabled!(editor)).toBe(true)
    })

    it('undo: isEnabled returns false when cannot undo', () => {
      const editor = createMockEditor({ canUndo: false })
      expect(actions.undo().isEnabled!(editor)).toBe(false)
    })

    it('redo: toolbarAction calls editor redo chain', () => {
      const editor = createMockEditor()
      actions.redo().toolbarAction!(editor)
      expect(editor._chain.redo).toHaveBeenCalled()
    })

    it('redo: isEnabled delegates to editor.can().redo()', () => {
      const editor = createMockEditor({ canRedo: true })
      expect(actions.redo().isEnabled!(editor)).toBe(true)
    })

    it('undo and redo are hidden from slash commands', () => {
      expect(actions.undo().showInSlashCommands).toBe(false)
      expect(actions.redo().showInSlashCommands).toBe(false)
    })
  })

  describe('toggleSourceMode', () => {
    it('toolbarAction toggles state.sourceMode', () => {
      const editor = createMockEditor()
      expect(state.sourceMode.value).toBe(false)
      actions.toggleSourceMode().toolbarAction!(editor)
      expect(state.sourceMode.value).toBe(true)
      actions.toggleSourceMode().toolbarAction!(editor)
      expect(state.sourceMode.value).toBe(false)
    })

    it('isActive returns current sourceMode value', () => {
      const editor = createMockEditor()
      expect(actions.toggleSourceMode().isActive!(editor)).toBe(false)
      state.sourceMode.value = true
      expect(actions.toggleSourceMode().isActive!(editor)).toBe(true)
    })

    it('is hidden from slash commands', () => {
      expect(actions.toggleSourceMode().showInSlashCommands).toBe(false)
    })
  })

  describe('text formatting', () => {
    const formattingActions = [
      { name: 'bold', toggleMethod: 'toggleBold', markName: 'bold' },
      { name: 'italic', toggleMethod: 'toggleItalic', markName: 'italic' },
      { name: 'underline', toggleMethod: 'toggleUnderline', markName: 'underline' },
      { name: 'strikethrough', toggleMethod: 'toggleStrike', markName: 'strike' },
      { name: 'codeInline', toggleMethod: 'toggleCode', markName: 'code' }
    ] as const

    for (const { name, toggleMethod, markName } of formattingActions) {
      describe(name, () => {
        it('toolbarAction calls the correct toggle command', () => {
          const editor = createMockEditor()
          actions[name]().toolbarAction!(editor)
          expect(editor._chain[toggleMethod]).toHaveBeenCalled()
          expect(editor._chain.run).toHaveBeenCalled()
        })

        it('slashCommandAction deletes range then toggles', () => {
          const editor = createMockEditor()
          actions[name]().slashCommandAction!({ editor, range: mockRange })
          expect(editor._chain.deleteRange).toHaveBeenCalledWith(mockRange)
          expect(editor._chain[toggleMethod]).toHaveBeenCalled()
        })

        it('isActive checks the correct mark name', () => {
          const editor = createMockEditor({ isActive: (type) => type === markName })
          expect(actions[name]().isActive!(editor)).toBe(true)
        })
      })
    }
  })

  describe('dropdowns', () => {
    const dropdownActions = [
      { name: 'fontSize', setMethod: 'setFontSize', attrKey: 'fontSize' },
      { name: 'fontFamily', setMethod: 'setFontFamily', attrKey: 'fontFamily' },
      { name: 'lineHeight', setMethod: 'setLineHeight', attrKey: 'lineHeight' },
      { name: 'textColor', setMethod: 'setColor', attrKey: 'color' },
      { name: 'backgroundColor', setMethod: 'setBackgroundColor', attrKey: 'backgroundColor' }
    ] as const

    for (const { name, setMethod, attrKey } of dropdownActions) {
      describe(name, () => {
        it('is a dropdown with non-empty options', () => {
          const action = actions[name]()
          expect(action.isDropdown).toBe(true)
          expect(action.dropdownOptions!.length).toBeGreaterThan(0)
        })

        it('currentValue reads from editor.getAttributes("textStyle")', () => {
          const editor = createMockEditor({
            attributes: { textStyle: { [attrKey]: 'test-value' } }
          })
          expect(actions[name]().currentValue!(editor)).toBe('test-value')
          expect(editor.getAttributes).toHaveBeenCalledWith('textStyle')
        })

        it('toolbarAction passes value to the set command', () => {
          const editor = createMockEditor()
          actions[name]().toolbarAction!(editor, 'my-value')
          expect(editor._chain[setMethod]).toHaveBeenCalledWith('my-value')
        })

        it('is hidden from slash commands', () => {
          expect(actions[name]().showInSlashCommands).toBe(false)
        })
      })
    }
  })

  describe('block actions', () => {
    const blockActions: ReadonlyArray<{
      name: 'heading1' | 'heading2' | 'heading3' | 'blockquote' | 'codeBlock'
      markName: string
      markAttrs?: Record<string, unknown>
    }> = [
      { name: 'heading1', markName: 'heading', markAttrs: { level: 1 } },
      { name: 'heading2', markName: 'heading', markAttrs: { level: 2 } },
      { name: 'heading3', markName: 'heading', markAttrs: { level: 3 } },
      { name: 'blockquote', markName: 'blockquote' },
      { name: 'codeBlock', markName: 'codeBlock' }
    ]

    for (const { name, markName, markAttrs } of blockActions) {
      describe(name, () => {
        it('slashCommandAction deletes range then sets node', () => {
          const editor = createMockEditor()
          actions[name]().slashCommandAction!({ editor, range: mockRange })
          expect(editor._chain.deleteRange).toHaveBeenCalledWith(mockRange)
          expect(editor._chain.run).toHaveBeenCalled()
        })

        it('isActive checks the correct node type', () => {
          const editor = createMockEditor({
            isActive: (type, attrs) => {
              if (type !== markName) {
                return false
              }
              if (markAttrs) {
                return JSON.stringify(attrs) === JSON.stringify(markAttrs)
              }
              return true
            }
          })
          expect(actions[name]().isActive!(editor)).toBe(true)
        })
      })
    }

    it('paragraph: slashCommandAction deletes range then sets paragraph node', () => {
      const editor = createMockEditor()
      actions.paragraph().slashCommandAction!({ editor, range: mockRange })
      expect(editor._chain.deleteRange).toHaveBeenCalledWith(mockRange)
      expect(editor._chain.setNode).toHaveBeenCalledWith('paragraph')
    })

    it('paragraph: is hidden from toolbar', () => {
      expect(actions.paragraph().showInToolbar).toBe(false)
    })

    it('horizontalRule: isActive always returns false', () => {
      const editor = createMockEditor()
      expect(actions.horizontalRule().isActive!(editor)).toBe(false)
    })
  })

  describe('list actions', () => {
    const listActions = [
      { name: 'bulletList', toggleMethod: 'toggleBulletList', markName: 'bulletList' },
      { name: 'orderedList', toggleMethod: 'toggleOrderedList', markName: 'orderedList' },
      { name: 'taskList', toggleMethod: 'toggleTaskList', markName: 'taskList' }
    ] as const

    for (const { name, toggleMethod, markName } of listActions) {
      describe(name, () => {
        it('toolbarAction toggles the correct list type', () => {
          const editor = createMockEditor()
          actions[name]().toolbarAction!(editor)
          expect(editor._chain[toggleMethod]).toHaveBeenCalled()
        })

        it('slashCommandAction deletes range then toggles', () => {
          const editor = createMockEditor()
          actions[name]().slashCommandAction!({ editor, range: mockRange })
          expect(editor._chain.deleteRange).toHaveBeenCalledWith(mockRange)
          expect(editor._chain[toggleMethod]).toHaveBeenCalled()
        })

        it('isActive checks the correct list type', () => {
          const editor = createMockEditor({ isActive: (type) => type === markName })
          expect(actions[name]().isActive!(editor)).toBe(true)
        })
      })
    }
  })

  describe('link', () => {
    it('toolbarAction calls onRequestLinkUrl with editor and current href', () => {
      const onRequestLinkUrl = vi.fn()
      const actionsWithOpts = useEditorActions(state, { onRequestLinkUrl })
      const editor = createMockEditor({
        attributes: { link: { href: 'https://example.com' } }
      })
      actionsWithOpts.link().toolbarAction!(editor)
      expect(onRequestLinkUrl).toHaveBeenCalledWith(editor, 'https://example.com')
    })

    it('toolbarAction is a no-op when onRequestLinkUrl is undefined', () => {
      const editor = createMockEditor()
      expect(() => actions.link().toolbarAction!(editor)).not.toThrow()
    })

    it('isActive checks link mark', () => {
      const editor = createMockEditor({ isActive: (type) => type === 'link' })
      expect(actions.link().isActive!(editor)).toBe(true)
    })

    it('is hidden from slash commands', () => {
      expect(actions.link().showInSlashCommands).toBe(false)
    })
  })

  describe('table', () => {
    it('toolbarAction inserts 3x3 table with header row', () => {
      const editor = createMockEditor()
      actions.table().toolbarAction!(editor)
      expect(editor._chain.insertTable).toHaveBeenCalledWith({
        rows: 3,
        cols: 3,
        withHeaderRow: true
      })
    })

    it('slashCommandAction deletes range then inserts table', () => {
      const editor = createMockEditor()
      actions.table().slashCommandAction!({ editor, range: mockRange })
      expect(editor._chain.deleteRange).toHaveBeenCalledWith(mockRange)
      expect(editor._chain.insertTable).toHaveBeenCalledWith({
        rows: 3,
        cols: 3,
        withHeaderRow: true
      })
    })
  })

  describe('table manipulation', () => {
    const tableAddActions = [
      { name: 'addRowBefore', chainMethod: 'addRowBefore' },
      { name: 'addRowAfter', chainMethod: 'addRowAfter' },
      { name: 'addColumnBefore', chainMethod: 'addColumnBefore' },
      { name: 'addColumnAfter', chainMethod: 'addColumnAfter' }
    ] as const

    for (const { name, chainMethod } of tableAddActions) {
      it(`${name}: isEnabled returns editor.isActive('table')`, () => {
        const inTable = createMockEditor({ isActive: (type) => type === 'table' })
        const notInTable = createMockEditor()
        expect(actions[name]().isEnabled!(inTable)).toBe(true)
        expect(actions[name]().isEnabled!(notInTable)).toBe(false)
      })

      it(`${name}: toolbarAction calls ${chainMethod}`, () => {
        const editor = createMockEditor()
        actions[name]().toolbarAction!(editor)
        expect(editor._chain[chainMethod]).toHaveBeenCalled()
      })
    }

    describe('deleteRow', () => {
      it('does not fall back to deleteTable when deleteRow succeeds', () => {
        const editor = createMockEditor({ runResult: true })
        actions.deleteRow().toolbarAction!(editor)
        expect(editor._chain.deleteRow).toHaveBeenCalled()
        expect(editor._chain.deleteTable).not.toHaveBeenCalled()
      })

      it('falls back to deleteTable when deleteRow fails and cursor is in table', () => {
        const editor = createMockEditor({
          runResult: false,
          isActive: (type) => type === 'table'
        })
        actions.deleteRow().toolbarAction!(editor)
        expect(editor._chain.deleteTable).toHaveBeenCalled()
      })

      it('does not fall back when deleteRow fails but cursor is not in table', () => {
        const editor = createMockEditor({ runResult: false })
        actions.deleteRow().toolbarAction!(editor)
        expect(editor._chain.deleteTable).not.toHaveBeenCalled()
      })

      it('slashCommandAction deletes range and falls back correctly', () => {
        const editor = createMockEditor({
          runResult: false,
          isActive: (type) => type === 'table'
        })
        actions.deleteRow().slashCommandAction!({ editor, range: mockRange })
        expect(editor._chain.deleteRange).toHaveBeenCalledWith(mockRange)
        expect(editor._chain.deleteTable).toHaveBeenCalled()
      })
    })

    describe('deleteColumn', () => {
      it('does not fall back to deleteTable when deleteColumn succeeds', () => {
        const editor = createMockEditor({ runResult: true })
        actions.deleteColumn().toolbarAction!(editor)
        expect(editor._chain.deleteColumn).toHaveBeenCalled()
        expect(editor._chain.deleteTable).not.toHaveBeenCalled()
      })

      it('falls back to deleteTable when deleteColumn fails and cursor is in table', () => {
        const editor = createMockEditor({
          runResult: false,
          isActive: (type) => type === 'table'
        })
        actions.deleteColumn().toolbarAction!(editor)
        expect(editor._chain.deleteTable).toHaveBeenCalled()
      })

      it('slashCommandAction deletes range and falls back correctly', () => {
        const editor = createMockEditor({
          runResult: false,
          isActive: (type) => type === 'table'
        })
        actions.deleteColumn().slashCommandAction!({ editor, range: mockRange })
        expect(editor._chain.deleteRange).toHaveBeenCalledWith(mockRange)
        expect(editor._chain.deleteTable).toHaveBeenCalled()
      })
    })
  })

  describe('imageUrl', () => {
    it('toolbarAction dispatches a modal with input', () => {
      const editor = createMockEditor()
      actions.image().toolbarAction!(editor, 'url')
      const { dispatchModal } = useModals()
      expect(dispatchModal).toHaveBeenCalledWith(
        expect.objectContaining({
          hasInput: true,
          inputLabel: 'Image URL',
          confirmText: 'Insert'
        })
      )
    })

    it('toolbarAction onConfirm inserts image when a valid https URL is entered', () => {
      const editor = createMockEditor()
      actions.image().toolbarAction!(editor, 'url')
      const store = useModals()
      const modal = store.modals[0]
      modal.onConfirm('https://example.com/photo.png')
      expect(editor._chain.setImage).toHaveBeenCalledWith({ src: 'https://example.com/photo.png' })
    })

    it('toolbarAction onConfirm inserts image when a valid http URL is entered', () => {
      const editor = createMockEditor()
      actions.image().toolbarAction!(editor, 'url')
      const store = useModals()
      const modal = store.modals[0]
      modal.onConfirm('http://example.com/photo.png')
      expect(editor._chain.setImage).toHaveBeenCalledWith({ src: 'http://example.com/photo.png' })
    })

    it('toolbarAction onConfirm trims whitespace from URL', () => {
      const editor = createMockEditor()
      actions.image().toolbarAction!(editor, 'url')
      const store = useModals()
      const modal = store.modals[0]
      modal.onConfirm('  https://example.com/photo.png  ')
      expect(editor._chain.setImage).toHaveBeenCalledWith({ src: 'https://example.com/photo.png' })
    })

    it('toolbarAction onConfirm does nothing when URL is empty', () => {
      const editor = createMockEditor()
      actions.image().toolbarAction!(editor, 'url')
      const store = useModals()
      const modal = store.modals[0]
      modal.onConfirm('   ')
      expect(editor._chain.setImage).not.toHaveBeenCalled()
    })

    it('toolbarAction onConfirm rejects URLs without http(s) protocol', () => {
      const editor = createMockEditor()
      actions.image().toolbarAction!(editor, 'url')
      const store = useModals()
      const modal = store.modals[0]
      modal.onConfirm('javascript:alert(1)')
      expect(editor._chain.setImage).not.toHaveBeenCalled()
    })

    it('toolbarAction onInput sets error for invalid protocol', () => {
      const editor = createMockEditor()
      actions.image().toolbarAction!(editor, 'url')
      const store = useModals()
      const modal = store.modals[0]
      const setError = vi.fn()
      modal.onInput('example.com/photo.png', setError)
      expect(setError).toHaveBeenCalledWith('URL must start with http:// or https://')
    })

    it('toolbarAction onInput clears error for valid URL', () => {
      const editor = createMockEditor()
      actions.image().toolbarAction!(editor, 'url')
      const store = useModals()
      const modal = store.modals[0]
      const setError = vi.fn()
      modal.onInput('https://example.com/photo.png', setError)
      expect(setError).toHaveBeenCalledWith(null)
    })

    it('slashCommandAction onConfirm deletes range and inserts image for valid URL', () => {
      const editor = createMockEditor()
      actions.imageUrl().slashCommandAction!({ editor, range: mockRange })
      const store = useModals()
      const modal = store.modals[0]
      modal.onConfirm('https://example.com/photo.png')
      expect(editor._chain.deleteRange).toHaveBeenCalledWith(mockRange)
      expect(editor._chain.setImage).toHaveBeenCalledWith({ src: 'https://example.com/photo.png' })
    })

    it('slashCommandAction onConfirm does nothing for invalid URL', () => {
      const editor = createMockEditor()
      actions.imageUrl().slashCommandAction!({ editor, range: mockRange })
      const store = useModals()
      const modal = store.modals[0]
      modal.onConfirm('ftp://example.com/photo.png')
      expect(editor._chain.setImage).not.toHaveBeenCalled()
    })

    it('isActive always returns false', () => {
      const editor = createMockEditor()
      expect(actions.imageUrl().isActive!(editor)).toBe(false)
    })
  })

  describe('imageUpload', () => {
    let createElementSpy: ReturnType<typeof vi.spyOn>
    let mockInput: {
      type: string
      accept: string
      click: ReturnType<typeof vi.fn>
      addEventListener: ReturnType<typeof vi.fn>
      files: File[] | null
    }

    beforeEach(() => {
      mockInput = {
        type: '',
        accept: '',
        click: vi.fn(),
        addEventListener: vi.fn(),
        files: null
      }
      createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'input') {
          return mockInput as unknown as HTMLElement
        }
        return document.createElement(tag)
      })
    })

    afterEach(() => {
      createElementSpy.mockRestore()
    })

    it('toolbarAction creates a file input with image accept type', () => {
      const editor = createMockEditor()
      actions.image().toolbarAction!(editor, 'file')
      expect(mockInput.type).toBe('file')
      expect(mockInput.accept).toBe('image/*')
      expect(mockInput.click).toHaveBeenCalled()
    })

    it('toolbarAction inserts base64 data URL for valid image file', () => {
      const editor = createMockEditor()
      const fakeDataUrl = 'data:image/png;base64,iVBORw0KGgo='

      let loadHandler: (() => void) | undefined
      const mockReaderInstance = {
        result: fakeDataUrl,
        readAsDataURL: vi.fn(),
        addEventListener: vi.fn((event: string, handler: () => void) => {
          if (event === 'load') {
            loadHandler = handler
          }
        })
      }

      vi.spyOn(globalThis, 'FileReader').mockImplementation(function (this: unknown) {
        Object.assign(this as object, mockReaderInstance)
      } as unknown as () => FileReader)

      actions.image().toolbarAction!(editor, 'file')

      const changeHandler = mockInput.addEventListener.mock.calls.find(
        (call: unknown[]) => call[0] === 'change'
      )![1] as () => void

      const file = new File(['fake'], 'photo.png', { type: 'image/png' })
      Object.defineProperty(file, 'size', { value: 1024 })
      mockInput.files = [file]

      changeHandler()

      expect(mockReaderInstance.readAsDataURL).toHaveBeenCalledWith(file)
      loadHandler!()

      expect(editor._chain.setImage).toHaveBeenCalledWith({ src: fakeDataUrl })
    })

    it('toolbarAction rejects files that are not images', () => {
      const editor = createMockEditor()

      const mockReaderInstance = { readAsDataURL: vi.fn(), addEventListener: vi.fn() }
      vi.spyOn(globalThis, 'FileReader').mockImplementation(function (this: unknown) {
        Object.assign(this as object, mockReaderInstance)
      } as unknown as () => FileReader)

      actions.image().toolbarAction!(editor, 'file')

      const changeHandler = mockInput.addEventListener.mock.calls.find(
        (call: unknown[]) => call[0] === 'change'
      )![1] as () => void

      const file = new File(['fake'], 'script.js', { type: 'application/javascript' })
      mockInput.files = [file]

      changeHandler()

      expect(mockReaderInstance.readAsDataURL).not.toHaveBeenCalled()
    })

    it('toolbarAction rejects files exceeding 5 MB', () => {
      const editor = createMockEditor()

      const mockReaderInstance = { readAsDataURL: vi.fn(), addEventListener: vi.fn() }
      vi.spyOn(globalThis, 'FileReader').mockImplementation(function (this: unknown) {
        Object.assign(this as object, mockReaderInstance)
      } as unknown as () => FileReader)

      actions.image().toolbarAction!(editor, 'file')

      const changeHandler = mockInput.addEventListener.mock.calls.find(
        (call: unknown[]) => call[0] === 'change'
      )![1] as () => void

      const file = new File(['fake'], 'huge.png', { type: 'image/png' })
      Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 })
      mockInput.files = [file]

      changeHandler()

      expect(mockReaderInstance.readAsDataURL).not.toHaveBeenCalled()
    })

    it('toolbarAction does nothing when no file is selected', () => {
      const editor = createMockEditor()

      actions.image().toolbarAction!(editor, 'file')

      const changeHandler = mockInput.addEventListener.mock.calls.find(
        (call: unknown[]) => call[0] === 'change'
      )![1] as () => void

      mockInput.files = []

      changeHandler()

      expect(editor._chain.setImage).not.toHaveBeenCalled()
    })

    it('slashCommandAction deletes range then opens file picker', () => {
      const editor = createMockEditor()
      actions.imageUpload().slashCommandAction!({ editor, range: mockRange })
      expect(editor._chain.deleteRange).toHaveBeenCalledWith(mockRange)
      expect(mockInput.click).toHaveBeenCalled()
    })

    it('isActive always returns false', () => {
      const editor = createMockEditor()
      expect(actions.imageUpload().isActive!(editor)).toBe(false)
    })
  })

  describe('action metadata', () => {
    it('all actions have id, title, and icon', () => {
      for (const [key, factory] of Object.entries(actions)) {
        const action = (factory as () => { id: string; title: string; icon: string })()
        expect(action.id, `${key} missing id`).toBeTruthy()
        expect(action.title, `${key} missing title`).toBeTruthy()
        expect(action.icon, `${key} missing icon`).toBeTruthy()
      }
    })
  })
})
