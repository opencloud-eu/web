import { describe, it, expect } from 'vitest'
import { filterSlashCommandItems } from '../../../../src/editor/extensions/slashCommands'
import type { EditorActionGroup } from '../../../../src/editor/composables/useEditorActions'
import type { Editor } from '@tiptap/vue-3'

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
