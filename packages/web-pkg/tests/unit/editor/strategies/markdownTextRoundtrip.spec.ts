import type { JSONContent } from '@tiptap/core'
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

function serializeParagraph(content: JSONContent[]): string {
  const strategy = createStrategy()
  const editor = createEditor(strategy, '')
  editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph', content }] })
  return strategy.serialize(editor.state.doc)
}

function serializeText(text: string): string {
  return serializeParagraph([{ type: 'text', text }])
}

describe('markdown text roundtrip', () => {
  beforeEach(() => {
    createTestingPinia()
  })

  afterEach(() => {
    destroyEditors()
  })

  it.each([
    'Searchtestalpha&Searchtestbeta',
    'Q&A and R & D',
    'AT&T',
    'a < b',
    'a > b',
    'snake_case_name',
    'größe_maß_2',
    'C:\\Users\\me',
    '5 * 3 ~ 15',
    'Ask @olivia_rhye about it'
  ])('keeps %j as it is in the file', (text) => {
    const { serialized } = load(text)

    expect(serialized).toBe(text)
  })

  it.each([
    ['&amp;', '&amp;amp;'],
    ['&#38; and &#x26;', '&amp;#38; and &amp;#x26;'],
    ['&copy;', '&amp;copy;'],
    ['<div>', '&lt;div>'],
    ['</p>', '&lt;/p>'],
    ['<!-- note -->', '&lt;!-- note -->'],
    // an autolink, the scheme is not known to GFM so it does not link the text by itself
    ['<ab:c>', '&lt;ab:c>'],
    ['*a*', '\\*a\\*'],
    ['**a**', '\\*\\*a\\*\\*'],
    ['_a_', '\\_a\\_'],
    ['__init__', '\\_\\_init\\_\\_'],
    ['a*b*c', 'a\\*b\\*c'],
    ['~a~', '\\~a\\~'],
    ['`a`', '\\`a\\`'],
    ['[a](b)', '\\[a\\](b)'],
    ['\\*', '\\\\\\*'],
    ['a\\', 'a\\\\'],
    ['a\\\nb', 'a\\\\\nb']
  ])('escapes %j where markdown would read it as syntax', (text, expected) => {
    const serialized = serializeText(text)
    expect(serialized).toBe(expected)

    const { editor } = expectStableRoundtrip(serialized)
    expect(toJSON(editor).content).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text }] }
    ])
  })

  it('escapes characters next to a mark boundary', () => {
    const content: JSONContent[] = [
      { type: 'text', text: 'snake', marks: [{ type: 'bold' }] },
      { type: 'text', text: '_case * x\\' },
      { type: 'text', text: 'y', marks: [{ type: 'italic' }] }
    ]
    const serialized = serializeParagraph(content)
    expect(serialized).toBe('**snake**\\_case * x\\\\*y*')

    const { editor } = expectStableRoundtrip(serialized)
    expect(toJSON(editor).content).toEqual([{ type: 'paragraph', content }])
  })

  it.each([
    ['bold', ' * 2 ', 'a **\\* 2** b'],
    ['bold', ' x * ', 'a **x \\*** b'],
    ['bold', ' x\\ ', 'a **x\\\\** b'],
    ['italic', ' * 2 ', 'a *\\* 2* b'],
    ['strike', ' ~ 2 ', 'a ~~\\~ 2~~ b']
  ])('escapes characters next to whitespace at the edge of %s text %j', (mark, text, expected) => {
    const serialized = serializeParagraph([
      { type: 'text', text: 'a' },
      { type: 'text', text, marks: [{ type: mark }] },
      { type: 'text', text: 'b' }
    ])
    expect(serialized).toBe(expected)

    // the whitespace ends up outside the mark
    const { editor } = expectStableRoundtrip(serialized)
    expect(toJSON(editor).content).toEqual([
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'a ' },
          { type: 'text', text: text.trim(), marks: [{ type: mark }] },
          { type: 'text', text: ' b' }
        ]
      }
    ])
  })

  it('leaves text in code as it is', () => {
    const markdown = '`a&b <c> d_e \\ *f*`\n\n```\nQ&A <b> x_y\n```'

    expect(load(markdown).serialized).toBe(markdown)
  })

  it('escapes the same way for the clipboard', () => {
    const editor = createEditor(createStrategy(), '')
    editor.commands.setContent({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Q&A <b> snake_case' }] }]
    })

    expect(editor.getMarkdown()).toBe('Q&A &lt;b> snake_case')
  })
})
