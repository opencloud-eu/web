import { vi, describe, it, expect } from 'vitest'
import { ref } from 'vue'
import type { TextEditorState } from '../../../../src/editor/types'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

import { useStrategyMarkdown } from '../../../../src/editor/composables/strategies/markdown'

function createStrategy() {
  const state: TextEditorState = { sourceMode: ref(false) }
  return useStrategyMarkdown(state)
}

describe('useStrategyMarkdown', () => {
  describe('extensions', () => {
    it('includes markdown-relevant extensions but not underline or image', () => {
      const strategy = createStrategy()
      const names = strategy.extensions().map((e) => e.name)
      expect(names).toContain('link')
      expect(names).toContain('table')
      expect(names).toContain('taskList')
      expect(names).not.toContain('underline')
      expect(names).not.toContain('image')
    })
  })

  describe('editorActionGroups', () => {
    it('does not include underline or image actions', () => {
      const strategy = createStrategy()
      const allIds = strategy
        .editorActionGroups()
        .flatMap((g) => g.actions.map((a) => a.id))
      expect(allIds).toContain('bold')
      expect(allIds).not.toContain('underline')
      expect(allIds).not.toContain('image')
    })

    it('includes source mode toggle', () => {
      const strategy = createStrategy()
      const allIds = strategy
        .editorActionGroups()
        .flatMap((g) => g.actions.map((a) => a.id))
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
