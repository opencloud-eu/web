import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { Editor } from '@tiptap/vue-3'
import type { TextEditorLinkPanelRequest, TextEditorState } from '../../../../src/editor/types'
import { useStrategyPlainText } from '../../../../src/editor/composables/strategies/plainText'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

function createStrategy() {
  const state: TextEditorState = {
    sourceMode: ref(false),
    linkPanel: ref<TextEditorLinkPanelRequest | null>(null)
  }
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
      expect(names).not.toContain('link')
    })

    it('does not register the link mark bundled in the starter kit', () => {
      const strategy = createStrategy()
      const editor = new Editor({ extensions: strategy.extensions() })
      expect(editor.schema.marks.link).toBeUndefined()
      editor.destroy()
    })

    it('does not autolink pasted URLs', () => {
      const strategy = createStrategy()
      const editor = new Editor({ extensions: strategy.extensions() })

      editor.view.pasteText('https://opencloud.eu ')

      expect(editor.state.doc.firstChild?.firstChild?.marks).toHaveLength(0)
      editor.destroy()
    })
  })

  describe('editorActionGroups', () => {
    it('returns history group with undo and redo', () => {
      const strategy = createStrategy()
      expect(strategy.editorActionGroups()).toHaveLength(1)
      expect(strategy.editorActionGroups()[0]).toMatchObject({
        id: 'history',
        title: 'History'
      })
      expect(strategy.editorActionGroups()[0].actions.map((action) => action.id)).toEqual([
        'undo',
        'redo'
      ])
      expect(
        strategy.editorActionGroups().flatMap(({ actions }) => actions.map(({ id }) => id))
      ).not.toContain('link')
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
