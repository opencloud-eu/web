import { vi, describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { getSchema } from '@tiptap/core'
import type { TextEditorLinkPanelRequest, TextEditorState } from '../../../../src/editor/types'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

import { useStrategyHtml } from '../../../../src/editor/composables/strategies/html'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'

function createStrategy() {
  const state: TextEditorState = {
    sourceMode: ref(false),
    linkPanel: ref<TextEditorLinkPanelRequest | null>(null),
    editorZoom: ref(100)
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
      expect(names).toContain('fileHandler')
      expect(names).toContain('link')
      expect(names).toContain('table')
      expect(names).toContain('taskList')
      expect(names).toContain('findAndReplace')
      expect(names).toContain('codeBlock')
    })

    it('configures code block lowlight', () => {
      const codeBlock = createStrategy()
        .extensions()
        .find(({ name }) => name === 'codeBlock') as any
      expect(codeBlock.options.lowlight).toBeDefined()
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
      expect(allIds).toContain('image')
      expect(allIds).toContain('image-url')
      expect(allIds).toContain('image-upload')
      expect(allIds).toContain('table')
      expect(allIds).toContain('delete-table')
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

    it('puts table editing actions into a dedicated table tools group', () => {
      const strategy = createStrategy()
      const insertGroup = strategy.editorActionGroups().find((group) => group.id === 'insert')
      const tableToolsGroup = strategy
        .editorActionGroups()
        .find((group) => group.id === 'table-tools')

      expect(insertGroup?.actions.map((action) => action.id)).toContain('table')
      expect(insertGroup?.actions.map((action) => action.id)).not.toContain('add-row-before')
      expect(tableToolsGroup?.actions.map((action) => action.id)).toEqual([
        'toggle-header-row',
        'add-row-before',
        'add-row-after',
        'delete-row',
        'add-column-before',
        'add-column-after',
        'delete-column',
        'delete-table'
      ])
    })

    it('puts text align menu in the text layout group with line height', () => {
      const strategy = createStrategy()
      const textLayoutGroup = strategy
        .editorActionGroups()
        .find((group) => group.id === 'text-layout')
      const textAlignGroup = strategy
        .editorActionGroups()
        .find((group) => group.id === 'text-align')
      expect(textLayoutGroup?.actions.map((action) => action.id)).toEqual([
        'text-align',
        'line-height'
      ])
      expect(textLayoutGroup?.actions[0].childActions?.map((action) => action.id)).toEqual([
        'align-left',
        'align-center',
        'align-right',
        'align-justify'
      ])
      expect(
        textAlignGroup?.actions
          .filter((action) => action.id.startsWith('align-'))
          .every((action) => action.showInToolbar === false)
      ).toBe(true)
      const listsGroup = strategy.editorActionGroups().find((group) => group.id === 'lists')
      expect(listsGroup?.actions.map((action) => action.id)).toEqual([
        'bullet-list',
        'ordered-list',
        'task-list'
      ])
      const groupIds = strategy.editorActionGroups().map((group) => group.id)
      expect(groupIds.indexOf('text-layout')).toBeGreaterThan(groupIds.indexOf('lists'))
      expect(groupIds.indexOf('text-align')).toBeGreaterThan(groupIds.indexOf('lists'))
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
  })

  describe('serialize', () => {
    it('renders a ProseMirror document to HTML', () => {
      const strategy = createStrategy()
      const schema = getSchema(strategy.extensions())
      const doc = schema.nodeFromJSON({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }]
      })
      expect(strategy.serialize(doc)).toBe('<p>hi</p>')
    })
  })

  describe('deserialize', () => {
    it('returns HTML string as-is', () => {
      const strategy = createStrategy()
      expect(strategy.deserialize('<p>hello</p>')).toBe('<p>hello</p>')
    })
  })
})
