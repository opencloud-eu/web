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

describe('markdown list roundtrip', () => {
  beforeEach(() => {
    createTestingPinia()
  })

  describe('list items', () => {
    it('keeps the parent of an empty sub item', () => {
      const { editor, serialized } = expectStableRoundtrip('- Parent\n  - \n- Next\n')

      expect(toJSON(editor).content[0]).toMatchObject({
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              { type: 'paragraph', content: [{ text: 'Parent' }] },
              { type: 'bulletList', content: [{ type: 'listItem' }] }
            ]
          },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ text: 'Next' }] }] }
        ]
      })
      expect(serialized).toBe('- Parent\n  - &nbsp;\n- Next')
    })

    it.each(['- Parent\n  - \n  - c\n- Next\n', '1. Parent\n   - \n   - c\n2. Next\n'])(
      'keeps an empty sub item and its siblings in one list for %j',
      (markdown) => {
        const { editor } = expectStableRoundtrip(markdown)

        expect(toJSON(editor).content[0].content[0].content).toMatchObject([
          { type: 'paragraph', content: [{ text: 'Parent' }] },
          {
            type: 'bulletList',
            content: [
              { type: 'listItem', content: [{ type: 'paragraph' }] },
              { type: 'listItem', content: [{ type: 'paragraph', content: [{ text: 'c' }] }] }
            ]
          }
        ])
      }
    )

    it('keeps the children of an empty sub item', () => {
      const { editor } = expectStableRoundtrip('- Parent\n  -\n    - x\n  - c\n')

      expect(toJSON(editor).content[0].content[0].content[1]).toMatchObject({
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              { type: 'paragraph' },
              { type: 'bulletList', content: [{ content: [{ content: [{ text: 'x' }] }] }] }
            ]
          },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ text: 'c' }] }] }
        ]
      })
    })

    it.each([
      '- # Title\n- b\n',
      '1. # Title\n2. b\n',
      '-\n  # Title\n- b\n',
      'a. \n   # Title\nb. y\n'
    ])('keeps the heading in a list item of %j', (markdown) => {
      const { editor } = expectStableRoundtrip(markdown)

      expect(toJSON(editor).content[0].content[0]).toMatchObject({
        type: 'listItem',
        content: [{ type: 'paragraph' }, { type: 'heading', content: [{ text: 'Title' }] }]
      })
    })

    it.each(['- # Title\n  text\n', '1. ```\n   x\n   ```\n   text\n'])(
      'wraps text after a block of %j into a paragraph',
      (markdown) => {
        const { editor } = expectStableRoundtrip(markdown)

        expect(toJSON(editor).content[0].content[0].content.at(-1)).toMatchObject({
          type: 'paragraph',
          content: [{ text: 'text' }]
        })
      }
    )

    it.each([
      '- # Title\n  [l](http://x) **b** y\n',
      '1. ```\n   x\n   ```\n   *em* [l](http://x)\n'
    ])('keeps the inline formatting of text after a block in %j', (markdown) => {
      const { editor, serialized } = expectStableRoundtrip(markdown)

      expect(serialized).not.toContain('\\')
      const marks = toJSON(editor)
        .content[0].content[0].content.at(-1)
        .content.flatMap(({ marks = [] }) => marks.map(({ type }) => type))
      expect(marks).toContain('link')
    })

    it.each(['- &amp;nbsp;\n', '- &amp;nbsp;\n  - x\n', 'a. &amp;nbsp;\nb. two\n'])(
      'keeps the literal text "&nbsp;" in %j',
      (markdown) => {
        const { editor } = expectStableRoundtrip(markdown)

        expect(toJSON(editor).content[0].content[0].content[0]).toEqual({
          type: 'paragraph',
          content: [{ type: 'text', text: '&nbsp;' }]
        })
      }
    )

    it.each([
      ['- ![a](http://x/a.png)\n', '- ![a](http://x/a.png)'],
      ['- a\n- ![a](http://x/a.png)\n', '- a\n- ![a](http://x/a.png)'],
      ['1. ![a](http://x/a.png)\n', '1. ![a](http://x/a.png)'],
      ['- ![a](http://x/a.png)\n  - sub\n', '- ![a](http://x/a.png)\n  - sub'],
      ['- a\n\n  ![a](http://x/a.png)\n', '- a\n\n  ![a](http://x/a.png)']
    ])('keeps the image in %j', (markdown, expected) => {
      const { editor, serialized } = expectStableRoundtrip(markdown)

      expect(serialized).toBe(expected)
      expect(toJSON(editor).content[0].content.at(-1).content).toContainEqual(
        expect.objectContaining({ type: 'image' })
      )
    })

    it.each([
      ['- \n', '-'],
      ['- \n- b\n', '-\n- b'],
      ['1. \n2. b\n', '1.\n2. b'],
      ['- a\n- \n- b\n', '- a\n-\n- b'],
      ['1. a\n2. \n', '1. a\n2.'],
      ['- \n  - x\n', '- &nbsp;\n  - x'],
      ['> - \n', '> -'],
      ['- a\n  - b\n  - \n', '- a\n  - b\n  -'],
      ['- a\n  1. \n  2. b\n', '- a\n  1. &nbsp;\n  2. b'],
      ['- a\n  - \n    - x\n', '- a\n  - &nbsp;\n    - x']
    ])('keeps the empty item in %j', (markdown, expected) => {
      const { serialized } = expectStableRoundtrip(markdown)

      expect(serialized).toBe(expected)
    })

    it('parses many lists starting with an empty item in linear time', () => {
      const start = performance.now()
      load('- \n- x\n# h\n'.repeat(30) + '- \n- x\n\n1. \n2. y\n\n'.repeat(30))

      expect(performance.now() - start).toBeLessThan(1000)
    })

    it('adds an empty paragraph when a list item starts with another block', () => {
      const { editor } = expectStableRoundtrip('- > quote\n- b\n')

      expect(toJSON(editor).content[0].content[0]).toMatchObject({
        type: 'listItem',
        content: [{ type: 'paragraph' }, { type: 'blockquote' }]
      })
    })
  })

  describe('ordered lists', () => {
    it.each([
      ['a tight', '1. [ ] a\n2. [x] b\n'],
      ['a loose', '1. [ ] a\n\n2. [x] b\n'],
      ['a nested', '- c\n  1. [ ] a\n  2. [x] b\n'],
      ['a multi paragraph', '1. [ ] a\n\n   more\n2. [x] b\n'],
      ['a multi paragraph last item of a', '2. [x] b\n3. [ ] a\n\n   more\n'],
      ['a sub list item of a', '1. [ ] a\n   - sub\n\n   more\n2. [x] b\n']
    ])('keeps the task syntax of %s list as text', (_, markdown) => {
      const { editor } = expectStableRoundtrip(markdown)

      expect(editor.getText()).toContain('[ ] a')
      expect(editor.getText()).toContain('[x] b')
    })

    const rightAligned = Array.from(
      { length: 10 },
      (_, index) => `${String(index + 1).padStart(2)}. item ${index + 1}`
    ).join('\n')

    it('keeps every item of a right aligned list', () => {
      const { editor } = expectStableRoundtrip(`${rightAligned}\n`)

      const [list] = toJSON(editor).content
      expect(list.type).toBe('orderedList')
      expect(list.content).toHaveLength(10)
      expect(list.content[9].content[0].content[0].text).toBe('item 10')
    })

    it('starts a list numbered from 0 at 1', () => {
      const { editor } = expectStableRoundtrip('0. a\n1. b\n')

      expect(toJSON(editor).content[0].attrs.start).toBe(1)
    })

    it('keeps the start number', () => {
      const { editor } = expectStableRoundtrip('3. a\n4. b\n')

      expect(toJSON(editor).content[0]).toMatchObject({ type: 'orderedList', attrs: { start: 3 } })
    })

    it.each([
      ['a', 'a. one\nb. two'],
      ['A', 'A. one\nB. two'],
      ['i', 'i. one\nii. two'],
      ['I', 'I. one\nII. two']
    ])('keeps a list of type %j', (type, markdown) => {
      const { editor, serialized } = expectStableRoundtrip(`${markdown}\n`)

      expect(toJSON(editor).content[0]).toMatchObject({
        type: 'orderedList',
        attrs: { type },
        content: [{ type: 'listItem' }, { type: 'listItem' }]
      })
      expect(serialized).toBe(markdown)
    })

    it('keeps an empty item of a letter list', () => {
      const { editor } = expectStableRoundtrip('a. one\nb. \nc. three\n')

      expect(toJSON(editor).content[0]).toMatchObject({
        type: 'orderedList',
        attrs: { type: 'a' },
        content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ text: 'one' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph' }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ text: 'three' }] }] }
        ]
      })
    })

    it('keeps every item of a right aligned nested list', () => {
      const nested = rightAligned
        .split('\n')
        .map((line) => `   ${line}`)
        .join('\n')
      const { editor } = expectStableRoundtrip(`1. parent\n${nested}\n2. next\n`)

      const [list] = toJSON(editor).content
      expect(list.content).toHaveLength(2)
      expect(list.content[0].content[1].type).toBe('orderedList')
      expect(list.content[0].content[1].content).toHaveLength(10)
    })
  })

  describe('task lists', () => {
    it.each([
      ['a bullet', '- [ ] a\n  - b\n\n    ```\n    code\n    ```\n', 'bulletList'],
      ['an ordered', '- [ ] a\n  1. b\n\n     ```js\n     code\n     ```\n', 'orderedList']
    ])('keeps a code block in %s list item in a task item', (_, markdown, type) => {
      const { editor } = expectStableRoundtrip(markdown)

      expect(toJSON(editor).content[0].content[0].content[1]).toMatchObject({
        type,
        content: [{ type: 'listItem', content: [{ type: 'paragraph' }, { type: 'codeBlock' }] }]
      })
    })
  })
})
