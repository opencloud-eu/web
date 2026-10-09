import type { JSONContent } from '@tiptap/core'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import { toJSON, expectStableRoundtrip, destroyEditors } from './helpers'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

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

  afterEach(() => {
    destroyEditors()
  })

  describe('code blocks', () => {
    // marked keeps the indentation of tilde fenced code, so no fixture
    it('keeps the code of an indented tilde fence', () => {
      const { editor } = expectStableRoundtrip('  ~~~\n   code\n    x\n  ~~~\n')

      expect(codeBlockTexts(toJSON(editor))).toEqual([' code\n  x'])
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

    it('keeps a tab indented line as a paragraph in the task item', () => {
      const { editor } = expectStableRoundtrip('- [ ] a\n\tb\n')

      expect(toJSON(editor).content).toHaveLength(1)
      expect(toJSON(editor).content[0].content[0].content[1]).toMatchObject({ type: 'paragraph' })
    })

    // The fixtures cannot guard these: marked expands tabs in list items to spaces
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
      ['after a nested item', '- [ ] a\n  - [ ] b\n  ```\n  \tx\n  ```\n', '\tx'],
      [
        'in a tilde fence after a nested item',
        '- [ ] a\n  - [ ] b\n\n  ~~~\n  \tx\n  ~~~\n',
        '\tx'
      ],
      [
        'three levels deep',
        '- [ ] a\n  - [ ] b\n    - [ ] c\n\n    ```\n    \tx\n    ```\n',
        '\tx'
      ],
      [
        'with task item syntax',
        '- [ ] a\n  ```md\n    - [ ] nested example\n  \tx\n  ```\n',
        '  - [ ] nested example\n\tx'
      ],
      [
        'with a tab indented fence',
        '- [ ] a\n\t- [ ] b\n\t\t```\n\t\tcode\n\t\t\tindented\n\t\t```\n',
        'code\n\tindented'
      ],
      ['in an indented code block', '- [ ] a\n\n      \tx\n', '\tx'],
      ['in a tab indented code block', '- [ ] a\n\n  \t\tx\n', '\tx'],
      [
        'in an indented code block after a nested item',
        '- [ ] a\n  - [ ] b\n\n        \tx\n',
        '\tx'
      ]
    ])('keeps tabs in a code block in a task item %s', (_, markdown, code) => {
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
