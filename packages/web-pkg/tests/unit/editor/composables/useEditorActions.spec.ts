import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import type { Editor, Range } from '@tiptap/core'
import { createMockEditor } from './helpers'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

import { useEditorActions } from '../../../../src/editor/composables/useEditorActions'
import type { TextEditorState } from '../../../../src/editor/types'

function createState(): TextEditorState {
  return { sourceMode: ref(false) }
}

const mockRange: Range = { from: 0, to: 5 }

describe('useEditorActions', () => {
  let state: TextEditorState
  let actions: ReturnType<typeof useEditorActions>

  beforeEach(() => {
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
    const blockActions = [
      { name: 'heading1', markName: 'heading', markAttrs: { level: 1 } },
      { name: 'heading2', markName: 'heading', markAttrs: { level: 2 } },
      { name: 'heading3', markName: 'heading', markAttrs: { level: 3 } },
      { name: 'blockquote', markName: 'blockquote' },
      { name: 'codeBlock', markName: 'codeBlock' }
    ] as const

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

  describe('image', () => {
    it('toolbarAction calls onRequestImageUrl with editor', () => {
      const onRequestImageUrl = vi.fn()
      const actionsWithOpts = useEditorActions(state, { onRequestImageUrl })
      const editor = createMockEditor()
      actionsWithOpts.image().toolbarAction!(editor)
      expect(onRequestImageUrl).toHaveBeenCalledWith(editor)
    })

    it('toolbarAction is a no-op when onRequestImageUrl is undefined', () => {
      const editor = createMockEditor()
      expect(() => actions.image().toolbarAction!(editor)).not.toThrow()
    })

    it('isActive always returns false', () => {
      const editor = createMockEditor()
      expect(actions.image().isActive!(editor)).toBe(false)
    })

    it('is hidden from slash commands', () => {
      expect(actions.image().showInSlashCommands).toBe(false)
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
