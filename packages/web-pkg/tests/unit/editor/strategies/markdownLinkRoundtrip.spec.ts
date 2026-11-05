import type { JSONContent } from '@tiptap/core'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import {
  createStrategy,
  createEditor,
  destroyEditors,
  expectStableRoundtrip,
  load
} from './helpers'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

function serialize(content: JSONContent[]): string {
  const strategy = createStrategy()
  const editor = createEditor(strategy, '')
  editor.commands.setContent({ type: 'doc', content })
  return strategy.serialize(editor.state.doc)
}

describe('markdown link and image roundtrip', () => {
  beforeEach(() => {
    createTestingPinia()
  })

  afterEach(() => {
    destroyEditors()
  })

  it.each([
    'See [notes](<My Notes.md>) here.',
    '[notes](<my (draft.md>)',
    '[notes](notes.md "a \\"quoted\\" title")',
    '[notes](https://example.com/a_(b))',
    '![alt](img.png "a \\"quoted\\" title")',
    '![a \\] b](<my image.png>)',
    '![alt](img(1).png)',
    '![alt](C:\\\\)'
  ])('saves %j unchanged', (markdown) => {
    const { serialized, reserialized } = expectStableRoundtrip(markdown)
    expect(serialized).toBe(markdown)
    expect(reserialized).toBe(markdown)
  })

  it('keeps a link with spaces in its url a link', () => {
    const markdown = serialize([
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'notes',
            marks: [{ type: 'link', attrs: { href: 'My Notes.md', title: 'say "hi"' } }]
          }
        ]
      }
    ])

    expect(load(markdown).editor.getJSON().content?.[0]).toMatchObject({
      content: [
        {
          text: 'notes',
          marks: [{ type: 'link', attrs: { href: 'My Notes.md', title: 'say "hi"' } }]
        }
      ]
    })
  })

  it('keeps an image with special characters in its attributes an image', () => {
    const attrs = { src: 'my image (1.png', alt: 'a [b', title: 'say "hi" \\' }
    const markdown = serialize([{ type: 'image', attrs }])

    expect(load(markdown).editor.getJSON().content?.[0]).toMatchObject({ type: 'image', attrs })
  })

  it('escapes quotes in the attributes of a resized image', () => {
    const markdown = serialize([
      {
        type: 'image',
        attrs: { src: 'a.png', alt: 'say "hi"', title: 'Tom & Jerry', width: 100 }
      }
    ])

    expect(markdown.trim()).toBe(
      '<img src="a.png" alt="say &quot;hi&quot;" title="Tom & Jerry" width="100" />'
    )
  })
})
