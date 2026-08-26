import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { Editor } from '@tiptap/vue-3'
import { getSchema } from '@tiptap/core'
import type { TextEditorLinkPanelRequest, TextEditorState } from '../../../../src/editor/types'
import { useStrategyPlainText } from '../../../../src/editor/composables/strategies/plainText'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

function createStrategy() {
  const state: TextEditorState = {
    sourceMode: ref(false),
    linkPanel: ref<TextEditorLinkPanelRequest | null>(null),
    editorZoom: ref(100)
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
      expect(names).toEqual(['starterKit', 'findAndReplace'])
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
    it('returns navigation, emoji, search and export groups', () => {
      const strategy = createStrategy()
      const groups = strategy.editorActionGroups()
      expect(groups).toHaveLength(4)
      const navigationGroup = groups.find((group) => group.id === 'navigation')
      const emojiGroup = groups.find((group) => group.id === 'emoji')
      const searchGroup = groups.find((group) => group.id === 'search')
      const exportGroup = groups.find((group) => group.id === 'export')

      expect(navigationGroup).toMatchObject({
        id: 'navigation',
        title: 'Navigation'
      })
      expect(navigationGroup?.actions.map((action) => action.id)).toEqual([
        'undo',
        'redo',
        'menu-zoom'
      ])

      expect(emojiGroup).toMatchObject({
        id: 'emoji',
        title: 'Emoji'
      })
      expect(emojiGroup?.actions.map((action) => action.id)).toEqual(['menu-emoji'])

      expect(searchGroup).toMatchObject({
        id: 'search',
        title: 'Search'
      })
      expect(searchGroup?.actions.map((action) => action.id)).toEqual(['menu-search-and-replace'])
      expect(exportGroup).toMatchObject({
        id: 'export',
        title: 'Export'
      })
      expect(exportGroup?.actions.map((action) => action.id)).toEqual(['print'])
      expect(groups.at(-1)?.id).toBe('export')
      expect(
        strategy.editorActionGroups().flatMap(({ actions }) => actions.map(({ id }) => id))
      ).not.toContain('link')
    })
  })

  describe('serialize', () => {
    it('joins blocks with a single newline', () => {
      const strategy = createStrategy()
      const schema = getSchema(strategy.extensions())
      const doc = schema.nodeFromJSON({
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'line1' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'line2' }] }
        ]
      })
      expect(strategy.serialize(doc)).toBe('line1\nline2')
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
