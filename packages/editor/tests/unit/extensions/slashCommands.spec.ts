import { filterSlashCommandItems } from '../../../src/extensions/slashCommands'
import type { SlashCommandGroup } from '../../../src/types'

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
  }
]

describe('filterSlashCommandItems', () => {
  it('returns all items flattened with group metadata when query is empty', () => {
    const result = filterSlashCommandItems(groups, '')
    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({ id: 'h1', groupId: 'basic', groupTitle: 'Basic' })
    expect(result[2]).toMatchObject({ id: 'ul', groupId: 'lists', groupTitle: 'Lists' })
  })

  it('filters items whose title matches the query (case-insensitive)', () => {
    const result = filterSlashCommandItems(groups, 'head')
    expect(result.map((i) => i.id)).toEqual(['h1'])
  })

  it('matches against keywords', () => {
    const result = filterSlashCommandItems(groups, 'body')
    expect(result.map((i) => i.id)).toEqual(['p'])
  })

  it('matches against description', () => {
    const result = filterSlashCommandItems(groups, 'unordered')
    expect(result.map((i) => i.id)).toEqual(['ul'])
  })

  it('returns empty array when nothing matches', () => {
    const result = filterSlashCommandItems(groups, 'xyz-no-match')
    expect(result).toEqual([])
  })

  it('ignores leading/trailing whitespace in the query', () => {
    const result = filterSlashCommandItems(groups, '  head  ')
    expect(result.map((i) => i.id)).toEqual(['h1'])
  })

  it('preserves group order and item order within groups', () => {
    const result = filterSlashCommandItems(groups, '')
    expect(result.map((i) => i.id)).toEqual(['h1', 'p', 'ul'])
  })
})
