import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import type { Editor } from '@tiptap/vue-3'
import { createStrategy, createEditor, destroyEditors, load } from '../strategies/helpers'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

function edit(markdown: string, change: (editor: Editor) => void): string {
  const strategy = createStrategy()
  const editor = createEditor(strategy, markdown)
  change(editor)
  return strategy.serialize(editor.state.doc)
}

describe('MarkdownCode', () => {
  beforeEach(() => {
    createTestingPinia()
  })

  afterEach(() => {
    destroyEditors()
  })

  it('drops bold on part of a code span', () => {
    const saved = edit('`foo bar`', (editor) => {
      editor.chain().setTextSelection({ from: 5, to: 8 }).toggleBold().run()
    })
    expect(saved).toBe('`foo bar`')
  })

  it('drops a link on part of a code span', () => {
    const saved = edit('`foo bar`', (editor) => {
      editor
        .chain()
        .setTextSelection({ from: 5, to: 8 })
        .setLink({ href: 'https://example.com' })
        .run()
    })
    expect(saved).toBe('`foo bar`')
  })

  it('drops formatting inside a selection turned into code', () => {
    const saved = edit('a **b** c', (editor) => {
      editor.chain().setTextSelection({ from: 1, to: 6 }).toggleCode().run()
    })
    expect(saved).toBe('`a b c`')
  })

  it('keeps bold on a whole code span', () => {
    const saved = edit('`foo bar`', (editor) => {
      editor.chain().setTextSelection({ from: 1, to: 8 }).toggleBold().run()
    })
    expect(saved).toBe('**`foo bar`**')
  })

  it('keeps bold around a code span and surrounding text', () => {
    const saved = edit('a `b` c', (editor) => {
      editor.chain().setTextSelection({ from: 1, to: 6 }).toggleBold().run()
    })
    expect(saved).toBe('**a `b` c**')
  })

  it.each([
    ['`a`**`b`**', '`ab`'],
    ['`a`[`b`](https://example.com)', '`ab`'],
    ['- `a`*`b`*', '- `ab`'],
    ['| head |\n| ---- |\n| `a`~~`b`~~ |', '| head |\n| ---- |\n| `ab` |']
  ])('drops marks on part of adjacent code spans when loading %j', (markdown, expected) => {
    expect(load(markdown).serialized.trim()).toBe(expected)
  })

  it('ranks code innermost among the marks', () => {
    const { editor } = load('')
    expect(Object.keys(editor.schema.marks).at(-1)).toBe('code')
  })
})
