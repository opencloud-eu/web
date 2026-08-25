import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import type { Range } from '@tiptap/core'
import { Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { mock } from 'vitest-mock-extended'
import { createMockEditor } from './helpers'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

import { useEditorActions } from '../../../../src/editor/composables/useEditorActions'
import type { TextEditorLinkPanelRequest, TextEditorState } from '../../../../src/editor/types'
import type { Resource } from '@opencloud-eu/web-client'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import { useModals } from '../../../../src/composables/piniaStores'
import { createLinkExtension } from '../../../../src/editor/extensions/link'

function createState(): TextEditorState {
  return {
    sourceMode: ref(false),
    linkPanel: ref<TextEditorLinkPanelRequest | null>(null),
    editorZoom: ref(100),
    currentResource: ref<Resource | null>(mock<Resource>({ id: 'resource', path: '/' }))
  }
}

function createLinkEditor(content: string): Editor {
  return new Editor({
    extensions: [StarterKit.configure({ link: false }), createLinkExtension()],
    content
  })
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

  describe('zoom actions', () => {
    it('zoomIn increases zoom in 10% steps and caps at 200%', () => {
      const editor = createMockEditor()
      actions.zoomIn().toolbarAction!(editor)
      expect(state.editorZoom.value).toBe(110)

      state.editorZoom.value = 200
      actions.zoomIn().toolbarAction!(editor)
      expect(state.editorZoom.value).toBe(200)
    })

    it('zoomOut decreases zoom in 10% steps and floors at 50%', () => {
      const editor = createMockEditor()
      actions.zoomOut().toolbarAction!(editor)
      expect(state.editorZoom.value).toBe(90)

      state.editorZoom.value = 50
      actions.zoomOut().toolbarAction!(editor)
      expect(state.editorZoom.value).toBe(50)
    })

    it('zoomReset restores 100%', () => {
      const editor = createMockEditor()
      state.editorZoom.value = 140
      actions.zoomReset().toolbarAction!(editor)
      expect(state.editorZoom.value).toBe(100)
    })

    it('zoom action enabled states reflect current zoom', () => {
      const editor = createMockEditor()
      state.editorZoom.value = 100
      expect(actions.zoomIn().isEnabled!(editor)).toBe(true)
      expect(actions.zoomOut().isEnabled!(editor)).toBe(true)
      expect(actions.zoomReset().isEnabled!(editor)).toBe(false)

      state.editorZoom.value = 200
      expect(actions.zoomIn().isEnabled!(editor)).toBe(false)
      state.editorZoom.value = 50
      expect(actions.zoomOut().isEnabled!(editor)).toBe(false)
      state.editorZoom.value = 120
      expect(actions.zoomReset().isEnabled!(editor)).toBe(true)
    })
  })

  describe('text formatting', () => {
    const inlineActions = [
      { name: 'bold', toggleMethod: 'toggleBold', markName: 'bold' },
      { name: 'italic', toggleMethod: 'toggleItalic', markName: 'italic' },
      { name: 'underline', toggleMethod: 'toggleUnderline', markName: 'underline' },
      { name: 'strikethrough', toggleMethod: 'toggleStrike', markName: 'strike' },
      { name: 'subscript', toggleMethod: 'toggleSubscript', markName: 'subscript' },
      { name: 'superscript', toggleMethod: 'toggleSuperscript', markName: 'superscript' },
      { name: 'codeInline', toggleMethod: 'toggleCode', markName: 'code' }
    ] as const

    for (const { name, toggleMethod, markName } of inlineActions) {
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

    const dropdownActions = [
      { name: 'fontSize', setMethod: 'setFontSize', attrKey: 'fontSize', valueIsTitle: true },
      { name: 'lineHeight', setMethod: 'setLineHeight', attrKey: 'lineHeight', valueIsTitle: true },
      { name: 'textColor', setMethod: 'setColor', attrKey: 'color', valueIsTitle: false },
      {
        name: 'backgroundColor',
        setMethod: 'setBackgroundColor',
        attrKey: 'backgroundColor',
        valueIsTitle: false
      }
    ] as const

    for (const { name, setMethod, attrKey, valueIsTitle } of dropdownActions) {
      describe(name, () => {
        it('has non-empty childActions', () => {
          const action = actions[name]()
          expect(action.childActions!.length).toBeGreaterThan(0)
        })

        if (valueIsTitle) {
          it('child isActive reads from editor.getAttributes("textStyle")', () => {
            const child = actions[name]().childActions![0]
            const editor = createMockEditor({
              attributes: { textStyle: { [attrKey]: child.title } }
            })
            expect(child.isActive!(editor)).toBe(true)
          })
        }

        it('child toolbarAction passes value to the set command', () => {
          const editor = createMockEditor()
          const childAction =
            name === 'textColor'
              ? actions[name]().childActions!.find(({ id }) => id !== 'text-color-default')!
              : name === 'backgroundColor'
                ? actions[name]().childActions!.find(
                    ({ id }) => id !== 'background-color-transparent'
                  )!
                : actions[name]().childActions![0]
          childAction.toolbarAction!(editor)
          expect(editor._chain[setMethod]).toHaveBeenCalled()
        })

        it('is hidden from slash commands', () => {
          expect(actions[name]().showInSlashCommands).toBe(false)
        })
      })
    }

    it('textColor has a default entry that resets color', () => {
      const editor = createMockEditor()
      const action = actions.textColor()
      const defaultAction = action.childActions!.find(({ id }) => id === 'text-color-default')

      expect(defaultAction).toBeDefined()
      defaultAction!.toolbarAction!(editor)
      expect(editor._chain.unsetColor).toHaveBeenCalled()
      expect(defaultAction!.isActive!(createMockEditor({ attributes: { textStyle: {} } }))).toBe(
        true
      )
      expect(
        defaultAction!.isActive!(
          createMockEditor({ attributes: { textStyle: { color: '#e60000' } } })
        )
      ).toBe(false)
    })

    it('backgroundColor none entry resets background color', () => {
      const editor = createMockEditor()
      const noneAction = actions
        .backgroundColor()
        .childActions!.find(({ id }) => id === 'background-color-transparent')

      expect(noneAction).toBeDefined()
      noneAction!.toolbarAction!(editor)
      expect(editor._chain.unsetBackgroundColor).toHaveBeenCalled()
      expect(noneAction!.isActive!(createMockEditor({ attributes: { textStyle: {} } }))).toBe(true)
      expect(
        noneAction!.isActive!(
          createMockEditor({ attributes: { textStyle: { backgroundColor: '#e60000' } } })
        )
      ).toBe(false)
    })
  })

  describe('heading', () => {
    const getParagraphAction = () => {
      return actions.heading().childActions!.find(({ id }) => id === 'paragraph')!
    }

    describe('paragraph', () => {
      it('toolbarAction sets paragraph', () => {
        const editor = createMockEditor()
        getParagraphAction().toolbarAction!(editor)
        expect(editor._chain.setParagraph).toHaveBeenCalled()
        expect(editor._chain.run).toHaveBeenCalled()
      })

      it('slashCommandAction deletes range then sets paragraph node', () => {
        const editor = createMockEditor()
        getParagraphAction().slashCommandAction!({ editor, range: mockRange })
        expect(editor._chain.deleteRange).toHaveBeenCalledWith(mockRange)
        expect(editor._chain.setNode).toHaveBeenCalledWith('paragraph')
        expect(editor._chain.run).toHaveBeenCalled()
      })
    })

    const blockActions: ReadonlyArray<{
      name: 'heading1' | 'heading2' | 'heading3' | 'heading4'
      markName: string
      markAttrs?: Record<string, unknown>
    }> = [
      { name: 'heading1', markName: 'heading', markAttrs: { level: 1 } },
      { name: 'heading2', markName: 'heading', markAttrs: { level: 2 } },
      { name: 'heading3', markName: 'heading', markAttrs: { level: 3 } },
      { name: 'heading4', markName: 'heading', markAttrs: { level: 4 } }
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
  })

  describe('block actions', () => {
    const blockActions: ReadonlyArray<{
      name: 'blockquote' | 'codeBlock'
      markName: string
      markAttrs?: Record<string, unknown>
    }> = [
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
  })

  describe('horizontalRule', () => {
    it('isActive always returns false', () => {
      const editor = createMockEditor()
      expect(actions.horizontalRule().isActive!(editor)).toBe(false)
    })
  })

  describe('text align actions', () => {
    const alignActions = [
      { name: 'alignLeft', alignment: 'left' },
      { name: 'alignCenter', alignment: 'center' },
      { name: 'alignRight', alignment: 'right' },
      { name: 'alignJustify', alignment: 'justify' }
    ] as const

    for (const { name, alignment } of alignActions) {
      describe(name, () => {
        it('toolbarAction sets the correct text alignment', () => {
          const editor = createMockEditor()
          actions[name]().toolbarAction!(editor)
          expect(editor._chain.setTextAlign).toHaveBeenCalledWith(alignment)
          expect(editor._chain.run).toHaveBeenCalled()
        })

        it('slashCommandAction deletes range then sets the correct text alignment', () => {
          const editor = createMockEditor()
          actions[name]().slashCommandAction!({ editor, range: mockRange })
          expect(editor._chain.deleteRange).toHaveBeenCalledWith(mockRange)
          expect(editor._chain.setTextAlign).toHaveBeenCalledWith(alignment)
          expect(editor._chain.run).toHaveBeenCalled()
        })

        it('isActive checks the correct alignment', () => {
          const editor = createMockEditor({
            isActive: (attrs) => (attrs as { textAlign?: string } | null)?.textAlign === alignment
          })
          expect(actions[name]().isActive!(editor)).toBe(true)
        })
      })
    }
  })

  describe('textAlign menu action', () => {
    it('contains all text alignment actions as child actions', () => {
      const action = actions.textAlign()
      expect(action.showInSlashCommands).toBe(false)
      expect(action.childActions?.map((child) => child.id)).toEqual([
        'align-left',
        'align-center',
        'align-right',
        'align-justify'
      ])
    })

    it('activeIcon reflects the current active alignment', () => {
      const editor = createMockEditor({
        isActive: (attrs) => (attrs as { textAlign?: string } | null)?.textAlign === 'right'
      })
      expect(actions.textAlign().activeIcon?.(editor)).toEqual({ icon: 'align-right' })
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
    it('toolbarAction requests the panel with an existing link and its full range', () => {
      const editor = createLinkEditor('<p><a href="https://example.com">Example</a></p>')
      editor.commands.setTextSelection(2)

      actions.link().toolbarAction!(editor)

      expect(state.linkPanel.value).toEqual({
        range: { from: 1, to: 8 },
        href: 'https://example.com',
        text: 'Example'
      })
      editor.destroy()
    })

    it('toolbarAction preserves selected text for a new link', () => {
      const editor = createLinkEditor('<p>Example</p>')
      editor.commands.setTextSelection({ from: 1, to: 8 })

      actions.link().toolbarAction!(editor)

      expect(state.linkPanel.value).toEqual({
        range: { from: 1, to: 8 },
        href: '',
        text: 'Example'
      })
      editor.destroy()
    })

    it('slashCommandAction removes the command and opens the panel at its position', () => {
      const editor = createLinkEditor('<p>/link</p>')

      actions.link().slashCommandAction!({ editor, range: { from: 1, to: 6 } })

      expect(editor.getText()).toBe('')
      expect(state.linkPanel.value).toMatchObject({
        range: { from: 1, to: 1 },
        href: '',
        text: ''
      })
      editor.destroy()
    })

    it('isActive checks link mark', () => {
      const editor = createMockEditor({ isActive: (type) => type === 'link' })
      expect(actions.link().isActive!(editor)).toBe(true)
    })

    it('is available from toolbar and slash commands', () => {
      const action = actions.link()
      expect(action.showInToolbar).not.toBe(false)
      expect(action.showInSlashCommands).not.toBe(false)
      expect(action.slashCommandAction).toBeTypeOf('function')
      expect(action.keywords).toEqual(expect.arrayContaining(['link', 'url', 'website']))
    })
  })

  describe('table', () => {
    it('has childActions for default and custom table', () => {
      const tableAction = actions.createTable()
      expect(tableAction.childActions).toBeDefined()
      expect(tableAction.childActions).toHaveLength(2)
      expect(tableAction.childActions![0].id).toBe('table-default')
      expect(tableAction.childActions![1].id).toBe('table-custom')
    })

    it('default table action inserts 3x3 table with header row', () => {
      const editor = createMockEditor()
      const tableAction = actions.createTable()
      const defaultTableAction = tableAction.childActions![0]
      defaultTableAction.toolbarAction!(editor)
      expect(editor._chain.insertTable).toHaveBeenCalledWith({
        rows: 3,
        cols: 3,
        withHeaderRow: true
      })
    })

    it('custom table action has menuComponent', () => {
      const tableAction = actions.createTable()
      const customTableAction = tableAction.childActions![1]
      expect(customTableAction.menuComponent).toBeDefined()
    })

    it('slashCommandAction deletes range then inserts table', () => {
      const editor = createMockEditor()
      actions.createTable().slashCommandAction!({ editor, range: mockRange })
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

    describe('toggleHeaderRow', () => {
      it('isEnabled returns editor.isActive("table")', () => {
        const inTable = createMockEditor({ isActive: (type) => type === 'table' })
        const notInTable = createMockEditor()
        expect(actions.toggleHeaderRow().isEnabled!(inTable)).toBe(true)
        expect(actions.toggleHeaderRow().isEnabled!(notInTable)).toBe(false)
      })

      it('toolbarAction calls toggleHeaderRow', () => {
        const editor = createMockEditor()
        actions.toggleHeaderRow().toolbarAction!(editor)
        expect(editor._chain.toggleHeaderRow).toHaveBeenCalled()
      })
    })

    describe('deleteTable', () => {
      it('isEnabled returns editor.isActive("table")', () => {
        const inTable = createMockEditor({ isActive: (type) => type === 'table' })
        const notInTable = createMockEditor()
        expect(actions.deleteTable().isEnabled!(inTable)).toBe(true)
        expect(actions.deleteTable().isEnabled!(notInTable)).toBe(false)
      })

      it('toolbarAction calls deleteTable', () => {
        const editor = createMockEditor()
        actions.deleteTable().toolbarAction!(editor)
        expect(editor._chain.deleteTable).toHaveBeenCalled()
      })
    })
  })

  describe('imageUrl', () => {
    it('toolbarAction dispatches a modal with input', () => {
      const editor = createMockEditor()
      actions.imageUrl().toolbarAction!(editor, 'url')
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
      actions.imageUrl().toolbarAction!(editor, 'url')
      const store = useModals()
      const modal = store.modals[0]
      modal.onConfirm('https://example.com/photo.png')
      expect(editor._chain.setImage).toHaveBeenCalledWith({ src: 'https://example.com/photo.png' })
    })

    it('toolbarAction onConfirm inserts image when a valid http URL is entered', () => {
      const editor = createMockEditor()
      actions.imageUrl().toolbarAction!(editor, 'url')
      const store = useModals()
      const modal = store.modals[0]
      modal.onConfirm('http://example.com/photo.png')
      expect(editor._chain.setImage).toHaveBeenCalledWith({ src: 'http://example.com/photo.png' })
    })

    it('toolbarAction onConfirm trims whitespace from URL', () => {
      const editor = createMockEditor()
      actions.imageUrl().toolbarAction!(editor, 'url')
      const store = useModals()
      const modal = store.modals[0]
      modal.onConfirm('  https://example.com/photo.png  ')
      expect(editor._chain.setImage).toHaveBeenCalledWith({ src: 'https://example.com/photo.png' })
    })

    it('toolbarAction onConfirm does nothing when URL is empty', () => {
      const editor = createMockEditor()
      actions.imageUrl().toolbarAction!(editor, 'url')
      const store = useModals()
      const modal = store.modals[0]
      modal.onConfirm('   ')
      expect(editor._chain.setImage).not.toHaveBeenCalled()
    })

    it('toolbarAction onConfirm rejects URLs without http(s) protocol', () => {
      const editor = createMockEditor()
      actions.imageUrl().toolbarAction!(editor, 'url')
      const store = useModals()
      const modal = store.modals[0]
      modal.onConfirm('javascript:alert(1)')
      expect(editor._chain.setImage).not.toHaveBeenCalled()
    })

    it('toolbarAction onInput sets error for invalid protocol', () => {
      const editor = createMockEditor()
      actions.imageUrl().toolbarAction!(editor, 'url')
      const store = useModals()
      const modal = store.modals[0]
      const setError = vi.fn()
      modal.onInput('example.com/photo.png', setError)
      expect(setError).toHaveBeenCalledWith('URL must start with http:// or https://')
    })

    it('toolbarAction onInput clears error for valid URL', () => {
      const editor = createMockEditor()
      actions.imageUrl().toolbarAction!(editor, 'url')
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
      actions.imageUpload().toolbarAction!(editor, 'file')
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

      actions.imageUpload().toolbarAction!(editor, 'file')

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

      actions.imageUpload().toolbarAction!(editor, 'file')

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

      actions.imageUpload().toolbarAction!(editor, 'file')

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

      actions.imageUpload().toolbarAction!(editor, 'file')

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

  describe('image', () => {
    it('always shows file, url and cloud actions in the image dropdown', () => {
      const action = actions.image()
      const childIds = action.childActions?.map(({ id }) => id) || []

      expect(childIds).toEqual(['image-upload', 'image-url', 'image-cloud'])
    })

    it('provides "Insert from cloud" action for current resource', () => {
      const cloudState = createState()
      const cloudActions = useEditorActions(cloudState)
      const cloudChild = cloudActions.image().childActions?.find(({ id }) => id === 'image-cloud')

      expect(cloudChild).toBeTruthy()
      expect(cloudChild?.showInSlashCommands).toBe(true)
    })

    it('opens cloud picker from slash command and removes the slash token', () => {
      const editor = createMockEditor()
      const cloudAction = actions.image().childActions?.find(({ id }) => id === 'image-cloud')

      cloudAction?.slashCommandAction?.({ editor, range: mockRange })

      expect(editor._chain.deleteRange).toHaveBeenCalledWith(mockRange)
      const store = useModals()
      expect(store.modals[0].title).toBe('Insert image from cloud')
    })
  })

  describe('menuEmoji', () => {
    it('uses menu component mode and is hidden from slash commands', () => {
      const action = actions.menuEmoji()
      expect(action.id).toBe('menu-emoji')
      expect(action.menuComponent).toBeTruthy()
      expect(action.showInSlashCommands).toBe(false)
    })

    it('menuComponentAttrs inserts selected emoji into editor', () => {
      const editor = createMockEditor()
      const action = actions.menuEmoji()
      const closeMenu = vi.fn()
      const attrs = action.menuComponentAttrs!(editor, closeMenu) as {
        onEmojiSelect: (emoji: string) => void
      }
      attrs.onEmojiSelect('😀')
      expect(editor._chain.insertContent).toHaveBeenCalledWith('😀')
      expect(editor._chain.run).toHaveBeenCalled()
      expect(closeMenu).toHaveBeenCalled()
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
