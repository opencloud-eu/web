import { vi, describe, it, expect } from 'vitest'
import { ref } from 'vue'
import type { TextEditorState } from '../../../../src/editor/types'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

import { useStrategyMarkdown } from '../../../../src/editor/composables/strategies/markdown'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'

function createStrategy() {
  const state: TextEditorState = { sourceMode: ref(false), editorZoom: ref(100) }
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
      expect(allIds).toContain('image')
      expect(allIds).toContain('image-url')
      expect(allIds).toContain('image-upload')
    })

    it('includes source mode toggle', () => {
      const strategy = createStrategy()
      const allIds = strategy.editorActionGroups().flatMap((g) => g.actions.map((a) => a.id))
      expect(allIds).toContain('source-mode')
    })

    it('places view options group at the end', () => {
      const strategy = createStrategy()
      const groupIds = strategy.editorActionGroups().map((g) => g.id)
      expect(groupIds.at(-1)).toBe('zoom')
    })

    it('keeps source toggle next to history and zoom in the rightmost group', () => {
      const strategy = createStrategy()
      const groups = strategy.editorActionGroups()
      const historyIds = groups.find((g) => g.id === 'history')?.actions.map((a) => a.id) || []
      const sourceGroupIds =
        groups.find((g) => g.id === 'view-options')?.actions.map((a) => a.id) || []
      const zoomGroupIds = groups.find((g) => g.id === 'zoom')?.actions.map((a) => a.id) || []

      expect(historyIds).not.toContain('menu-zoom')
      expect(sourceGroupIds).toEqual(['source-mode'])
      expect(zoomGroupIds).toEqual(['menu-zoom'])
    })

    it('returns expected group structure', () => {
      const strategy = createStrategy()
      const groupIds = strategy.editorActionGroups().map((g) => g.id)
      expect(groupIds).toContain('formatting')
      expect(groupIds).toContain('lists')
      expect(groupIds).toContain('insert')
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
