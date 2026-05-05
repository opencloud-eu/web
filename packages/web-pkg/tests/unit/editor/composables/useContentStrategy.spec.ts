import { vi, describe, it, expect } from 'vitest'
import { ref } from 'vue'
import type { TextEditorState } from '../../../../src/editor/types'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

import { useContentStrategy } from '../../../../src/editor/composables/useContentStrategy'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'

function createState(): TextEditorState {
  return { sourceMode: ref(false) }
}

describe('useContentStrategy', () => {
  beforeEach(() => {
    createTestingPinia()
  })

  describe('resolveStrategy', () => {
    const { resolveStrategy } = useContentStrategy()

    it('returns a strategy for plain-text', () => {
      const strategy = resolveStrategy('plain-text', createState())
      expect(strategy.serialize).toBeTypeOf('function')
      expect(strategy.deserialize).toBeTypeOf('function')
      expect(strategy.extensions).toBeTypeOf('function')
      expect(strategy.editorActionGroups).toBeTypeOf('function')
    })

    it('returns a strategy for markdown', () => {
      const strategy = resolveStrategy('markdown', createState())
      expect(strategy.serialize).toBeTypeOf('function')
    })

    it('returns a strategy for html', () => {
      const strategy = resolveStrategy('html', createState())
      expect(strategy.serialize).toBeTypeOf('function')
    })

    it('returns a strategy for tiptap-json', () => {
      const strategy = resolveStrategy('tiptap-json', createState())
      expect(strategy.serialize).toBeTypeOf('function')
    })

    it('throws for unknown content type', () => {
      expect(() => resolveStrategy('unknown' as any, createState())).toThrow(
        'Unknown content type: unknown'
      )
    })
  })
})
