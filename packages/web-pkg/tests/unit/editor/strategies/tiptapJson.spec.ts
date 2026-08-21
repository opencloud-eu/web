import { vi, describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { getSchema } from '@tiptap/core'
import type { TextEditorLinkPanelRequest, TextEditorState } from '../../../../src/editor/types'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

import { useStrategyTiptapJson } from '../../../../src/editor/composables/strategies/tiptapJson'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'

function createStrategy() {
  const state: TextEditorState = {
    sourceMode: ref(false),
    linkPanel: ref<TextEditorLinkPanelRequest | null>(null),
    editorZoom: ref(100)
  }
  return useStrategyTiptapJson(state)
}

describe('useStrategyTiptapJson', () => {
  beforeEach(() => {
    createTestingPinia()
  })

  describe('extensions', () => {
    it('includes same rich text extensions as HTML strategy', () => {
      const strategy = createStrategy()
      const names = strategy.extensions().map((e) => e.name)
      expect(names).toContain('underline')
      expect(names).toContain('image')
      expect(names).toContain('link')
      expect(names).toContain('fileHandler')
      expect(names).toContain('textAlign')
      const link = strategy.extensions().find(({ name }) => name === 'link')!
      expect(link.options).toMatchObject({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true
      })
    })
  })

  describe('editorActionGroups', () => {
    it('includes text align actions', () => {
      const strategy = createStrategy()
      const textAlignGroup = strategy
        .editorActionGroups()
        .find((group) => group.id === 'text-align')
      expect(textAlignGroup?.actions.map((action) => action.id)).toEqual([
        'align-left',
        'align-center',
        'align-right',
        'align-justify'
      ])
    })

    it('shows link in both toolbar and slash commands', () => {
      const action = createStrategy()
        .editorActionGroups()
        .flatMap(({ actions }) => actions)
        .find(({ id }) => id === 'link')!
      expect(action.showInToolbar).not.toBe(false)
      expect(action.showInSlashCommands).not.toBe(false)
      expect(action.slashCommandAction).toBeTypeOf('function')
    })
  })

  describe('serialize', () => {
    it('returns the ProseMirror document as a JSON string', () => {
      const strategy = createStrategy()
      const schema = getSchema(strategy.extensions())
      const json: {
        type: 'doc'
        content: Array<{
          type: 'paragraph'
          attrs: { textAlign: string | null }
          content: Array<{ type: 'text'; text: string }>
        }>
      } = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: { textAlign: null },
            content: [{ type: 'text', text: 'hi' }]
          }
        ]
      }
      expect(strategy.serialize(schema.nodeFromJSON(json))).toBe(JSON.stringify(json))
    })
  })

  describe('editorActionGroups', () => {
    it('keeps zoom in navigation and search as the last group', () => {
      const strategy = createStrategy()
      const groups = strategy.editorActionGroups()
      const navigationIds =
        groups.find((g) => g.id === 'navigation')?.actions.map((a) => a.id) || []
      const searchIds = groups.find((g) => g.id === 'search')?.actions.map((a) => a.id) || []

      expect(navigationIds).toEqual(['undo', 'redo', 'menu-zoom'])
      expect(searchIds).toEqual(['menu-search-and-replace'])
      expect(groups.at(-1)?.id).toBe('search')
    })
  })

  describe('deserialize', () => {
    it('parses JSON string to object', () => {
      const strategy = createStrategy()
      const doc = { type: 'doc', content: [{ type: 'paragraph' }] }
      expect(strategy.deserialize(JSON.stringify(doc))).toEqual(doc)
    })

    it('parses empty object', () => {
      const strategy = createStrategy()
      expect(strategy.deserialize('{}')).toEqual({})
    })

    it('throws on malformed JSON', () => {
      const strategy = createStrategy()
      expect(() => strategy.deserialize('not-json')).toThrow()
    })
  })
})
