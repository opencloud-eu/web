import type { JSONContent, MarkdownToken } from '@tiptap/core'
import { normalizeMarkdownListItem } from '../../../../src/editor/extensions/markdownLists'

const text = (value: string): JSONContent => ({ type: 'text', text: value })
const paragraph = (...content: JSONContent[]): JSONContent => ({ type: 'paragraph', content })
const emptyParagraph: JSONContent = { type: 'paragraph', content: [] }
const listItem = (...content: JSONContent[]): JSONContent => ({ type: 'listItem', content })

function headingToken(raw: string): MarkdownToken {
  return { type: 'list_item', tokens: [{ type: 'heading', raw }] } as MarkdownToken
}

describe('normalizeMarkdownListItem', () => {
  it('leaves an item starting with a paragraph as it is', () => {
    const item = listItem(paragraph(text('a')), { type: 'bulletList' })

    expect(normalizeMarkdownListItem(item)).toEqual(item)
  })

  it('adds an empty paragraph to an item without content', () => {
    expect(normalizeMarkdownListItem({ type: 'listItem' })).toEqual(listItem(emptyParagraph))
  })

  it.each(['blockquote', 'codeBlock', 'bulletList'])(
    'adds an empty paragraph before a leading %s',
    (type) => {
      const block = { type }

      expect(normalizeMarkdownListItem(listItem(block))).toEqual(listItem(emptyParagraph, block))
    }
  )

  it('adds an empty paragraph before an ATX heading', () => {
    const heading = { type: 'heading', content: [text('Title')] }

    expect(normalizeMarkdownListItem(listItem(heading), headingToken('# Title\n'))).toEqual(
      listItem(emptyParagraph, heading)
    )
  })

  it('adds an empty paragraph before an ATX heading after a blank line', () => {
    const heading = { type: 'heading', content: [text('Title')] }
    const token = {
      type: 'list_item',
      tokens: [{ type: 'space' }, { type: 'heading', raw: '# Title' }]
    } as MarkdownToken

    expect(normalizeMarkdownListItem(listItem(heading), token)).toEqual(
      listItem(emptyParagraph, heading)
    )
  })

  it('keeps a heading without token', () => {
    const heading = { type: 'heading', content: [text('Title')] }

    expect(normalizeMarkdownListItem(listItem(heading))).toEqual(listItem(emptyParagraph, heading))
  })

  it.each(['Parent\n  -\n', 'Parent\n  - \n', 'Parent\n-\n\n'])(
    'turns the setext underline in %j into an empty sub item',
    (raw) => {
      const heading = { type: 'heading', content: [text('Parent')] }

      expect(normalizeMarkdownListItem(listItem(heading), headingToken(raw))).toEqual(
        listItem(paragraph(text('Parent')), {
          type: 'bulletList',
          content: [listItem(emptyParagraph)]
        })
      )
    }
  )

  it('splits the following sub list into children and siblings of the empty sub item', () => {
    const heading = { type: 'heading', content: [text('Parent')] }
    const x = listItem(paragraph(text('x')))
    const c = listItem(paragraph(text('c')))
    const token = {
      type: 'list_item',
      tokens: [
        { type: 'heading', raw: 'Parent\n-\n' },
        { type: 'list', raw: '  - x\n- c', items: [{ raw: '  - x\n' }, { raw: '- c' }] }
      ]
    } as MarkdownToken

    expect(
      normalizeMarkdownListItem(listItem(heading, { type: 'bulletList', content: [x, c] }), token)
    ).toEqual(
      listItem(paragraph(text('Parent')), {
        type: 'bulletList',
        content: [listItem(emptyParagraph, { type: 'bulletList', content: [x] }), c]
      })
    )
  })

  it.each(['Parent\n  --\n', 'Parent\n===\n'])(
    'turns the setext heading %j into a paragraph without sub item',
    (raw) => {
      const heading = { type: 'heading', content: [text('Parent')] }

      expect(normalizeMarkdownListItem(listItem(heading), headingToken(raw))).toEqual(
        listItem(paragraph(text('Parent')))
      )
    }
  )
})
