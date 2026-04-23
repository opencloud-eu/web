import { TiptapJsonStrategy } from '../../../../src/editor/strategies/tiptapJson'

describe('TiptapJsonStrategy', () => {
  let strategy: TiptapJsonStrategy

  beforeEach(() => {
    strategy = new TiptapJsonStrategy()
  })

  describe('extensions', () => {
    it('returns same extensions as HTML strategy', () => {
      const names = strategy.extensions().map((e) => e.name)
      expect(names).toContain('underline')
      expect(names).toContain('image')
    })
  })

  describe('serialize', () => {
    it('returns JSON string from editor', () => {
      const doc = { type: 'doc', content: [] }
      const mockEditor = { getJSON: vi.fn().mockReturnValue(doc) } as any
      expect(strategy.serialize(mockEditor)).toBe(JSON.stringify(doc))
    })
  })

  describe('deserialize', () => {
    it('parses JSON string to object', () => {
      const doc = { type: 'doc', content: [{ type: 'paragraph' }] }
      expect(strategy.deserialize(JSON.stringify(doc))).toEqual(doc)
    })
  })
})
