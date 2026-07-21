import { vi, describe, it, expect } from 'vitest'
import { ref } from 'vue'
import type { TextEditorLinkPanelRequest, TextEditorState } from '../../../../src/editor/types'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

import { useStrategyHtml } from '../../../../src/editor/composables/strategies/html'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'

function createStrategy() {
  const state: TextEditorState = {
    sourceMode: ref(false),
    linkPanel: ref<TextEditorLinkPanelRequest | null>(null)
  }
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
      expect(names).toContain('link')
      expect(names).toContain('table')
      expect(names).toContain('taskList')
    })

    it('configures safe automatic links without opening them on click', () => {
      const link = createStrategy()
        .extensions()
        .find(({ name }) => name === 'link')!
      expect(link.options).toMatchObject({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true
      })
    })
  })

  describe('editorActionGroups', () => {
    it('includes formatting and structure actions', () => {
      const strategy = createStrategy()
      const allIds = strategy.editorActionGroups().flatMap((g) => g.actions.map((a) => a.id))
      expect(allIds).toContain('underline')
      expect(allIds).toContain('bold')
      expect(allIds).toContain('table-menu')
      expect(allIds).toContain('font-size')
      expect(allIds).toContain('link')
      const link = strategy
        .editorActionGroups()
        .flatMap(({ actions }) => actions)
        .find(({ id }) => id === 'link')!
      expect(link.slashCommandAction).toBeTypeOf('function')
      expect(link.showInToolbar).not.toBe(false)
      expect(link.showInSlashCommands).not.toBe(false)
    })

    it('includes source mode toggle', () => {
      const strategy = createStrategy()
      const allIds = strategy.editorActionGroups().flatMap((g) => g.actions.map((a) => a.id))
      expect(allIds).toContain('source-mode')
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
