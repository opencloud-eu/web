import { vi, describe, it, expect } from 'vitest'
import { ref, shallowRef } from 'vue'
import { Editor } from '@tiptap/core'
import type { TableOfContentData } from '@tiptap/extension-table-of-contents'
import type { TextEditorLinkPanelRequest, TextEditorState } from '../../../../src/editor/types'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

import { useStrategyMarkdown } from '../../../../src/editor/composables/strategies/markdown'
import { useStrategyTiptapJson } from '../../../../src/editor/composables/strategies/tiptapJson'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'

function createState(): TextEditorState {
  return {
    sourceMode: ref(false),
    linkPanel: ref<TextEditorLinkPanelRequest | null>(null),
    editorZoom: ref(100),
    tableOfContents: shallowRef<TableOfContentData>([])
  }
}

function createEditor(options: ConstructorParameters<typeof Editor>[0]): Promise<Editor> {
  return new Promise((resolve) => {
    const editor = new Editor({
      element: document.createElement('div'),
      ...options,
      onCreate: () => resolve(editor)
    })
  })
}

describe('table of contents', () => {
  beforeEach(() => {
    createTestingPinia()
  })

  describe('markdown strategy', () => {
    it('collects the headings into the editor state', async () => {
      const state = createState()
      const strategy = useStrategyMarkdown(state)
      const editor = await createEditor({
        extensions: strategy.extensions(),
        contentType: 'markdown',
        content: '# Title\n\ntext\n\n## Section\n\n### Detail\n\n## Other'
      })

      const items = state.tableOfContents!.value
      expect(items.map(({ textContent, level }) => [textContent, level])).toEqual([
        ['Title', 1],
        ['Section', 2],
        ['Detail', 3],
        ['Other', 2]
      ])
      expect(new Set(items.map(({ id }) => id)).size).toBe(4)

      editor.destroy()
    })

    it('keeps the heading ids out of the serialized markdown', async () => {
      const state = createState()
      const strategy = useStrategyMarkdown(state)
      const content = '# Title\n\n## Section'
      const editor = await createEditor({
        extensions: strategy.extensions(),
        contentType: 'markdown',
        content
      })

      expect(editor.state.doc.firstChild!.attrs['data-toc-id']).toBeTruthy()
      const markdown = strategy.serialize(editor.state.doc)
      expect(markdown.trim()).toBe(content)
      expect(markdown).not.toContain('toc')

      editor.destroy()
    })

    it('follows edits to the headings', async () => {
      const state = createState()
      const strategy = useStrategyMarkdown(state)
      const editor = await createEditor({
        extensions: strategy.extensions(),
        contentType: 'markdown',
        content: '# Title'
      })

      editor.commands.insertContentAt(editor.state.doc.content.size, '## Added', {
        contentType: 'markdown'
      })

      expect(state.tableOfContents!.value.map(({ textContent }) => textContent)).toEqual([
        'Title',
        'Added'
      ])

      editor.destroy()
    })
  })

  describe('tiptap-json strategy', () => {
    it('collects the headings and persists their ids', async () => {
      const state = createState()
      const strategy = useStrategyTiptapJson(state)
      const editor = await createEditor({
        extensions: strategy.extensions(),
        content: {
          type: 'doc',
          content: [
            { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
            { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Section' }] }
          ]
        }
      })

      const items = state.tableOfContents!.value
      expect(items.map(({ textContent }) => textContent)).toEqual(['Title', 'Section'])

      const serialized = JSON.parse(strategy.serialize(editor.state.doc))
      expect(serialized.content[0].attrs['data-toc-id']).toBe(items[0].id)
      expect(serialized.content[1].attrs['data-toc-id']).toBe(items[1].id)

      editor.destroy()
    })
  })

  it('leaves a state without a table of contents alone', async () => {
    const state = createState()
    delete state.tableOfContents
    const strategy = useStrategyMarkdown(state)

    const editor = await createEditor({
      extensions: strategy.extensions(),
      contentType: 'markdown',
      content: '# Title'
    })

    expect(editor.state.doc.firstChild!.attrs['data-toc-id']).toBeTruthy()

    editor.destroy()
  })
})
