import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import { toJSON, load, expectStableRoundtrip, destroyEditors } from './helpers'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

describe('markdown list roundtrip', () => {
  beforeEach(() => {
    createTestingPinia()
  })

  afterEach(() => {
    destroyEditors()
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

    it('starts a list numbered from 0 at 1', () => {
      const { editor } = expectStableRoundtrip('0. a\n1. b\n')

      expect(toJSON(editor).content[0].attrs.start).toBe(1)
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
  })
})
