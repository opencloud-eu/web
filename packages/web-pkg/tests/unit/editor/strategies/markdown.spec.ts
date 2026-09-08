import { vi, describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { getSchema } from '@tiptap/core'
import type { TextEditorLinkPanelRequest, TextEditorState } from '../../../../src/editor/types'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

import { useStrategyMarkdown } from '../../../../src/editor/composables/strategies/markdown'
import { createMockEditor } from '../composables/helpers'
import type { EditorAction } from '../../../../src/editor/composables/useEditorActions'
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
      expect(names).toContain('codeBlock')
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

    it('configures code block lowlight', () => {
      const codeBlock = createStrategy()
        .extensions()
        .find(({ name }) => name === 'codeBlock') as any
      expect(codeBlock.options.lowlight).toBeDefined()
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

  // Inside the frontmatter block the document is raw metadata text, so anything
  // that formats or inserts content has nothing to act on.
  describe('actions inside the frontmatter block', () => {
    const allowed = [
      'undo',
      'redo',
      'menu-zoom',
      'source-mode',
      'frontmatter',
      'menu-emoji',
      'menu-search-and-replace',
      'print'
    ]

    function flatten(actions: EditorAction[]): EditorAction[] {
      return actions.flatMap((action) => [action, ...flatten(action.childActions ?? [])])
    }

    function allActions() {
      return flatten(
        createStrategy()
          .editorActionGroups()
          .flatMap(({ actions }) => actions)
      )
    }

    function editorIn(nodeName: string) {
      return createMockEditor({
        canUndo: true,
        canRedo: true,
        isActive: (type) => type === nodeName
      })
    }

    it('enables only navigation, view and frontmatter actions', () => {
      const editor = editorIn('frontmatter')
      const enabled = createStrategy()
        .editorActionGroups()
        .flatMap(({ actions }) => actions)
        .filter((action) => action.isEnabled?.(editor) ?? true)
        .map(({ id }) => id)

      expect(enabled.sort()).toEqual([...allowed].sort())
    })

    it('disables nested actions as well', () => {
      const editor = editorIn('frontmatter')
      const enabled = allActions()
        .filter((action) => action.isEnabled?.(editor) ?? true)
        .map(({ id }) => id)

      expect(enabled.filter((id) => !allowed.includes(id) && !id.startsWith('zoom-'))).toEqual([])
    })

    it('offers the emoji slash entry in the frontmatter block', () => {
      const editor = editorIn('frontmatter')
      const slashItems = allActions()
        .filter((action) => action.showInSlashCommands !== false)
        .filter((action) => action.isEnabled?.(editor) ?? true)
        .map(({ id }) => id)

      expect(slashItems).toEqual(['menu-emoji'])
    })

    it('leaves everything enabled outside the block', () => {
      const editor = editorIn('paragraph')
      const enabled = allActions()
        .filter((action) => action.isEnabled?.(editor) ?? true)
        .map(({ id }) => id)

      expect(enabled).toEqual(expect.arrayContaining(['bold', 'link', 'image', 'table']))
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
      expect(allIds).toContain('image-cloud')
      expect(allIds).toContain('link')
      const link = strategy
        .editorActionGroups()
        .flatMap(({ actions }) => actions)
        .find(({ id }) => id === 'link')!
      expect(link.slashCommandAction).toBeTypeOf('function')
      expect(link.showInToolbar).not.toBe(false)
      expect(link.showInSlashCommands).not.toBe(false)
    })

    it('offers the frontmatter toggle in the insert group but not in the slash menu', () => {
      const strategy = createStrategy()
      const insertIds =
        strategy
          .editorActionGroups()
          .find(({ id }) => id === 'insert')
          ?.actions.map(({ id }) => id) ?? []
      expect(insertIds.at(-1)).toBe('frontmatter')

      const frontmatter = strategy
        .editorActionGroups()
        .flatMap(({ actions }) => actions)
        .find(({ id }) => id === 'frontmatter')!
      expect(frontmatter.slashCommandAction).toBeTypeOf('function')
      expect(frontmatter.showInSlashCommands).toBe(false)
    })

    it('includes source mode toggle', () => {
      const strategy = createStrategy()
      const allIds = strategy.editorActionGroups().flatMap((g) => g.actions.map((a) => a.id))
      expect(allIds).toContain('source-mode')
    })

    it('places export group at the end', () => {
      const strategy = createStrategy()
      const groupIds = strategy.editorActionGroups().map((g) => g.id)
      expect(groupIds.at(-1)).toBe('export')
    })

    it('keeps navigation, source toggle, search and export actions in dedicated groups', () => {
      const strategy = createStrategy()
      const groups = strategy.editorActionGroups()
      const navigationIds =
        groups.find((g) => g.id === 'navigation')?.actions.map((a) => a.id) || []
      const sourceGroupIds =
        groups.find((g) => g.id === 'view-options')?.actions.map((a) => a.id) || []
      const searchGroupIds = groups.find((g) => g.id === 'search')?.actions.map((a) => a.id) || []
      const exportGroupIds = groups.find((g) => g.id === 'export')?.actions.map((a) => a.id) || []

      expect(navigationIds).toEqual(['undo', 'redo', 'menu-zoom'])
      expect(sourceGroupIds).toEqual(['source-mode'])
      expect(searchGroupIds).toEqual(['menu-search-and-replace'])
      expect(exportGroupIds).toEqual(['print'])
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
