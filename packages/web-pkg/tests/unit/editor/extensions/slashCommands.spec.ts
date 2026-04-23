import { filterSlashCommandItems } from '../../../../src/editor/extensions/slashCommands'
import type { SlashCommandGroup } from '../../../../src/editor/types'
import type { Editor } from '@tiptap/vue-3'

const groups: SlashCommandGroup[] = [
  {
    id: 'basic',
    title: 'Basic',
    items: [
      { id: 'h1', title: 'Heading 1', keywords: ['title'], command: () => {} },
      { id: 'p', title: 'Paragraph', keywords: ['body', 'text'], command: () => {} }
    ]
  },
  {
    id: 'lists',
    title: 'Lists',
    items: [{ id: 'ul', title: 'Bullet list', description: 'Unordered', command: () => {} }]
  },
  {
    id: 'table-editing',
    title: 'Table editing',
    items: [
      {
        id: 'add-row',
        title: 'Add row',
        keywords: ['table'],
        command: () => {},
        isVisible: (editor) => editor.isActive('table')
      },
      {
        id: 'delete-row',
        title: 'Delete row',
        keywords: ['table'],
        command: () => {},
        isVisible: (editor) => editor.isActive('table')
      }
    ]
  }
]

const mockEditor = (isInTable: boolean) =>
  ({
    isActive: (type: string) => type === 'table' && isInTable
  }) as unknown as Editor

describe('filterSlashCommandItems', () => {
  it('returns all items flattened with group metadata when query is empty', () => {
    const result = filterSlashCommandItems(groups, '', mockEditor(false))
    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({ id: 'h1', groupId: 'basic', groupTitle: 'Basic' })
    expect(result[2]).toMatchObject({ id: 'ul', groupId: 'lists', groupTitle: 'Lists' })
  })

  it('filters items whose title matches the query (case-insensitive)', () => {
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

  it('ignores leading/trailing whitespace in the query', () => {
    const result = filterSlashCommandItems(groups, '  head  ', mockEditor(false))
    expect(result.map((i) => i.id)).toEqual(['h1'])
  })

  it('preserves group order and item order within groups', () => {
    const result = filterSlashCommandItems(groups, '', mockEditor(false))
    expect(result.map((i) => i.id)).toEqual(['h1', 'p', 'ul'])
  })

  it('excludes items with isVisible=false', () => {
    const result = filterSlashCommandItems(groups, '', mockEditor(false))
    expect(result.map((i) => i.id)).toEqual(['h1', 'p', 'ul'])
  })

  it('includes items with isVisible=true', () => {
    const result = filterSlashCommandItems(groups, '', mockEditor(true))
    expect(result).toHaveLength(5)
    expect(result.map((i) => i.id)).toEqual(['h1', 'p', 'ul', 'add-row', 'delete-row'])
  })

  it('filters items with isVisible=true by query', () => {
    const result = filterSlashCommandItems(groups, 'add', mockEditor(true))
    expect(result.map((i) => i.id)).toEqual(['add-row'])
  })
})
