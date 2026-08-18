import { flushPromises } from '@vue/test-utils'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import {
  Mentions,
  MentionHighlightPluginKey,
  mentionHighlightClass,
  MentionSuggestionPluginKey
} from '../../../../src/editor/extensions/mentions'
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

function mentionHighlights(editor: Editor): string[] {
  return Array.from(editor.view.dom.querySelectorAll(`.${mentionHighlightClass}`)).map(
    ({ textContent }) => textContent
  )
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

  it('highlights the inserted mention but not the trailing blank', async () => {
    const selected = { id: 'alice', label: 'Alice Smith' }
    const editor = createEditor('<p></p>', { items: vi.fn().mockResolvedValue([selected]) })
    editor.commands.insertContent('@a')
    await flushPromises()

    latestSuggestionProps?.command(selected)

    const decorations = MentionHighlightPluginKey.getState(editor.state)
    expect(decorations.find().map(({ from, to }) => ({ from, to }))).toEqual([
      { from: 1, to: 1 + '@Alice Smith'.length }
    ])
    expect(mentionHighlights(editor)).toEqual(['@Alice Smith'])
    editor.destroy()
  })

  it('highlights the mentions of the loaded content', async () => {
    const editor = createEditor('<p>Hello @Alice Smith, foo@Alice Smith</p>', {
      items: vi.fn().mockResolvedValue([{ id: 'alice', label: 'Alice Smith' }])
    })

    await flushPromises()

    // the second one is no mention, because it doesn't start after a blank
    expect(mentionHighlights(editor)).toEqual(['@Alice Smith'])
    editor.destroy()
  })

  it('highlights the mentions of replaced content', async () => {
    const editor = createEditor('<p>@Alice Smith </p>', {
      items: vi.fn().mockResolvedValue([
        { id: 'alice', label: 'Alice Smith' },
        { id: 'bob', label: 'Bob Jones' }
      ])
    })
    await flushPromises()

    editor.commands.setContent('<p>@Bob Jones and @Unknown User</p>')
    await flushPromises()

    expect(mentionHighlights(editor)).toEqual(['@Bob Jones'])
    editor.destroy()
  })

  it('highlights a mention of a user who was not loaded yet', async () => {
    const selected = { id: 'bob', label: 'Bob Jones' }
    const items = vi.fn().mockResolvedValueOnce([]).mockResolvedValue([selected])
    const editor = createEditor('<p></p>', { items })
    await flushPromises()

    editor.commands.insertContent('@b')
    await flushPromises()
    latestSuggestionProps?.command(selected)

    expect(mentionHighlights(editor)).toEqual(['@Bob Jones'])
    editor.destroy()
  })

  it('restores a mention highlight after undo and redo', async () => {
    const selected = { id: 'alice', label: 'Alice Smith' }
    const editor = createEditor('<p></p>', { items: vi.fn().mockResolvedValue([selected]) })
    editor.commands.insertContent('@a')
    await flushPromises()

    latestSuggestionProps?.command(selected)
    editor.commands.undo()
    editor.commands.redo()

    expect(mentionHighlights(editor)).toEqual(['@Alice Smith'])
    editor.destroy()
  })
})
