import { Editor } from '@tiptap/core'
import { AllSelection } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import { describe, expect, it } from 'vitest'
import { createPlainTextClipboardExtension } from '../../../../src/editor/extensions/plainTextClipboard'

function createEditor(): Editor {
  return new Editor({
    extensions: [
      StarterKit.configure({
        blockquote: false,
        bold: false,
        bulletList: false,
        code: false,
        codeBlock: false,
        heading: false,
        italic: false,
        link: false,
        listItem: false,
        listKeymap: false,
        orderedList: false,
        strike: false
      }),
      createPlainTextClipboardExtension()
    ]
  })
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

function copyAll(editor: Editor) {
  editor.view.dispatch(editor.state.tr.setSelection(new AllSelection(editor.state.doc)))
  return editor.view.serializeForClipboard(editor.state.selection.content()).text
}

function getLines(editor: Editor) {
  const lines: string[] = []
  editor.state.doc.forEach((node) => lines.push(node.textContent))
  return lines
}

describe('plain text clipboard extension', () => {
  it('pastes the text/plain payload instead of html when both clipboard formats exist', () => {
    const editor = createEditor()
    const event = createClipboardEvent(
      '# Heading\n\n- item **bold**',
      '<h1>Heading</h1><ul><li><p>item <strong>bold</strong></p></li></ul>'
    )

    try {
      editor.view.dom.dispatchEvent(event)

      expect(event.defaultPrevented).toBe(true)
      expect(getLines(editor)).toEqual(['# Heading', '', '- item **bold**'])
    } finally {
      editor.destroy()
    }
  })

  it('keeps empty lines as empty paragraphs', () => {
    const editor = createEditor()

    try {
      editor.view.pasteText('first\n\n\nsecond')

      expect(getLines(editor)).toEqual(['first', '', '', 'second'])
    } finally {
      editor.destroy()
    }
  })

  it('pastes a single line inline into the current paragraph', () => {
    const editor = createEditor()

    try {
      editor.commands.setContent({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello ' }] }]
      })
      editor.commands.focus('end')
      editor.view.pasteText('world')

      expect(getLines(editor)).toEqual(['hello world'])
    } finally {
      editor.destroy()
    }
  })

  it('falls back to the default paste handling when no text/plain payload exists', () => {
    const editor = createEditor()
    const event = createClipboardEvent('', '<p>html only</p>')

    try {
      editor.view.dom.dispatchEvent(event)

      expect(getLines(editor)).toEqual(['html only'])
    } finally {
      editor.destroy()
    }
  })

  it('does not paste into a read-only editor', () => {
    const editor = createEditor()
    const event = createClipboardEvent('pasted', '')

    try {
      editor.commands.setContent({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'original' }] }]
      })
      editor.setEditable(false)
      editor.view.dom.dispatchEvent(event)

      expect(event.defaultPrevented).toBe(false)
      expect(getLines(editor)).toEqual(['original'])
    } finally {
      editor.destroy()
    }
  })

  it('copies one line per paragraph, including empty ones and hard breaks', () => {
    const editor = createEditor()

    try {
      editor.commands.setContent({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'first' },
              { type: 'hardBreak' },
              { type: 'text', text: 'second' }
            ]
          },
          { type: 'paragraph' },
          { type: 'paragraph', content: [{ type: 'text', text: 'third' }] }
        ]
      })

      expect(copyAll(editor)).toBe('first\nsecond\n\nthird')
    } finally {
      editor.destroy()
    }
  })

  it('round-trips copied content without changing the lines', () => {
    const editor = createEditor()

    try {
      editor.view.pasteText('first\n\nsecond\nthird')
      const clipboardText = copyAll(editor)

      editor.view.pasteText(clipboardText)

      expect(clipboardText).toBe('first\n\nsecond\nthird')
      expect(getLines(editor)).toEqual(['first', '', 'second', 'third'])
    } finally {
      editor.destroy()
    }
  })
})
