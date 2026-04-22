import { MarkdownStrategy } from '../../../src/strategies/markdown'

describe('MarkdownStrategy', () => {
  let strategy: MarkdownStrategy

  beforeEach(() => {
    strategy = new MarkdownStrategy()
  })

  describe('extensions', () => {
    it('includes markdown-relevant extensions but not underline or image', () => {
      const names = strategy.extensions().map((e) => e.name)
      expect(names).toContain('link')
      expect(names).toContain('table')
      expect(names).toContain('taskList')
      expect(names).not.toContain('underline')
      expect(names).not.toContain('image')
    })
  })

  describe('toolbarItems', () => {
    it('does not include underline or image', () => {
      const allIds = strategy
        .toolbarItems()
        .flat()
        .map((item) => item.id)
      expect(allIds).toContain('bold')
      expect(allIds).toContain('link')
      expect(allIds).not.toContain('underline')
      expect(allIds).not.toContain('image')
    })
  })

  describe('defaultSlashCommandGroups', () => {
    it('returns grouped formatting items', () => {
      const groups = strategy.defaultSlashCommandGroups()
      const groupIds = groups.map((g) => g.id)
      expect(groupIds).toEqual(['basic-blocks', 'lists', 'advanced'])
      const allItemIds = groups.flatMap((g) => g.items.map((i) => i.id))
      expect(allItemIds).toContain('heading-1')
      expect(allItemIds).toContain('bullet-list')
      expect(allItemIds).toContain('table')
    })
  })

  describe('serialize', () => {
    it('calls getMarkdown on editor', () => {
      const mockEditor = {
        getMarkdown: vi.fn().mockReturnValue('# Hello')
      } as any
      expect(strategy.serialize(mockEditor)).toBe('# Hello')
      expect(mockEditor.getMarkdown).toHaveBeenCalled()
    })
  })

  describe('deserialize', () => {
    it('returns markdown string as-is (tiptap/markdown handles parsing)', () => {
      expect(strategy.deserialize('# Hello')).toBe('# Hello')
    })
  })
})
