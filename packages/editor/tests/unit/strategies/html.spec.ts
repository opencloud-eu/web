import { HtmlStrategy } from '../../../src/strategies/html'

describe('HtmlStrategy', () => {
  let strategy: HtmlStrategy

  beforeEach(() => {
    strategy = new HtmlStrategy()
  })

  describe('extensions', () => {
    it('includes rich text extensions', () => {
      const extensions = strategy.extensions()
      const names = extensions.map((e) => e.name)
      expect(names).toContain('underline')
      expect(names).toContain('image')
      expect(names).toContain('link')
      expect(names).toContain('table')
      expect(names).toContain('taskList')
    })
  })

  describe('toolbarItems', () => {
    it('returns groups including underline and image', () => {
      const groups = strategy.toolbarItems()
      const allIds = groups.flat().map((item) => item.id)
      expect(allIds).toContain('underline')
      expect(allIds).toContain('image')
      expect(allIds).toContain('bold')
      expect(allIds).toContain('table')
    })
  })

  describe('serialize', () => {
    it('calls getHTML on editor', () => {
      const mockEditor = { getHTML: vi.fn().mockReturnValue('<p>hi</p>') } as any
      expect(strategy.serialize(mockEditor)).toBe('<p>hi</p>')
    })
  })

  describe('deserialize', () => {
    it('returns HTML string as-is', () => {
      expect(strategy.deserialize('<p>hello</p>')).toBe('<p>hello</p>')
    })
  })
})
