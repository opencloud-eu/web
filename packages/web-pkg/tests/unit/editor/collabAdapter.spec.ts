import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import * as Y from 'yjs'
import { Editor } from '@tiptap/core'
import { Collaboration } from '@tiptap/extension-collaboration'
import type { TextEditorLinkPanelRequest, TextEditorState } from '../../../src/editor/types'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

import { makeTiptapCollabAdapter } from '../../../src/editor/collabAdapter'
import { useStrategyMarkdown } from '../../../src/editor/composables/strategies/markdown'
import { useStrategyPlainText } from '../../../src/editor/composables/strategies/plainText'
import type { ContentTypeStrategy } from '../../../src/editor/composables/strategies/types'
import { DEFAULT_YDOC_FRAGMENT } from '../../../src/editor/types'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'

function createState(): TextEditorState {
  return {
    sourceMode: ref(false),
    linkPanel: ref<TextEditorLinkPanelRequest | null>(null),
    editorZoom: ref(100)
  }
}

/** An editor bound to the shared doc, the way the mounted app binds one. */
function boundEditor(strategy: ContentTypeStrategy, ydoc: Y.Doc): Editor {
  return new Editor({
    element: document.createElement('div'),
    extensions: [
      ...strategy.extensions({ collaborative: true }),
      Collaboration.configure({ document: ydoc, field: DEFAULT_YDOC_FRAGMENT })
    ]
  })
}

const MARKDOWN = [
  '# Title',
  '',
  'Some **bold** text with a [link](https://example.com).',
  '',
  '- one',
  '- two',
  '',
  '## Section',
  '',
  'Trailing paragraph.'
].join('\n')

describe('makeTiptapCollabAdapter', () => {
  beforeEach(() => {
    createTestingPinia()
  })

  describe('serialize', () => {
    it('round-trips markdown through the shared doc', () => {
      const strategy = useStrategyMarkdown(createState())
      const adapter = makeTiptapCollabAdapter(strategy)
      const ydoc = new Y.Doc()

      adapter.hydrate(ydoc, MARKDOWN)

      expect(adapter.serialize(ydoc)).toBe(MARKDOWN)
      ydoc.destroy()
    })

    it('matches what an editor bound to the same doc produces', () => {
      const strategy = useStrategyMarkdown(createState())
      const adapter = makeTiptapCollabAdapter(strategy)
      const ydoc = new Y.Doc()
      adapter.hydrate(ydoc, MARKDOWN)

      const editor = boundEditor(strategy, ydoc)
      expect(adapter.serialize(ydoc)).toBe(strategy.serialize(editor.state.doc))

      editor.destroy()
      ydoc.destroy()
    })

    it('picks up edits a bound editor makes', () => {
      const strategy = useStrategyMarkdown(createState())
      const adapter = makeTiptapCollabAdapter(strategy)
      const ydoc = new Y.Doc()
      adapter.hydrate(ydoc, MARKDOWN)

      const editor = boundEditor(strategy, ydoc)
      editor.commands.insertContentAt(editor.state.doc.content.size, {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Appended.' }]
      })

      expect(adapter.serialize(ydoc)).toBe(`${MARKDOWN}\n\nAppended.`)

      editor.destroy()
      ydoc.destroy()
    })

    it('does not write to the Y.Doc', () => {
      const strategy = useStrategyMarkdown(createState())
      const adapter = makeTiptapCollabAdapter(strategy)
      const ydoc = new Y.Doc()
      adapter.hydrate(ydoc, MARKDOWN)

      let updates = 0
      ydoc.on('update', () => updates++)
      adapter.serialize(ydoc)
      adapter.serialize(ydoc)

      expect(updates).toBe(0)
      ydoc.destroy()
    })

    it('serializes plain text with single newlines between blocks', () => {
      const strategy = useStrategyPlainText(createState())
      const adapter = makeTiptapCollabAdapter(strategy)
      const ydoc = new Y.Doc()
      const content = 'first line\nsecond line\n\nfourth line'

      adapter.hydrate(ydoc, content)

      expect(adapter.serialize(ydoc)).toBe(content)
      ydoc.destroy()
    })

    it('resolves the strategy per call, not at build time', () => {
      // The adapter is built before the file is loaded, so the content type is
      // only known once the resource is there.
      let strategy: ContentTypeStrategy | null = null
      const adapter = makeTiptapCollabAdapter(() => strategy!)
      const ydoc = new Y.Doc()

      strategy = useStrategyMarkdown(createState())
      adapter.hydrate(ydoc, MARKDOWN)

      expect(adapter.serialize(ydoc)).toBe(MARKDOWN)
      ydoc.destroy()
    })
  })

  describe('hasContent', () => {
    it('is false for an untouched doc and true after hydration', () => {
      const strategy = useStrategyMarkdown(createState())
      const adapter = makeTiptapCollabAdapter(strategy)
      const ydoc = new Y.Doc()

      expect(adapter.hasContent(ydoc)).toBe(false)
      adapter.hydrate(ydoc, MARKDOWN)
      expect(adapter.hasContent(ydoc)).toBe(true)

      ydoc.destroy()
    })
  })

  describe('reset', () => {
    it('empties the fragment so the doc can be hydrated again', () => {
      const strategy = useStrategyMarkdown(createState())
      const adapter = makeTiptapCollabAdapter(strategy)
      const ydoc = new Y.Doc()
      adapter.hydrate(ydoc, MARKDOWN)

      adapter.reset!(ydoc)
      expect(adapter.hasContent(ydoc)).toBe(false)

      adapter.hydrate(ydoc, '# Fresh\n\nBody.')
      expect(adapter.serialize(ydoc)).toBe('# Fresh\n\nBody.')

      ydoc.destroy()
    })
  })
})
