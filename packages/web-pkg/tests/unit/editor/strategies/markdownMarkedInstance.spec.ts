import { ref } from 'vue'
import { Editor } from '@tiptap/vue-3'
import { MarkdownManager } from '@tiptap/markdown'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import { useStrategyMarkdown } from '../../../../src/editor/composables/strategies/markdown'
import type { TextEditorLinkPanelRequest, TextEditorState } from '../../../../src/editor/types'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

function createStrategy() {
  const state: TextEditorState = {
    sourceMode: ref(false),
    linkPanel: ref<TextEditorLinkPanelRequest | null>(null),
    editorZoom: ref(100)
  }
  return useStrategyMarkdown(state)
}

/**
 * How many block tokenizers marked's process wide singleton carries. Every
 * `MarkdownManager` appends its extensions' tokenizers to whichever instance it
 * is given and never removes them, so anything registered here accumulates for
 * the lifetime of the tab and keeps its manager reachable.
 */
function singletonTokenizerCount(): number {
  const instance = new MarkdownManager({ extensions: [] }).instance as unknown as {
    defaults?: { extensions?: { block?: unknown[] } }
  }

  return instance.defaults?.extensions?.block?.length ?? 0
}

describe('markdown strategy marked instance', () => {
  beforeEach(() => {
    createTestingPinia()
  })

  it('never registers tokenizers on the marked singleton', () => {
    const before = singletonTokenizerCount()

    for (let round = 0; round < 5; round++) {
      const strategy = createStrategy()
      const editor = new Editor({
        extensions: strategy.extensions(),
        content: '---\na: 1\n---\n\nFoo',
        contentType: 'markdown'
      })
      // Also builds the strategy's own manager.
      strategy.serialize(editor.state.doc)
      editor.destroy()
    }

    expect(singletonTokenizerCount()).toBe(before)
  })

  it('still parses frontmatter with its own instance', () => {
    const strategy = createStrategy()
    const editor = new Editor({
      extensions: strategy.extensions(),
      content: '---\na: 1\n---\n\nFoo',
      contentType: 'markdown'
    })

    expect(editor.state.doc.firstChild?.type.name).toBe('frontmatter')
    expect(strategy.serialize(editor.state.doc)).toBe('---\na: 1\n---\n\nFoo')
    editor.destroy()
  })

  it('gives each strategy its own instance', () => {
    const first = createStrategy()
    const second = createStrategy()
    const markedOf = (strategy: ReturnType<typeof createStrategy>) =>
      (
        strategy.extensions().find(({ name }) => name === 'markdown') as unknown as {
          options: { marked: unknown }
        }
      ).options.marked

    expect(markedOf(first)).toBeDefined()
    expect(markedOf(first)).not.toBe(markedOf(second))
  })
})
