import { flushPromises } from '@vue/test-utils'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Mentions, MentionSuggestionPluginKey } from '../../../../src/editor/extensions/mentions'
import type { MentionItem } from '../../../../src/editor/types'

let latestSuggestionProps: { command: (item: MentionItem) => void } | undefined

vi.mock('@tiptap/vue-3', () => ({
  VueRenderer: class {
    el = document.createElement('div')
    ref = { onUpdate: vi.fn(), onKeyDown: vi.fn() }
    updateProps = vi.fn()
    destroy = vi.fn()

    constructor(_component: unknown, { props }: { props: typeof latestSuggestionProps }) {
      latestSuggestionProps = props
    }
  }
}))

function createEditor(content: string, options = {}) {
  return new Editor({
    extensions: [
      StarterKit,
      Mentions.configure({
        items: vi.fn().mockResolvedValue([]),
        onSelect: vi.fn(),
        ...options
      })
    ],
    content
  })
}

function suggestionIsActive(editor: Editor): boolean {
  return MentionSuggestionPluginKey.getState(editor.state)?.active === true
}

describe('Mentions', () => {
  beforeEach(() => {
    latestSuggestionProps = undefined
  })

  it.each([
    ['at the start of a line', '<p>@</p>', 2],
    ['after a blank', '<p>Hello @</p>', 8]
  ])('opens %s', (_description, content, position) => {
    const editor = createEditor(content)

    editor.commands.setTextSelection(position)

    expect(suggestionIsActive(editor)).toBe(true)
    editor.destroy()
  })

  it('does not open directly after a word', () => {
    const editor = createEditor('<p>Hello@</p>')

    editor.commands.setTextSelection(7)

    expect(suggestionIsActive(editor)).toBe(false)
    editor.destroy()
  })

  it('loads matching items for the entered query', async () => {
    const items = vi.fn().mockResolvedValue([{ id: 'alice', label: 'Alice' }])
    const editor = createEditor('<p></p>', { items })

    editor.commands.insertContent('@ali')
    await flushPromises()

    expect(items).toHaveBeenCalledWith('ali')
    editor.destroy()
  })

  it('inserts the selected display name and reports the selected user', async () => {
    const selected = { id: 'alice', label: 'Alice Smith' }
    const onSelect = vi.fn()
    const editor = createEditor('<p></p>', {
      items: vi.fn().mockResolvedValue([selected]),
      onSelect
    })
    editor.commands.insertContent('@a')
    await flushPromises()

    latestSuggestionProps?.command(selected)

    expect(editor.getText()).toBe('@Alice Smith ')
    expect(onSelect).toHaveBeenCalledWith(selected)
    editor.destroy()
  })
})
