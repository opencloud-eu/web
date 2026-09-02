import { ref } from 'vue'
import { Editor } from '@tiptap/vue-3'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import { useStrategyMarkdown } from '../../../../src/editor/composables/strategies/markdown'
import type { TextEditorLinkPanelRequest, TextEditorState } from '../../../../src/editor/types'
import type { ContentTypeStrategy } from '../../../../src/editor/composables/strategies/types'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

function createStrategy(): ContentTypeStrategy {
  const state: TextEditorState = {
    sourceMode: ref(false),
    linkPanel: ref<TextEditorLinkPanelRequest | null>(null),
    editorZoom: ref(100)
  }
  return useStrategyMarkdown(state)
}

function createEditor(strategy: ContentTypeStrategy, content: string): Editor {
  return new Editor({
    extensions: strategy.extensions(),
    content: strategy.deserialize(content),
    contentType: 'markdown'
  })
}

function frontmatterDepths(editor: Editor): number[] {
  const depths: number[] = []
  editor.state.doc.descendants((node, _pos, parent) => {
    if (node.type.name === 'frontmatter') {
      depths.push(parent?.type.name === 'doc' ? 0 : 1)
    }
    return true
  })

  return depths
}

/**
 * Fences that open a document are metadata, fences anywhere else are not. Every
 * case here is a place `---` can legitimately appear, plus the containers that
 * lex their contents with their own token list.
 *
 * `blocksAtTop` is how many frontmatter blocks the document should end up with.
 * `keeps` are strings that must survive parsing, so that a rejected node can
 * never take surrounding content with it.
 */
const documents: { name: string; markdown: string; blocksAtTop: number; keeps: string[] }[] = [
  {
    name: 'fenced code block',
    markdown: '# H\n\n```\n---\na: 1\n---\n```',
    blocksAtTop: 0,
    keeps: ['a: 1']
  },
  {
    name: 'tilde fenced code',
    markdown: '# H\n\n~~~\n---\na: 1\n---\n~~~',
    blocksAtTop: 0,
    keeps: ['a: 1']
  },
  {
    name: 'fenced code opening the document',
    markdown: '```\n---\na: 1\n---\n```',
    blocksAtTop: 0,
    keeps: ['a: 1']
  },
  {
    name: 'indented code block',
    markdown: '# H\n\n    ---\n    a: 1\n    ---',
    blocksAtTop: 0,
    keeps: ['a: 1']
  },
  {
    name: 'blockquote',
    markdown: '> ---\n> a: 1\n> ---\n\nFoo',
    blocksAtTop: 0,
    keeps: ['a: 1', 'Foo']
  },
  {
    name: 'nested blockquote',
    markdown: '> > ---\n> > a: 1\n> > ---\n\nFoo',
    blocksAtTop: 0,
    keeps: ['a: 1', 'Foo']
  },
  { name: 'list item', markdown: '- ---\n  a: 1\n  ---\n\nFoo', blocksAtTop: 0, keeps: ['Foo'] },
  { name: 'table', markdown: '| a |\n|---|\n| --- |\n\nFoo', blocksAtTop: 0, keeps: ['Foo'] },
  { name: 'html block', markdown: '<div>\n---\n</div>\n\nFoo', blocksAtTop: 0, keeps: ['Foo'] },
  {
    name: 'setext heading',
    markdown: 'Title\n---\n\nFoo',
    blocksAtTop: 0,
    keeps: ['Title', 'Foo']
  },
  {
    name: 'thematic break opening the document',
    markdown: '---\n\nFoo',
    blocksAtTop: 0,
    keeps: ['Foo']
  },
  {
    name: 'blank line before the fences',
    markdown: '\n---\na: 1\n---\n\nFoo',
    blocksAtTop: 0,
    keeps: ['Foo']
  },
  { name: 'empty document', markdown: '', blocksAtTop: 0, keeps: [] },
  {
    name: 'metadata then list',
    markdown: '---\na: 1\n---\n\n- x\n- y',
    blocksAtTop: 1,
    keeps: ['x', 'y']
  },
  {
    name: 'metadata then table',
    markdown: '---\na: 1\n---\n\n| a |\n|---|\n| b |',
    blocksAtTop: 1,
    keeps: ['b']
  },
  {
    name: 'metadata then blockquote',
    markdown: '---\na: 1\n---\n\n> quoted',
    blocksAtTop: 1,
    keeps: ['quoted']
  },
  {
    name: 'metadata then fenced code',
    markdown: '---\na: 1\n---\n\n```\n---\n```',
    blocksAtTop: 1,
    keeps: []
  },
  {
    name: 'metadata holding fence characters',
    markdown: '---\ncode: "```"\n---\n\nFoo',
    blocksAtTop: 1,
    keeps: ['Foo']
  },
  {
    name: 'metadata holding dashes',
    markdown: '---\na: "---"\n---\n\nFoo',
    blocksAtTop: 1,
    keeps: ['Foo']
  },
  {
    name: 'crlf line endings',
    markdown: '---\r\na: 1\r\n---\r\n\r\nFoo',
    blocksAtTop: 1,
    keeps: ['Foo']
  },
  {
    name: 'trailing spaces on the fences',
    markdown: '---  \na: 1\n---  \n\nFoo',
    blocksAtTop: 1,
    keeps: ['Foo']
  },
  { name: 'metadata only', markdown: '---\na: 1\n---', blocksAtTop: 1, keeps: [] },
  { name: 'empty metadata only', markdown: '---\n---', blocksAtTop: 1, keeps: [] },
  {
    name: 'thematic break in the body',
    markdown: '---\na: 1\n---\n\nFoo\n\n---\n\nBar',
    blocksAtTop: 1,
    keeps: ['Foo', 'Bar']
  }
]

describe('frontmatter parsing', () => {
  beforeEach(() => {
    createTestingPinia()
  })

  // A node the schema rejects survives `Node.fromJSON`, which does not validate,
  // and is destroyed later by a path that does, taking its neighbours with it.
  // Checking the document catches that at the source.
  it.each(documents.map((entry) => [entry.name, entry] as const))(
    'parses %s into a valid document',
    (_name, entry) => {
      const editor = createEditor(createStrategy(), entry.markdown)

      expect(() => editor.state.doc.check()).not.toThrow()
      editor.destroy()
    }
  )

  it.each(documents.map((entry) => [entry.name, entry] as const))(
    'reads the fences in %s correctly',
    (_name, entry) => {
      const editor = createEditor(createStrategy(), entry.markdown)

      expect(frontmatterDepths(editor)).toEqual(Array(entry.blocksAtTop).fill(0))
      editor.destroy()
    }
  )

  it.each(
    documents.filter((entry) => entry.keeps.length).map((entry) => [entry.name, entry] as const)
  )('keeps the surrounding content of %s', (_name, entry) => {
    const editor = createEditor(createStrategy(), entry.markdown)

    for (const kept of entry.keeps) {
      expect(editor.state.doc.textContent).toContain(kept)
    }
    editor.destroy()
  })
})
