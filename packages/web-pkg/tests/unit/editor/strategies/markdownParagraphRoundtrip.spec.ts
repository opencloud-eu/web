import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import {
  createStrategy,
  createEditor,
  toJSON,
  load,
  expectStableRoundtrip,
  destroyEditors
} from './helpers'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

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

  afterEach(() => {
    destroyEditors()
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

    it('keeps the indentation in a code span at the start of a line', () => {
      const { editor } = load('a\n `  b`\n')

      expect(toJSON(editor).content[0].content).toEqual([
        { type: 'text', text: 'a\n' },
        { type: 'text', text: '  b', marks: [{ type: 'code' }] }
      ])
    })
  })
})
