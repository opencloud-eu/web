import { describe, it, expect, vi } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
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
})
