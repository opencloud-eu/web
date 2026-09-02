import { ref } from 'vue'
import { Editor } from '@tiptap/vue-3'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import { useStrategyMarkdown } from '../../../../src/editor/composables/strategies/markdown'
import { frontmatterHighlightKey } from '../../../../src/editor/extensions/frontmatterHighlight'
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

/** The highlighted runs, as `[text, class]` pairs in document order. */
function tokens(editor: Editor): [string, string][] {
  const decorations = frontmatterHighlightKey.getState(editor.state)
  if (!decorations) {
    return []
  }

  return decorations
    .find()
    .map((decoration) => [
      editor.state.doc.textBetween(decoration.from, decoration.to),
      (decoration as unknown as { type: { attrs: { class: string } } }).type.attrs.class
    ])
}

describe('frontmatterHighlight', () => {
  beforeEach(() => {
    createTestingPinia()
  })

  it('highlights keys and values as yaml', () => {
    const editor = createEditor(createStrategy(), '---\ntitle: My note\n---\n\n# Heading')

    expect(tokens(editor)).toContainEqual(['title:', 'hljs-attr'])
    expect(tokens(editor).some(([, className]) => className === 'hljs-string')).toBe(true)
    editor.destroy()
  })

  it('highlights list values and literals', () => {
    const editor = createEditor(
      createStrategy(),
      '---\ntags:\n  - a\ndraft: true\n---\n\n# Heading'
    )
    const classes = tokens(editor).map(([, className]) => className)

    expect(classes).toContain('hljs-bullet')
    expect(classes).toContain('hljs-literal')
    editor.destroy()
  })

  it('highlights nothing when the document has no frontmatter', () => {
    const editor = createEditor(createStrategy(), '# Heading\n\nSome text.')

    expect(tokens(editor)).toEqual([])
    editor.destroy()
  })

  // Metadata is invalid yaml on most keystrokes, so this is the common case.
  it('highlights invalid yaml without throwing', () => {
    const editor = createEditor(createStrategy(), '---\ntitle: [unclosed\n---\n\n# Heading')

    expect(() => tokens(editor)).not.toThrow()
    expect(tokens(editor)).toContainEqual(['title:', 'hljs-attr'])
    editor.destroy()
  })

  it('follows edits to the metadata', () => {
    const editor = createEditor(createStrategy(), '---\ntitle: My note\n---\n\n# Heading')
    editor.commands.setTextSelection(1)
    editor.commands.insertContent('draft: true\n')

    expect(tokens(editor)).toContainEqual(['draft:', 'hljs-attr'])
    editor.destroy()
  })

  it('leaves the markdown untouched', () => {
    const strategy = createStrategy()
    const content = '---\ntitle: My note\ntags:\n  - a\n---\n\n# Heading'
    const editor = createEditor(strategy, content)

    expect(tokens(editor).length).toBeGreaterThan(0)
    expect(strategy.serialize(editor.state.doc)).toBe(content)
    editor.destroy()
  })
})
