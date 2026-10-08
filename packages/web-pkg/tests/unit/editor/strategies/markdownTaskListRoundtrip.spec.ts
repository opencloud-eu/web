import { ref } from 'vue'
import { Editor } from '@tiptap/vue-3'
import type { JSONContent } from '@tiptap/core'
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

function toJSON(editor: Editor): JSONContent {
  return editor.getJSON() as JSONContent
}

function load(markdown: string) {
  const strategy = createStrategy()
  const editor = createEditor(strategy, markdown)
  return { editor, serialized: strategy.serialize(editor.state.doc) }
}

function expectStableRoundtrip(markdown: string) {
  const { editor, serialized } = load(markdown)
  expect(() => editor.state.doc.check()).not.toThrow()

  const reloaded = load(serialized)
  expect(() => reloaded.editor.state.doc.check()).not.toThrow()
  expect(toJSON(reloaded.editor)).toEqual(toJSON(editor))

  return { editor, serialized }
}

function codeBlockTexts(node: JSONContent): string[] {
  if (node.type === 'codeBlock') {
    return [node.content?.map(({ text }) => text).join('') ?? '']
  }
  return (node.content ?? []).flatMap(codeBlockTexts)
}

describe('markdown task list and code block roundtrip', () => {
  beforeEach(() => {
    createTestingPinia()
  })

  describe('code blocks', () => {
    it.each([
      [' ```\n code\n ```\n', 'code'],
      ['  ~~~\n   code\n    x\n  ~~~\n', ' code\n  x'],
      ['- a\n ```\n code\n ```\n', 'code']
    ])('keeps the indented code block %j', (markdown, code) => {
      const { editor } = expectStableRoundtrip(markdown)

      expect(codeBlockTexts(toJSON(editor))).toEqual([code])
    })
  })

  describe('task lists', () => {
    it('keeps the first letter of an under indented paragraph after a task list', () => {
      const { editor } = expectStableRoundtrip('- [ ] task\n\n x paragraph\n')

      expect(toJSON(editor).content[0].content[0].content[1]).toEqual({
        type: 'paragraph',
        content: [{ type: 'text', text: 'x paragraph' }]
      })
    })

    it('keeps an under indented line directly below a task item in the item', () => {
      const { editor } = expectStableRoundtrip('- [ ] a\n b\n c\n')

      expect(toJSON(editor).content).toMatchObject([
        {
          type: 'taskList',
          content: [
            {
              type: 'taskItem',
              content: [
                { type: 'paragraph', content: [{ text: 'a' }] },
                { type: 'paragraph', content: [{ text: 'b\nc' }] }
              ]
            }
          ]
        }
      ])
    })

    it('keeps an under indented heading below a task item', () => {
      const { editor } = expectStableRoundtrip('- [ ] a\n # h\n')

      expect(toJSON(editor).content[0].content[0].content[1]).toMatchObject({
        type: 'heading',
        content: [{ text: 'h' }]
      })
    })

    it.each([
      ['a paragraph', '- [ ] a\n\tb\n', 'paragraph'],
      ['a task item', '- [ ] a\n\t- [ ] b\n', 'taskList']
    ])('keeps a tab indented line as %s in the task item', (_, markdown, type) => {
      const { editor } = expectStableRoundtrip(markdown)

      expect(toJSON(editor).content).toHaveLength(1)
      expect(toJSON(editor).content[0].content[0].content[1]).toMatchObject({ type })
    })

    it.each([
      ['directly below the item', '- [ ] run\n  ```make\n  build:\n  \tgo build\n  ```\n'],
      ['after a blank line', '- [ ] run\n\n  ```make\n  build:\n  \tgo build\n  ```\n']
    ])('keeps tabs in a code block in a task item %s', (_, markdown) => {
      const { editor, serialized } = expectStableRoundtrip(markdown)

      expect(toJSON(editor).content[0].content[0].content[1]).toMatchObject({
        type: 'codeBlock',
        content: [{ text: 'build:\n\tgo build' }]
      })
      expect(serialized).toContain('\n  \tgo build\n')
    })

    it.each([
      ['without a blank line', '- [ ] a\n  - [ ] b\n  ```\n  \tx\n  ```\n'],
      ['with a tilde fence', '- [ ] a\n  - [ ] b\n\n  ~~~\n  \tx\n  ~~~\n'],
      ['three levels deep', '- [ ] a\n  - [ ] b\n    - [ ] c\n\n    ```\n    \tx\n    ```\n']
    ])('keeps tabs in a code block after a nested task item %s', (_, markdown) => {
      const { editor } = expectStableRoundtrip(markdown)

      expect(codeBlockTexts(toJSON(editor))).toEqual(['\tx'])
    })

    it('keeps a code block after a nested task item in the outer item', () => {
      const { editor } = expectStableRoundtrip('- [ ] a\n  - [ ] b\n  ```\n  x\n  ```\n')

      expect(toJSON(editor).content[0].content[0].content.map(({ type }) => type)).toEqual([
        'paragraph',
        'taskList',
        'codeBlock'
      ])
    })

    it.each([
      ['- [ ] a\n  ```md\n  - [ ] example\n  more text\n  ```\n', '- [ ] example\nmore text'],
      ['- [ ] a\n  ```md\n    - [ ] nested example\n  \tx\n  ```\n', '  - [ ] nested example\n\tx']
    ])('keeps task item syntax in a code block %j as code', (markdown, code) => {
      const { editor } = expectStableRoundtrip(markdown)

      expect(codeBlockTexts(toJSON(editor))).toEqual([code])
    })

    it.each([
      ['- [ ] a\n\t```js\n\tconst x = 1\n\t```\n', 'const x = 1'],
      ['- [ ] a\n\n\t```\n\tcode\n\t```\n- [ ] b\n\nafter\n', 'code'],
      ['- [ ] a\n\t- [ ] b\n\t\t```\n\t\tcode\n\t\t\tindented\n\t\t```\n', 'code\n\tindented']
    ])('keeps a tab indented code block %j in a task item', (markdown, code) => {
      const { editor } = expectStableRoundtrip(markdown)

      expect(codeBlockTexts(toJSON(editor))).toEqual([code])
    })

    it.each([
      ['directly below the item', '- [ ] a\n ```\n code\n   x\n ```\n', 'code\n  x'],
      ['after a blank line', '- [ ] a\n\n ~~~\n code\n ~~~\n', 'code'],
      ['after a nested item', '- [ ] a\n  - [ ] b\n ```\n code\n ```\n', 'code']
    ])('keeps an under indented code block below a task item %s', (_, markdown, code) => {
      const { editor } = expectStableRoundtrip(markdown)

      expect(codeBlockTexts(toJSON(editor))).toEqual([code])
    })

    it('keeps the first letter of an under indented paragraph after a nested task item', () => {
      const { editor } = expectStableRoundtrip('- [ ] a\n  - [ ] b\n\n   x c\n- [ ] d\n')

      expect(editor.getText()).toContain('x c')
      expect(toJSON(editor).content[0].content).toHaveLength(2)
    })
  })
})
