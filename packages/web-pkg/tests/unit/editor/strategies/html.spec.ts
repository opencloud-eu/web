import { vi, describe, it, expect } from 'vitest'
import { ref } from 'vue'
import type { TextEditorState } from '../../../../src/editor/types'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

import { useStrategyHtml } from '../../../../src/editor/composables/strategies/html'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'

function createStrategy() {
  const state: TextEditorState = { sourceMode: ref(false), editorZoom: ref(100) }
  return useStrategyHtml(state)
}

describe('useStrategyHtml', () => {
  beforeEach(() => {
    createTestingPinia()
  })

  describe('extensions', () => {
    it('includes rich text extensions', () => {
      const strategy = createStrategy()
      const names = strategy.extensions().map((e) => e.name)
      expect(names).toContain('underline')
      expect(names).toContain('image')
      expect(names).toContain('fileHandler')
      expect(names).toContain('link')
      expect(names).toContain('table')
      expect(names).toContain('taskList')
    })
  })

  describe('editorActionGroups', () => {
    it('includes formatting and structure actions', () => {
      const strategy = createStrategy()
      const allIds = strategy.editorActionGroups().flatMap((g) => g.actions.map((a) => a.id))
      expect(allIds).toContain('underline')
      expect(allIds).toContain('bold')
      expect(allIds).toContain('image')
      expect(allIds).toContain('image-url')
      expect(allIds).toContain('image-upload')
      expect(allIds).toContain('table-menu')
      expect(allIds).toContain('font-size')
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
  })

  describe('serialize', () => {
    it('calls getHTML on editor', () => {
      const strategy = createStrategy()
      const mockEditor = { getHTML: vi.fn().mockReturnValue('<p>hi</p>') } as any
      expect(strategy.serialize(mockEditor)).toBe('<p>hi</p>')
      expect(mockEditor.getHTML).toHaveBeenCalled()
    })
  })

  describe('deserialize', () => {
    it('returns HTML string as-is', () => {
      const strategy = createStrategy()
      expect(strategy.deserialize('<p>hello</p>')).toBe('<p>hello</p>')
    })
  })
})
