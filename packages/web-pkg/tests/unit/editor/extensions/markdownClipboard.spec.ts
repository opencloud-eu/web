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
  return editor.view.someProp('handlePaste', (handler) =>
    handler(editor.view, event, Slice.empty as ProseMirrorSlice)
  )
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
      const clipboardText = editor.view.serializeForClipboard(editor.state.selection.content()).text

      expect(clipboardText).toContain('# Heading')
      expect(clipboardText).toContain('**bold**')
      expect(clipboardText).toContain('[linked](https://opencloud.eu)')
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

})
