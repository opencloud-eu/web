import { vi, describe, it, expect } from 'vitest'
import { ref } from 'vue'
import type { TextEditorState } from '../../../../src/editor/types'
import { useStrategyPlainText } from '../../../../src/editor/composables/strategies/plainText'

function createStrategy() {
  const state: TextEditorState = { sourceMode: ref(false) }
  return useStrategyPlainText(state)
}

describe('useStrategyPlainText', () => {
  describe('extensions', () => {
    it('returns base extensions only', () => {
      const strategy = createStrategy()
      const names = strategy.extensions().map((e) => e.name)
      expect(names).toContain('doc')
      expect(names).toContain('paragraph')
      expect(names).toContain('text')
      expect(names).toContain('hardBreak')
      expect(names).not.toContain('bold')
      expect(names).not.toContain('italic')
    })
  })

  describe('editorActionGroups', () => {
    it('returns empty array', () => {
      const strategy = createStrategy()
      expect(strategy.editorActionGroups()).toEqual([])
    })
  })

  describe('serialize', () => {
    it('calls getText on editor', () => {
      const strategy = createStrategy()
      const mockEditor = { getText: vi.fn().mockReturnValue('hello') } as any
      expect(strategy.serialize(mockEditor)).toBe('hello')
      expect(mockEditor.getText).toHaveBeenCalled()
    })
  })

  describe('deserialize', () => {
    it('wraps multiline text in paragraph nodes', () => {
      const strategy = createStrategy()
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
      const strategy = createStrategy()
      const result = strategy.deserialize('')
      expect(result).toEqual({
        type: 'doc',
        content: [{ type: 'paragraph' }]
      })
    })

    it('handles single-line content', () => {
      const strategy = createStrategy()
      const result = strategy.deserialize('just one line')
      expect(result).toEqual({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'just one line' }] }]
      })
    })

    it('handles trailing newline', () => {
      const strategy = createStrategy()
      const result = strategy.deserialize('line1\n')
      expect(result).toEqual({
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'line1' }] },
          { type: 'paragraph' }
        ]
      })
    })

    it('handles Windows line endings (\\r\\n) — trailing \\r remains', () => {
      const strategy = createStrategy()
      const result = strategy.deserialize('line1\r\nline2')
      expect(result).toEqual({
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'line1\r' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'line2' }] }
        ]
      })
    })
  })
})
