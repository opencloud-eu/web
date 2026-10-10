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

function serializeParagraph(text: string): string {
  const strategy = createStrategy()
  const editor = createEditor(strategy, '')
  editor.commands.setContent({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
  })
  return strategy.serialize(editor.state.doc)
}

describe('markdown paragraph roundtrip', () => {
  beforeEach(() => {
    createTestingPinia()
  })

  describe('paragraphs', () => {
    it.each([
      ['- not a list', '\\- not a list'],
      ['+ not a list', '\\+ not a list'],
      ['1. May', '1\\. May'],
      ['1) May', '1\\) May'],
      ['# not a heading', '\\# not a heading'],
      ['2026. was a year', '2026\\. was a year'],
      ['A. Müller', 'A\\. Müller'],
      ['I. Introduction', 'I\\. Introduction'],
      ['i. e. something', 'i\\. e. something'],
      ['z) last', 'z\\) last'],
      ['---', '\\---'],
      ['    not code', 'not code']
    ])('escapes block syntax in %j', (text, expected) => {
      expect(serializeParagraph(text)).toBe(expected)
    })

    it.each(['#hashtag', '+1', '-5 degrees', '1.5 liters', '> quote'])(
      'leaves %j as it is',
      (text) => {
        expect(serializeParagraph(text)).toBe(text.replace('>', '&gt;'))
      }
    )

    it.each([
      'A. Müller',
      'I. Introduction',
      'i. e. something',
      '1234567890. long',
      '1.\u00a0Mai',
      'A.\u00a0Müller',
      '#\u00a0no heading',
      '\u00a01. indented'
    ])('keeps %j a paragraph after reload', (text) => {
      const { editor } = expectStableRoundtrip(serializeParagraph(text))

      expect(toJSON(editor).content).toEqual([
        { type: 'paragraph', content: [{ type: 'text', text }] }
      ])
    })

    it('escapes block syntax after a soft line break', () => {
      expect(serializeParagraph('Title\n===\n- item')).toBe('Title\n\\===\n\\- item')
    })

    it('leaves ordered list markers after a soft line break as they are', () => {
      expect(serializeParagraph('Hi\nMr. Smith\n2. Liga\n1. one')).toBe(
        'Hi\nMr. Smith\n2. Liga\n1\\. one'
      )
    })

    it('leaves block syntax in table cells as it is', () => {
      const { serialized } = expectStableRoundtrip('| a | b |\n|---|---|\n| - | 1. x |\n')

      expect(serialized).toContain('| -   | 1. x |')
    })

    it('keeps escaped list markers as text', () => {
      const { editor } = expectStableRoundtrip('\\- dash\n\n1\\. text\n\n1. \\-\n')

      expect(toJSON(editor).content.map(({ type }) => type)).toEqual([
        'paragraph',
        'paragraph',
        'orderedList'
      ])
    })

    it('keeps an alert marker in a blockquote', () => {
      const { serialized } = expectStableRoundtrip('> [!NOTE]\n> hint\n')

      expect(serialized).toBe('> [!NOTE]\n> hint')
    })

    it.each(['[!NOTE](x) text', '[!NOTE] text'])('keeps %j in a blockquote as text', (text) => {
      const { editor, serialized } = expectStableRoundtrip(`> ${text.replace(/[[\]]/g, '\\$&')}\n`)

      expect(toJSON(editor).content[0].content[0].content).toEqual([{ type: 'text', text }])
      expect(serialized).toBe(`> ${text.replace(/[[\]]/g, '\\$&')}`)
    })

    it.each([
      [' x paragraph\n', [{ type: 'text', text: 'x paragraph' }]],
      ['a\n  b\n', [{ type: 'text', text: 'a\nb' }]],
      [
        'a  \n   b\n',
        [{ type: 'text', text: 'a' }, { type: 'hardBreak' }, { type: 'text', text: 'b' }]
      ]
    ])('drops the indentation of the lines in %j', (markdown, content) => {
      const { editor } = expectStableRoundtrip(markdown)

      expect(toJSON(editor).content).toEqual([{ type: 'paragraph', content }])
    })

    it('keeps the indentation in a code span at the start of a line', () => {
      const { editor } = load('a\n `  b`\n')

      expect(toJSON(editor).content[0].content).toEqual([
        { type: 'text', text: 'a\n' },
        { type: 'text', text: '  b', marks: [{ type: 'code' }] }
      ])
    })
  })

  describe('list items', () => {
    it('drops the indentation of a continuation line in a tight item', () => {
      const { editor } = expectStableRoundtrip('1. a\n  b\n')

      expect(toJSON(editor).content[0].content[0].content[0].content).toEqual([
        { type: 'text', text: 'a\nb' }
      ])
    })

    it('escapes ordered list markers after a soft line break', () => {
      const { editor, serialized } = expectStableRoundtrip('- a\n  2\\. b\n  Dr\\. Smith\n')

      expect(serialized).toBe('- a\n2\\. b\nDr\\. Smith')
      expect(toJSON(editor).content[0].content).toHaveLength(1)
    })

    it.each([
      ['12345678901. b', '12345678901\\. b'],
      ['B.\u00a0b', 'B\\.\u00a0b'],
      ['2.\u00a0b', '2\\.\u00a0b'],
      ['-\u00a0b', '\\-\u00a0b'],
      ['#\u00a0b', '\\#\u00a0b']
    ])('keeps %j after a soft line break in an ordered list item', (line, escaped) => {
      const { editor, serialized } = expectStableRoundtrip(`1. a\n   ${escaped}\n`)

      expect(serialized).toBe(`1. a\n${escaped}`)

      expect(toJSON(editor).content).toEqual([
        {
          type: 'orderedList',
          attrs: { start: 1, type: null },
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: `a\n${line}` }] }]
            }
          ]
        }
      ])
    })
  })

  describe('task lists', () => {
    it('drops the indentation of a tab indented paragraph in a task item', () => {
      const { editor } = expectStableRoundtrip('- [ ] a\n\t- [ ] b\n\t\tc\n\t- [ ] d\n')

      expect(toJSON(editor).content[0].content[0].content[1].content[0].content[1]).toEqual({
        type: 'paragraph',
        content: [{ type: 'text', text: 'c' }]
      })
    })
  })
})
