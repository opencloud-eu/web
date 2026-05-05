import { vi, describe, it, expect } from 'vitest'
import { ref } from 'vue'
import type { TextEditorState } from '../../../../src/editor/types'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

import { useStrategyTiptapJson } from '../../../../src/editor/composables/strategies/tiptapJson'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'

function createStrategy() {
  const state: TextEditorState = { sourceMode: ref(false) }
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
    })
  })

  describe('serialize', () => {
    it('returns JSON string from editor', () => {
      const strategy = createStrategy()
      const doc = { type: 'doc', content: [] as unknown[] }
      const mockEditor = { getJSON: vi.fn().mockReturnValue(doc) } as any
      expect(strategy.serialize(mockEditor)).toBe(JSON.stringify(doc))
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
