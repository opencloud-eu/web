import { vi, describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { getSchema } from '@tiptap/core'
import type { TextEditorLinkPanelRequest, TextEditorState } from '../../../../src/editor/types'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

import { useStrategyMarkdown } from '../../../../src/editor/composables/strategies/markdown'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'

function createStrategy() {
  const state: TextEditorState = {
    sourceMode: ref(false),
    linkPanel: ref<TextEditorLinkPanelRequest | null>(null),
    editorZoom: ref(100)
  }
  return useStrategyMarkdown(state)
}

describe('useStrategyMarkdown', () => {
  beforeEach(() => {
    createTestingPinia()
  })

  describe('extensions', () => {
    it('includes markdown-relevant extensions but not underline', () => {
      const strategy = createStrategy()
      const extensions = strategy.extensions()
      const names = extensions.map((e) => e.name)
      expect(names).toContain('link')
      expect(names).toContain('table')
      expect(names).toContain('taskList')
      expect(names).toContain('image')
      expect(names).toContain('fileHandler')
      expect(names).toContain('findAndReplace')
      expect(names).not.toContain('underline')

      const imageExtension = extensions.find((e) => e.name === 'image') as any
      expect(imageExtension.options.allowBase64).toBe(true)
      expect(imageExtension.options.resize).toMatchObject({
        enabled: true,
        minWidth: 50,
        minHeight: 50,
        alwaysPreserveAspectRatio: true
      })
    })

    it('renders resized images as html img to persist width and height in markdown', () => {
      const strategy = createStrategy()
      const imageExtension = strategy.extensions().find((e) => e.name === 'image') as any

      const markdown = imageExtension.config.renderMarkdown({
        attrs: {
          src: 'data:image/png;base64,abc123',
          alt: 'diagram',
          title: 'doc',
          width: 320,
          height: 180
        }
      })

      expect(markdown).toContain('<img ')
      expect(markdown).toContain('src="data:image/png;base64,abc123"')
      expect(markdown).toContain('width="320"')
      expect(markdown).toContain('height="180"')
    })

    it('configures safe automatic links without opening them on click', () => {
      const link = createStrategy()
        .extensions()
        .find(({ name }) => name === 'link')!
      expect(link.options).toMatchObject({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: 'https'
      })
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

    it('places search group at the end', () => {
      const strategy = createStrategy()
      const groupIds = strategy.editorActionGroups().map((g) => g.id)
      expect(groupIds.at(-1)).toBe('search')
    })

    it('keeps navigation, source toggle and search actions in dedicated groups', () => {
      const strategy = createStrategy()
      const groups = strategy.editorActionGroups()
      const navigationIds =
        groups.find((g) => g.id === 'navigation')?.actions.map((a) => a.id) || []
      const sourceGroupIds =
        groups.find((g) => g.id === 'view-options')?.actions.map((a) => a.id) || []
      const searchGroupIds = groups.find((g) => g.id === 'search')?.actions.map((a) => a.id) || []

      expect(navigationIds).toEqual(['undo', 'redo', 'menu-zoom'])
      expect(sourceGroupIds).toEqual(['source-mode'])
      expect(searchGroupIds).toEqual(['menu-search-and-replace'])
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
    it('renders a ProseMirror document to markdown', () => {
      const strategy = createStrategy()
      const schema = getSchema(strategy.extensions())
      const doc = schema.nodeFromJSON({
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Hello' }] }
        ]
      })
      expect(strategy.serialize(doc)).toBe('# Hello')
    })
  })

  describe('deserialize', () => {
    it('returns markdown string as-is', () => {
      const strategy = createStrategy()
      expect(strategy.deserialize('# Hello')).toBe('# Hello')
    })
  })
})
