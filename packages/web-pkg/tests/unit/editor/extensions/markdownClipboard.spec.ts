import { Editor } from '@tiptap/core'
import { Markdown } from '@tiptap/markdown'
import { AllSelection } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import { Marked } from 'marked'
import type { marked as markedDefault } from 'marked'
import { describe, expect, it } from 'vitest'
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

function copySelectionAsText(editor: Editor) {
  return editor.view.serializeForClipboard(editor.state.selection.content()).text
}

function createClipboardEvent(text: string, html: string): ClipboardEvent {
  const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent

  Object.defineProperty(event, 'clipboardData', {
    value: {
      getData: (type: string) => {
        if (type === 'text/plain') {
          return text
        }

        if (type === 'text/html') {
          return html
        }

        return ''
      }
    }
  })

  return event
}

function pasteClipboardEvent(editor: Editor, event: ClipboardEvent) {
  editor.view.dom.dispatchEvent(event)
  return event.defaultPrevented
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

  it('copies selected text inside a list item with the list marker', () => {
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

      expect(clipboardText.trim()).toBe('- ipsum')
    } finally {
      editor.destroy()
    }
  })

  it('copies selected marked text inside a list item with the list marker', () => {
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
                    content: [
                      {
                        type: 'text',
                        text: 'lorem ipsum',
                        marks: [{ type: 'bold' }]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      })
      selectText(editor, 'ipsum')

      const clipboardText = copySelectionAsText(editor)

      expect(clipboardText.trim()).toBe('- **ipsum**')
    } finally {
      editor.destroy()
    }
  })

  it('copies selected text inside a code block with code fences', () => {
    const editor = createEditor()

    try {
      editor.commands.setContent({
        type: 'doc',
        content: [
          {
            type: 'codeBlock',
            attrs: { language: null },
            content: [{ type: 'text', text: 'const value = 1' }]
          }
        ]
      })
      selectText(editor, 'value')

      const clipboardText = copySelectionAsText(editor)

      expect(clipboardText.trim()).toBe('```\nvalue\n```')
    } finally {
      editor.destroy()
    }
  })

  it('pastes markdown text as structured editor content', () => {
    const editor = createEditor()

    try {
      const handled = editor.view.pasteText('# Heading\n\nThis is **bold**.')

      expect(handled).toBe(true)
      expect(editor.state.doc.firstChild?.type.name).toBe('heading')
      expect(editor.markdown?.serialize(editor.getJSON())).toContain('# Heading')
      expect(editor.markdown?.serialize(editor.getJSON())).toContain('**bold**')
    } finally {
      editor.destroy()
    }
  })

  it('pastes markdown text instead of html when both clipboard formats exist', () => {
    const editor = createEditor()
    const event = createClipboardEvent(
      '# Heading\n\nThis is **bold**.',
      '<html><body><p>Plain html content</p></body></html>'
    )

    try {
      const handled = pasteClipboardEvent(editor, event)

      expect(handled).toBe(true)
      expect(editor.state.doc.firstChild?.type.name).toBe('heading')
      expect(editor.markdown?.serialize(editor.getJSON())).toContain('# Heading')
      expect(editor.markdown?.serialize(editor.getJSON())).toContain('**bold**')
    } finally {
      editor.destroy()
    }
  })
})
