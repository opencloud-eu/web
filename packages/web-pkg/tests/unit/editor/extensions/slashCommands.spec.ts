import { describe, it, expect, vi } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Collaboration } from '@tiptap/extension-collaboration'
import { yUndoPluginKey } from '@tiptap/y-tiptap'
import * as Y from 'yjs'
import { exitSuggestion, SuggestionPluginKey } from '@tiptap/suggestion'
import {
  filterSlashCommandItems,
  SlashCommands
} from '../../../../src/editor/extensions/slashCommands'
import type { EditorActionGroup } from '../../../../src/editor/composables/useEditorActions'

vi.mock('@tiptap/vue-3', () => ({
  VueRenderer: class {
    el = document.createElement('div')
    ref = { onUpdate: vi.fn(), onKeyDown: vi.fn() }
    updateProps = vi.fn()
    destroy = vi.fn()
  }
}))

const groups: EditorActionGroup[] = [
  {
    id: 'basic',
    title: 'Basic',
    actions: [
      { id: 'h1', title: 'Heading 1', icon: 'h-1', keywords: ['title'] },
      { id: 'p', title: 'Paragraph', icon: 'paragraph', keywords: ['body', 'text'] }
    ]
  },
  {
    id: 'lists',
    title: 'Lists',
    actions: [{ id: 'ul', title: 'Bullet list', icon: 'list', description: 'Unordered' }]
  },
  {
    id: 'table-editing',
    title: 'Table editing',
    actions: [
      {
        id: 'add-row',
        title: 'Add row',
        icon: 'insert-row',
        keywords: ['table'],
        isEnabled: (editor) => editor.isActive('table')
      },
      {
        id: 'delete-row',
        title: 'Delete row',
        icon: 'delete-row',
        keywords: ['table'],
        isEnabled: (editor) => editor.isActive('table')
      }
    ]
  }
]

function mockEditor(isInTable: boolean) {
  return {
    isActive: (type: string) => type === 'table' && isInTable
  } as unknown as Editor
}

describe('filterSlashCommandItems', () => {
  it('returns all actions flattened with group metadata when query is empty', () => {
    const result = filterSlashCommandItems(groups, '', mockEditor(false))
    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({ id: 'h1', groupId: 'basic', groupTitle: 'Basic' })
    expect(result[2]).toMatchObject({ id: 'ul', groupId: 'lists', groupTitle: 'Lists' })
  })

  it('filters by title case-insensitively', () => {
    const result = filterSlashCommandItems(groups, 'head', mockEditor(false))
    expect(result.map((i) => i.id)).toEqual(['h1'])
  })

  it('matches against keywords', () => {
    const result = filterSlashCommandItems(groups, 'body', mockEditor(false))
    expect(result.map((i) => i.id)).toEqual(['p'])
  })

  it('matches against description', () => {
    const result = filterSlashCommandItems(groups, 'unordered', mockEditor(false))
    expect(result.map((i) => i.id)).toEqual(['ul'])
  })

  it('returns empty array when nothing matches', () => {
    const result = filterSlashCommandItems(groups, 'xyz-no-match', mockEditor(false))
    expect(result).toEqual([])
  })

  it('trims whitespace from query', () => {
    const result = filterSlashCommandItems(groups, '  head  ', mockEditor(false))
    expect(result.map((i) => i.id)).toEqual(['h1'])
  })

  it('preserves group and action order', () => {
    const result = filterSlashCommandItems(groups, '', mockEditor(false))
    expect(result.map((i) => i.id)).toEqual(['h1', 'p', 'ul'])
  })

  it('excludes items with showInSlashCommands === false', () => {
    const groupsWithHidden: EditorActionGroup[] = [
      {
        id: 'test',
        title: 'Test',
        actions: [
          { id: 'visible', title: 'Visible', icon: 'x' },
          { id: 'hidden', title: 'Hidden', icon: 'x', showInSlashCommands: false }
        ]
      }
    ]
    const result = filterSlashCommandItems(groupsWithHidden, '', mockEditor(false))
    expect(result.map((i) => i.id)).toEqual(['visible'])
  })

  it('excludes items where isEnabled returns false', () => {
    const result = filterSlashCommandItems(groups, '', mockEditor(false))
    expect(result.map((i) => i.id)).toEqual(['h1', 'p', 'ul'])
  })

  it('includes items where isEnabled returns true', () => {
    const result = filterSlashCommandItems(groups, '', mockEditor(true))
    expect(result).toHaveLength(5)
    expect(result.map((i) => i.id)).toEqual(['h1', 'p', 'ul', 'add-row', 'delete-row'])
  })

  it('filters enabled items by query', () => {
    const result = filterSlashCommandItems(groups, 'add', mockEditor(true))
    expect(result.map((i) => i.id)).toEqual(['add-row'])
  })

  it('handles items without keywords or description', () => {
    const minimal: EditorActionGroup[] = [
      {
        id: 'g',
        title: 'G',
        actions: [{ id: 'bare', title: 'Bare Action', icon: 'x' }]
      }
    ]
    const result = filterSlashCommandItems(minimal, 'bare', mockEditor(false))
    expect(result.map((i) => i.id)).toEqual(['bare'])
  })
})

describe('SlashCommands', () => {
  function createEditor(content: string) {
    return new Editor({
      extensions: [StarterKit, SlashCommands.configure({ getGroups: () => groups })],
      content
    })
  }

  const isActive = (editor: Editor) => SuggestionPluginKey.getState(editor.state)?.active

  it('opens for an existing slash when the editor selection returns to it', () => {
    const editor = createEditor('<p>/</p>')

    editor.commands.setTextSelection(2)

    expect(isActive(editor)).toBe(true)
    editor.destroy()
  })

  it('opens when the user inserts a new slash', () => {
    const editor = createEditor('<p></p>')

    editor.commands.insertContent('/')

    expect(isActive(editor)).toBe(true)
    editor.destroy()
  })

  it('stays open when a selection-only transaction follows', () => {
    const editor = createEditor('<p></p>')
    editor.commands.insertContent('/hea')

    // the deferred focus() of the drag handle's plus button dispatches such a transaction
    editor.commands.scrollIntoView()

    expect(isActive(editor)).toBe(true)
    editor.destroy()
  })

  it('stays open when the caret moves inside the query', () => {
    const editor = createEditor('<p></p>')
    editor.commands.insertContent('/hea')

    editor.commands.setTextSelection(editor.state.selection.from - 1)

    expect(isActive(editor)).toBe(true)
    editor.destroy()
  })

  it('reopens a dismissed slash when the selection returns to it', () => {
    const editor = createEditor('<p></p>')
    editor.commands.insertContent('/hea')

    exitSuggestion(editor.view)
    editor.commands.setTextSelection(editor.state.selection.from - 1)

    expect(isActive(editor)).toBe(true)
    editor.destroy()
  })

  describe('openSlashCommandMenu', () => {
    it('opens the menu in a new paragraph after a block with content', () => {
      const editor = createEditor('<p>Hello</p>')

      editor.commands.openSlashCommandMenu(0)

      expect(editor.getHTML()).toBe('<p>Hello</p><p>/</p>')
      expect(isActive(editor)).toBe(true)
      editor.destroy()
    })

    it('opens the menu inside an empty block', () => {
      const editor = createEditor('<p>Hello</p><p></p>')

      editor.commands.openSlashCommandMenu(7)

      expect(editor.getHTML()).toBe('<p>Hello</p><p>/</p>')
      expect(isActive(editor)).toBe(true)
      editor.destroy()
    })

    it('opens the menu at the selection without a position', () => {
      const editor = createEditor('<p></p>')

      editor.commands.openSlashCommandMenu()

      expect(editor.getHTML()).toBe('<p>/</p>')
      expect(isActive(editor)).toBe(true)
      editor.destroy()
    })

    it('removes the inserted paragraph when the menu gets dismissed', () => {
      const editor = createEditor('<p>Hello</p>')
      editor.commands.openSlashCommandMenu(0)

      exitSuggestion(editor.view)

      expect(editor.getHTML()).toBe('<p>Hello</p>')
      expect(isActive(editor)).toBe(false)
      editor.destroy()
    })

    it('removes the inserted paragraph after a leaf block when the menu gets dismissed', () => {
      const editor = createEditor('<p>Hello</p><hr><p>World</p>')
      editor.commands.openSlashCommandMenu(7)

      exitSuggestion(editor.view)

      expect(editor.getHTML()).toBe('<p>Hello</p><hr><p>World</p>')
      expect(isActive(editor)).toBe(false)
      editor.destroy()
    })

    it('keeps an empty block but removes the slash when the menu gets dismissed', () => {
      const editor = createEditor('<p>Hello</p><p></p>')
      editor.commands.openSlashCommandMenu(7)

      exitSuggestion(editor.view)

      expect(editor.getHTML()).toBe('<p>Hello</p><p></p>')
      editor.destroy()
    })

    it('removes the slash and the filter query when the menu gets dismissed', () => {
      const editor = createEditor('<p>Hello</p>')
      editor.commands.openSlashCommandMenu(0)
      editor.commands.insertContent('hea')

      exitSuggestion(editor.view)

      expect(editor.getHTML()).toBe('<p>Hello</p>')
      editor.destroy()
    })

    it('removes the slash when the caret moves away from it', () => {
      const editor = createEditor('<p>Hello</p>')
      editor.commands.openSlashCommandMenu(0)

      editor.commands.setTextSelection(1)

      expect(editor.getHTML()).toBe('<p>Hello</p>')
      editor.destroy()
    })

    it('removes nothing more on repeated open and dismiss', () => {
      const editor = createEditor('<p>Hello</p>')

      for (let i = 0; i < 3; i++) {
        editor.commands.openSlashCommandMenu(0)
        exitSuggestion(editor.view)
      }

      expect(editor.getHTML()).toBe('<p>Hello</p>')
      editor.destroy()
    })

    it('keeps the result of a command run from the menu', () => {
      const editor = createEditor('<p>Hello</p>')
      editor.commands.openSlashCommandMenu(0)
      const { range } = SuggestionPluginKey.getState(editor.state)

      editor.chain().deleteRange(range).setNode('heading', { level: 1 }).run()

      // trailing paragraph comes from the StarterKit's TrailingNode
      expect(editor.getHTML()).toBe('<p>Hello</p><h1></h1><p></p>')
      expect(isActive(editor)).toBe(false)
      editor.destroy()
    })

    it('keeps the text when the user types on past the filter', () => {
      const editor = createEditor('<p>Hello</p>')
      editor.commands.openSlashCommandMenu(0)

      editor.commands.insertContent(' and more')
      editor.commands.setTextSelection(1)

      expect(editor.getHTML()).toBe('<p>Hello</p><p>/ and more</p>')
      editor.destroy()
    })

    it('does not restore the slash on undo after a dismissal', () => {
      const editor = createEditor('<p>Hello</p>')
      editor.commands.openSlashCommandMenu(0)
      exitSuggestion(editor.view)

      editor.commands.undo()

      expect(editor.getHTML()).toBe('<p>Hello</p>')
      editor.destroy()
    })

    it('closes the menu and removes its slash when opened again', () => {
      const editor = createEditor('<p>Hello</p>')
      editor.commands.openSlashCommandMenu(0)

      editor.commands.openSlashCommandMenu(0)

      expect(editor.getHTML()).toBe('<p>Hello</p>')
      expect(isActive(editor)).toBe(false)
      editor.destroy()
    })

    it('keeps a slash token of the user when the caret jumps into it', () => {
      const editor = createEditor('<p>see /usr</p>')
      editor.commands.openSlashCommandMenu(0)

      editor.commands.setTextSelection(9)
      expect(editor.getHTML()).toBe('<p>see /usr</p>')
      expect(SuggestionPluginKey.getState(editor.state).query).toBe('usr')

      exitSuggestion(editor.view)
      expect(editor.getHTML()).toBe('<p>see /usr</p>')
      editor.destroy()
    })

    it('does not reopen the menu on a slash token in the previous block', () => {
      const editor = createEditor('<p>see /usr</p>')
      editor.commands.openSlashCommandMenu(0)

      exitSuggestion(editor.view)

      expect(editor.getHTML()).toBe('<p>see /usr</p>')
      expect(isActive(editor)).toBe(false)
      editor.destroy()
    })

    it('keeps a slash token of the user when an undo moves the menu onto it', () => {
      const editor = createEditor('<p>see /usr</p><p>World</p>')
      editor.commands.setTextSelection(9)
      exitSuggestion(editor.view)
      editor.commands.openSlashCommandMenu(10)

      editor.commands.undo()
      expect(SuggestionPluginKey.getState(editor.state).query).toBe('usr')

      exitSuggestion(editor.view)
      expect(editor.getHTML()).toBe('<p>see /usr</p><p>World</p>')
      editor.destroy()
    })

    it('keeps a slash token of the user when a collaborative undo moves the menu onto it', () => {
      const editor = new Editor({
        extensions: [
          StarterKit.configure({ undoRedo: false }),
          SlashCommands.configure({ getGroups: () => groups }),
          Collaboration.configure({ document: new Y.Doc() })
        ]
      })
      editor.chain().setMeta('addToHistory', false).setContent('<p>Hello</p><p>see /usr</p>').run()
      const { undoManager } = yUndoPluginKey.getState(editor.state)
      undoManager.stopCapturing()
      editor.commands.openSlashCommandMenu(7)
      undoManager.stopCapturing()

      editor.commands.undo()
      expect(SuggestionPluginKey.getState(editor.state).query).toBe('usr')

      exitSuggestion(editor.view)
      expect(editor.getHTML()).toBe('<p>Hello</p><p>see /usr</p>')
      editor.destroy()
    })

    it('does not restore the slash on a collaborative undo after a dismissal', () => {
      const editor = new Editor({
        extensions: [
          StarterKit.configure({ undoRedo: false }),
          SlashCommands.configure({ getGroups: () => groups }),
          Collaboration.configure({ document: new Y.Doc() })
        ]
      })
      editor.chain().setMeta('addToHistory', false).setContent('<p>Hello</p>').run()
      const { undoManager } = yUndoPluginKey.getState(editor.state)
      editor.commands.openSlashCommandMenu(0)
      undoManager.stopCapturing()
      exitSuggestion(editor.view)

      editor.commands.undo()

      expect(editor.getHTML()).toBe('<p>Hello</p>')
      expect(isActive(editor)).toBe(false)
      editor.destroy()
    })

    it('keeps a slash typed by the user when the menu gets dismissed', () => {
      const editor = createEditor('<p>Hello</p>')
      editor.commands.setTextSelection(6)
      editor.commands.insertContent('/')

      exitSuggestion(editor.view)

      expect(editor.getHTML()).toBe('<p>Hello/</p>')
      editor.destroy()
    })
  })
})
