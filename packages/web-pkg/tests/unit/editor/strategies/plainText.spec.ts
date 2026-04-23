import { PlainTextStrategy } from '../../../../src/editor/strategies/plainText'

describe('PlainTextStrategy', () => {
  let strategy: PlainTextStrategy

  beforeEach(() => {
    strategy = new PlainTextStrategy()
  })

  describe('extensions', () => {
    it('returns base extensions only', () => {
      const extensions = strategy.extensions()
      const names = extensions.map((e) => e.name)
      expect(names).toContain('doc')
      expect(names).toContain('paragraph')
      expect(names).toContain('text')
      expect(names).toContain('hardBreak')
      expect(names).not.toContain('bold')
      expect(names).not.toContain('italic')
    })
  })

  describe('toolbarItems', () => {
    it('returns empty array', () => {
      expect(strategy.toolbarItems()).toEqual([])
    })
  })

  describe('defaultSlashCommandGroups', () => {
    it('returns empty array (plain text has no default slash commands)', () => {
      expect(strategy.defaultSlashCommandGroups()).toEqual([])
    })
  })

  describe('serialize', () => {
    it('calls getText on editor', () => {
      const mockEditor = { getText: vi.fn().mockReturnValue('hello') } as any
      expect(strategy.serialize(mockEditor)).toBe('hello')
      expect(mockEditor.getText).toHaveBeenCalled()
    })
  })

  describe('deserialize', () => {
    it('wraps text in paragraph nodes', () => {
      const result = strategy.deserialize('line1\nline2')
      expect(result).toEqual({
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'line1' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'line2' }] }
        ]
      })
    })

    it('handles empty string', () => {
      const result = strategy.deserialize('')
      expect(result).toEqual({
        type: 'doc',
        content: [{ type: 'paragraph' }]
      })
    })
  })
})
