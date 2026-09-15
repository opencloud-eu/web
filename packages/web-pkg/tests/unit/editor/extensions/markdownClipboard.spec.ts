import { Editor } from '@tiptap/core'
import { Markdown } from '@tiptap/markdown'
import { Slice, type Slice as ProseMirrorSlice } from '@tiptap/pm/model'
import { AllSelection } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import { Marked } from 'marked'
import type { marked as markedDefault } from 'marked'
import { describe, expect, it, vi } from 'vitest'
import { createLinkExtension } from '../../../../src/editor/extensions/link'
import { createMarkdownClipboardExtension } from '../../../../src/editor/extensions/markdownClipboard'

function createEditor(): Editor {
  const marked = new Marked() as unknown as typeof markedDefault

  return new Editor({
    extensions: [
      StarterKit.configure({ link: false }),
      Markdown.configure({ marked }),
      createMarkdownClipboardExtension(),
      createLinkExtension()
    ]
  })
}

function createClipboardEvent(
  text: string,
  legacyText = '',
  types = ['text/plain']
): ClipboardEvent {
  return {
    clipboardData: {
      types,
      getData: vi.fn((type: string) => {
        if (type === 'text/plain') {
          return text
        }

        if (type === 'Text') {
          return legacyText
        }

        return ''
      })
    }
  } as unknown as ClipboardEvent
}

function handlePaste(editor: Editor, event: ClipboardEvent) {
  let result: boolean | undefined

  editor.view.someProp('handlePaste', (handler) => {
    const handled = handler(editor.view, event, Slice.empty as ProseMirrorSlice)
    if (typeof handled === 'boolean') {
      result = handled
    }
    return handled
  })

  return result
}

function copySelectionAsText(editor: Editor) {
  return editor.view.serializeForClipboard(editor.state.selection.content()).text
}

function findTextRange(editor: Editor, text: string) {
  let range: { from: number; to: number } | undefined

  editor.state.doc.descendants((node, pos) => {
    const index = node.text?.indexOf(text) ?? -1
    if (index < 0) {
      return true
    }

    range = { from: pos + index, to: pos + index + text.length }
    return false
  })

  if (!range) {
    throw new Error(`Text not found: ${text}`)
  }

  return range
}

function selectText(editor: Editor, text: string) {
  editor.commands.setTextSelection(findTextRange(editor, text))
}

function selectTextRange(editor: Editor, fromText: string, toText: string) {
  editor.commands.setTextSelection({
    from: findTextRange(editor, fromText).from,
    to: findTextRange(editor, toText).to
  })
}

describe('markdown clipboard extension', () => {
  it('copies selected rich editor content as markdown text', () => {
    const editor = createEditor()

    try {
      editor.commands.insertContent(
        '# Heading\n\nThis is **bold** and [linked](https://opencloud.eu).',
        { contentType: 'markdown' }
      )

      editor.view.dispatch(editor.state.tr.setSelection(new AllSelection(editor.state.doc)))
      const clipboardText = copySelectionAsText(editor)

      expect(clipboardText).toContain('# Heading')
      expect(clipboardText).toContain('**bold**')
      expect(clipboardText).toContain('[linked](https://opencloud.eu)')
    } finally {
      editor.destroy()
    }
  })

  it('copies selected text inside a list item without the list marker', () => {
    const editor = createEditor()

    try {
      editor.commands.setContent({
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'lorem ipsum' }]
                  }
                ]
              }
            ]
          }
        ]
      })
      selectText(editor, 'ipsum')

      const clipboardText = copySelectionAsText(editor)

      expect(clipboardText.trim()).toBe('ipsum')
    } finally {
      editor.destroy()
    }
  })

  it('copies a selected list as markdown text', () => {
    const editor = createEditor()

    try {
      editor.commands.setContent({
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'lorem ipsum' }]
                  }
                ]
              }
            ]
          }
        ]
      })
      editor.view.dispatch(editor.state.tr.setSelection(new AllSelection(editor.state.doc)))

      const clipboardText = copySelectionAsText(editor)

      expect(clipboardText).toContain('- lorem ipsum')
    } finally {
      editor.destroy()
    }
  })

  it('copies a selected list followed by a heading as markdown text', () => {
    const editor = createEditor()

    try {
      editor.commands.setContent({
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'lorem ipsum' }]
                  }
                ]
              }
            ]
          },
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Next heading' }]
          }
        ]
      })
      selectTextRange(editor, 'lorem', 'Next heading')

      const clipboardText = copySelectionAsText(editor)

      expect(clipboardText).toContain('- lorem ipsum')
      expect(clipboardText).toContain('# Next heading')
    } finally {
      editor.destroy()
    }
  })

  it('pastes markdown text as structured editor content', () => {
    const editor = createEditor()
    const event = createClipboardEvent('# Heading\n\nThis is **bold**.')

    try {
      const handled = handlePaste(editor, event)

      expect(handled).toBe(true)
      expect(editor.state.doc.firstChild?.type.name).toBe('heading')
      expect(editor.markdown?.serialize(editor.getJSON())).toContain('# Heading')
      expect(editor.markdown?.serialize(editor.getJSON())).toContain('**bold**')
    } finally {
      editor.destroy()
    }
  })

  it('pastes markdown text from legacy clipboard data as structured editor content', () => {
    const editor = createEditor()
    const event = createClipboardEvent('', '- List item')

    try {
      const handled = handlePaste(editor, event)

      expect(handled).toBe(true)
      expect(editor.state.doc.firstChild?.type.name).toBe('bulletList')
      expect(editor.markdown?.serialize(editor.getJSON())).toContain('- List item')
    } finally {
      editor.destroy()
    }
  })

  it('pastes plain inline text without splitting the current paragraph', () => {
    const editor = createEditor()

    try {
      editor.commands.setContent('<p>foobar</p>')
      editor.commands.setTextSelection(4)

      editor.view.pasteText('x')

      expect(editor.state.doc.childCount).toBe(1)
      expect(editor.state.doc.firstChild?.type.name).toBe('paragraph')
      expect(editor.state.doc.textContent).toBe('fooxbar')
    } finally {
      editor.destroy()
    }
  })

  it('pastes inline markdown without splitting the current paragraph', () => {
    const editor = createEditor()
    const event = createClipboardEvent('**x**')

    try {
      editor.commands.setContent('<p>foobar</p>')
      editor.commands.setTextSelection(4)

      const handled = handlePaste(editor, event)

      expect(handled).toBe(true)
      expect(editor.state.doc.childCount).toBe(1)
      expect(editor.state.doc.textContent).toBe('fooxbar')
      expect(editor.state.doc.firstChild?.child(1).marks[0]?.type.name).toBe('bold')
    } finally {
      editor.destroy()
    }
  })

  it('pastes heading markdown without splitting the current paragraph', () => {
    const editor = createEditor()
    const event = createClipboardEvent('# x')

    try {
      editor.commands.setContent('<p>foobar</p>')
      editor.commands.setTextSelection(4)

      const handled = handlePaste(editor, event)

      expect(handled).toBe(true)
      expect(editor.state.doc.childCount).toBe(1)
      expect(editor.state.doc.firstChild?.type.name).toBe('paragraph')
      expect(editor.state.doc.textContent).toBe('fooxbar')
    } finally {
      editor.destroy()
    }
  })

  it('keeps heading markdown as a heading when the current paragraph is empty', () => {
    const editor = createEditor()
    const event = createClipboardEvent('# Heading')

    try {
      const handled = handlePaste(editor, event)

      expect(handled).toBe(true)
      expect(editor.state.doc.firstChild?.type.name).toBe('heading')
      expect(editor.state.doc.firstChild?.attrs.level).toBe(1)
      expect(editor.state.doc.firstChild?.textContent).toBe('Heading')
    } finally {
      editor.destroy()
    }
  })

  it('keeps list markdown structured when pasted into the current paragraph', () => {
    const editor = createEditor()
    const event = createClipboardEvent('- item')

    try {
      editor.commands.setContent('<p>foobar</p>')
      editor.commands.setTextSelection(4)

      const handled = handlePaste(editor, event)

      expect(handled).toBe(true)
      expect(editor.state.doc.child(1).type.name).toBe('bulletList')
      expect(editor.state.doc.textContent).toBe('fooitembar')
    } finally {
      editor.destroy()
    }
  })

  it('keeps fenced code markdown structured when pasted into the current paragraph', () => {
    const editor = createEditor()
    const event = createClipboardEvent('```\nconst value = 1\n```')

    try {
      editor.commands.setContent('<p>foobar</p>')
      editor.commands.setTextSelection(4)

      const handled = handlePaste(editor, event)

      expect(handled).toBe(true)
      expect(editor.state.doc.child(1).type.name).toBe('codeBlock')
      expect(editor.state.doc.textContent).toBe('fooconst value = 1bar')
    } finally {
      editor.destroy()
    }
  })

  it('falls back to regular paste handling inside code blocks', () => {
    const editor = createEditor()
    const event = createClipboardEvent('\nconst after = false;')

    try {
      editor.commands.setContent({
        type: 'doc',
        content: [
          {
            type: 'codeBlock',
            attrs: { language: null },
            content: [{ type: 'text', text: 'const before = true;' }]
          }
        ]
      })
      editor.commands.setTextSelection((editor.state.doc.firstChild?.nodeSize ?? 0) - 1)
      const contentBeforePaste = editor.getJSON().content

      const handled = handlePaste(editor, event)

      expect(handled).toBe(false)
      expect(editor.getJSON().content).toEqual(contentBeforePaste)
    } finally {
      editor.destroy()
    }
  })

  it('falls back to regular paste handling when markdown insertion cannot handle the text', () => {
    const editor = createEditor()

    try {
      editor.view.pasteText('https://opencloud.eu ')

      const textNode = editor.state.doc.firstChild?.firstChild
      expect(editor.state.doc.textContent).toBe('https://opencloud.eu ')
      expect(textNode?.marks.find(({ type }) => type.name === 'link')?.attrs.href).toBe(
        'https://opencloud.eu'
      )
    } finally {
      editor.destroy()
    }
  })
})
