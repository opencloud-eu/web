import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import type { TextEditorState } from '../../../../src/editor/types'
import { useStrategyPlainText } from '../../../../src/editor/composables/strategies/plainText'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

function createStrategy() {
  const state: TextEditorState = { sourceMode: ref(false), editorZoom: ref(100) }
  return useStrategyPlainText(state)
}

describe('useStrategyPlainText', () => {
  beforeEach(() => {
    createTestingPinia()
  })

  describe('extensions', () => {
    it('returns a starter kit extension', () => {
      const strategy = createStrategy()
      const names = strategy.extensions().map((e) => e.name)
      expect(names).toEqual(['starterKit'])
    })
  })

  describe('editorActionGroups', () => {
    it('returns history, emoji and view options groups with zoom menu action', () => {
      const strategy = createStrategy()
      const groups = strategy.editorActionGroups()
      expect(groups).toHaveLength(3)
      const historyGroup = groups.find((group) => group.id === 'history')
      const emojiGroup = groups.find((group) => group.id === 'emoji')
      const viewOptionsGroup = groups.find((group) => group.id === 'view-options')

      expect(historyGroup).toMatchObject({
        id: 'history',
        title: 'History'
      })
      expect(historyGroup?.actions.map((action) => action.id)).toEqual(['undo', 'redo'])

      expect(emojiGroup).toMatchObject({
        id: 'emoji',
        title: 'Emoji'
      })
      expect(emojiGroup?.actions.map((action) => action.id)).toEqual(['menu-emoji'])

      expect(viewOptionsGroup).toMatchObject({
        id: 'view-options',
        title: 'View options'
      })
      expect(viewOptionsGroup?.actions.map((action) => action.id)).toEqual(['menu-zoom'])
      expect(groups.at(-1)?.id).toBe('view-options')
    })
  })

  describe('serialize', () => {
    it('calls getText with \\n block separator', () => {
      const strategy = createStrategy()
      const mockEditor = { getText: vi.fn().mockReturnValue('hello') } as any
      expect(strategy.serialize(mockEditor)).toBe('hello')
      expect(mockEditor.getText).toHaveBeenCalledWith({ blockSeparator: '\n' })
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
