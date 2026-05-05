import { vi, describe, it, expect } from 'vitest'
import { ref } from 'vue'
import type { TextEditorState } from '../../../../src/editor/types'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

import { useStrategyMarkdown } from '../../../../src/editor/composables/strategies/markdown'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'

function createStrategy() {
  const state: TextEditorState = { sourceMode: ref(false) }
  return useStrategyMarkdown(state)
}

describe('useStrategyMarkdown', () => {
  beforeEach(() => {
    createTestingPinia()
  })

  describe('extensions', () => {
    it('includes markdown-relevant extensions but not underline', () => {
      const strategy = createStrategy()
      const names = strategy.extensions().map((e) => e.name)
      expect(names).toContain('link')
      expect(names).toContain('table')
      expect(names).toContain('taskList')
      expect(names).toContain('image')
      expect(names).not.toContain('underline')
    })
  })

  describe('editorActionGroups', () => {
    it('does not include underline action but includes image actions', () => {
      const strategy = createStrategy()
      const allIds = strategy.editorActionGroups().flatMap((g) => g.actions.map((a) => a.id))
      expect(allIds).toContain('bold')
      expect(allIds).not.toContain('underline')
      expect(allIds).not.toContain('image')
      expect(allIds).toContain('image-url')
      expect(allIds).toContain('image-upload')
    })

    it('includes source mode toggle', () => {
      const strategy = createStrategy()
      const allIds = strategy.editorActionGroups().flatMap((g) => g.actions.map((a) => a.id))
      expect(allIds).toContain('source-mode')
    })

    it('returns expected group structure', () => {
      const strategy = createStrategy()
      const groupIds = strategy.editorActionGroups().map((g) => g.id)
      expect(groupIds).toContain('basic-blocks')
      expect(groupIds).toContain('lists')
      expect(groupIds).toContain('advanced')
    })
  })

  describe('serialize', () => {
    it('calls getMarkdown on editor', () => {
      const strategy = createStrategy()
      const mockEditor = { getMarkdown: vi.fn().mockReturnValue('# Hello') } as any
      expect(strategy.serialize(mockEditor)).toBe('# Hello')
      expect(mockEditor.getMarkdown).toHaveBeenCalled()
    })
  })

  describe('deserialize', () => {
    it('returns markdown string as-is', () => {
      const strategy = createStrategy()
      expect(strategy.deserialize('# Hello')).toBe('# Hello')
    })
  })
})
