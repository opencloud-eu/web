import { Editor } from '@tiptap/core'
import { Markdown } from '@tiptap/markdown'
import { AllSelection } from '@tiptap/pm/state'
import { CellSelection } from '@tiptap/pm/tables'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import StarterKit from '@tiptap/starter-kit'
import { Marked } from 'marked'
import type { marked as markedDefault } from 'marked'
import { describe, expect, it, vi } from 'vitest'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import { createLinkExtension } from '../../../../src/editor/extensions/link'
import { createMarkdownClipboardExtension } from '../../../../src/editor/extensions/markdownClipboard'
import { load } from '../strategies/helpers'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

function createEditor(): Editor {
  const marked = new Marked() as unknown as typeof markedDefault

  return new Editor({
    extensions: [
      StarterKit.configure({ link: false }),
      Markdown.configure({ marked }),
      createMarkdownClipboardExtension(),
      createLinkExtension(),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader
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

      expect(copySelectionAsText(editor)).toBe('ipsum')
    } finally {
      editor.destroy()
    }
  })

  it('copies a selection across several list items with the list markers', () => {
    const editor = createEditor()

    try {
      editor.commands.setContent('- lorem\n- ipsum\n- dolor', { contentType: 'markdown' })
      editor.commands.setTextSelection({
        from: findTextRange(editor, 'rem').from,
        to: findTextRange(editor, 'ipsum').to
      })

      expect(copySelectionAsText(editor)).toBe('- rem\n- ipsum')
    } finally {
      editor.destroy()
    }
  })

  it('copies a selection from a list item into its sub item with both list markers', () => {
    const editor = createEditor()

    try {
      editor.commands.setContent('- lorem\n  - ipsum\n- dolor', { contentType: 'markdown' })
      editor.commands.setTextSelection({
        from: findTextRange(editor, 'lorem').from,
        to: findTextRange(editor, 'ipsum').to
      })

      expect(copySelectionAsText(editor)).toBe('- lorem\n  - ipsum')
    } finally {
      editor.destroy()
    }
  })

  it('copies a selection across paragraphs inside a list item without the list marker', () => {
    const editor = createEditor()

    try {
      editor.commands.setContent('- lorem\n\n  ipsum', { contentType: 'markdown' })
      editor.commands.setTextSelection({
        from: findTextRange(editor, 'lorem').from,
        to: findTextRange(editor, 'ipsum').to
      })

      expect(copySelectionAsText(editor)).toBe('lorem\n\nipsum')
    } finally {
      editor.destroy()
    }
  })

  it('copies selected text inside a table cell without the table', () => {
    const editor = createEditor()

    try {
      editor.commands.setContent('| Head |\n| --- |\n| hello **bold** world |\n| target |', {
        contentType: 'markdown'
      })
      selectText(editor, 'hello')

      expect(copySelectionAsText(editor)).toBe('hello')
    } finally {
      editor.destroy()
    }
  })

  it('pastes text copied from a table cell into another cell', () => {
    const editor = createEditor()

    try {
      editor.commands.setContent('| Head |\n| --- |\n| hello **bold** world |\n| target |', {
        contentType: 'markdown'
      })
      selectText(editor, 'hello')
      const clipboardText = copySelectionAsText(editor)

      editor.commands.setTextSelection(findTextRange(editor, 'target').to)
      editor.view.pasteText(clipboardText)

      const table = editor.state.doc.firstChild
      expect(table?.childCount).toBe(3)
      expect(table?.lastChild?.textContent).toBe('targethello')
    } finally {
      editor.destroy()
    }
  })

  it('copies selected text inside a heading without the heading marker', () => {
    const editor = createEditor()

    try {
      editor.commands.setContent('# Heading *text*', { contentType: 'markdown' })
      selectText(editor, 'Heading')

      expect(copySelectionAsText(editor)).toBe('Heading')
    } finally {
      editor.destroy()
    }
  })

  it('copies selected marked text inside a list item with its marks', () => {
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

      expect(clipboardText).toBe('**ipsum**')
    } finally {
      editor.destroy()
    }
  })

  it('copies selected text inside a code block as is without code fences', () => {
    const editor = createEditor()

    try {
      editor.commands.setContent({
        type: 'doc',
        content: [
          {
            type: 'codeBlock',
            attrs: { language: 'js' },
            content: [{ type: 'text', text: 'const value = a * b_c\nfoo()' }]
          }
        ]
      })
      selectText(editor, 'value = a * b_c\nfoo')

      const clipboardText = copySelectionAsText(editor)

      expect(clipboardText).toBe('value = a * b_c\nfoo')
    } finally {
      editor.destroy()
    }
  })

  describe('pasting text copied from inside a code block', () => {
    function createCodeEditor() {
      const editor = createEditor()
      editor.commands.setContent({
        type: 'doc',
        content: [
          {
            type: 'codeBlock',
            attrs: { language: 'sh' },
            content: [{ type: 'text', text: 'run\n# install\n- step __init__' }]
          },
          { type: 'paragraph', content: [{ type: 'text', text: 'target' }] },
          {
            type: 'codeBlock',
            attrs: { language: null },
            content: [{ type: 'text', text: 'other' }]
          }
        ]
      })
      selectText(editor, '# install\n- step __init__')

      const { dom, text } = editor.view.serializeForClipboard(editor.state.selection.content())
      return { editor, event: createClipboardEvent(text, dom.innerHTML) }
    }

    it('inserts a code block outside of code', () => {
      const { editor, event } = createCodeEditor()

      try {
        editor.commands.setTextSelection(findTextRange(editor, 'target').to)

        expect(pasteClipboardEvent(editor, event)).toBe(true)
        const pasted = editor.state.doc.child(2)
        expect(editor.state.doc.child(1).textContent).toBe('target')
        expect(pasted.type.name).toBe('codeBlock')
        expect(pasted.attrs.language).toBe('sh')
        expect(pasted.textContent).toBe('# install\n- step __init__')
      } finally {
        editor.destroy()
      }
    })

    it('inserts text copied from frontmatter as a code block', () => {
      createTestingPinia()
      const { editor } = load('---\ntitle: x\ntags:\n  - a\n---\n\ntarget')

      try {
        selectText(editor, 'tags:\n  - a')
        const { dom, text } = editor.view.serializeForClipboard(editor.state.selection.content())
        editor.commands.setTextSelection(findTextRange(editor, 'target').to)

        expect(pasteClipboardEvent(editor, createClipboardEvent(text, dom.innerHTML))).toBe(true)
        const pasted = editor.state.doc.child(2)
        expect(pasted.type.name).toBe('codeBlock')
        expect(pasted.textContent).toBe('tags:\n  - a')
      } finally {
        editor.destroy()
      }
    })

    it('inserts text copied from an html block as an html block', () => {
      createTestingPinia()
      const { editor } = load('<details>\n<summary>Foo</summary>\n</details>\n\ntarget')

      try {
        selectText(editor, '<summary>Foo</summary>')
        const { dom, text } = editor.view.serializeForClipboard(editor.state.selection.content())
        editor.commands.setTextSelection(findTextRange(editor, 'target').to)

        expect(pasteClipboardEvent(editor, createClipboardEvent(text, dom.innerHTML))).toBe(true)
        const pasted = editor.state.doc.child(2)
        expect(pasted.type.name).toBe('htmlBlock')
        expect(pasted.textContent).toBe('<summary>Foo</summary>')
      } finally {
        editor.destroy()
      }
    })

    it('leaves multi cell selections to the tables plugin', () => {
      const { editor, event } = createCodeEditor()

      try {
        editor.commands.insertContentAt(
          editor.state.doc.content.size,
          '| A | B |\n| --- | --- |\n| one | two |',
          { contentType: 'markdown' }
        )
        const cellPos = (text: string) => editor.state.doc.resolve(findTextRange(editor, text).from)
        editor.view.dispatch(
          editor.state.tr.setSelection(
            new CellSelection(
              editor.state.doc.resolve(cellPos('one').before(-1)),
              editor.state.doc.resolve(cellPos('two').before(-1))
            )
          )
        )

        expect(pasteClipboardEvent(editor, event)).toBe(true)
        const cells: string[] = []
        editor.state.doc.forEach((node) => {
          if (node.type.name === 'table') {
            node.lastChild?.forEach((cell) => cells.push(cell.textContent))
          }
        })
        expect(cells).toHaveLength(2)
        expect(cells.every((text) => text.includes('install'))).toBe(true)
      } finally {
        editor.destroy()
      }
    })

    it('inserts the raw text into another code block', () => {
      const { editor, event } = createCodeEditor()

      try {
        editor.commands.setTextSelection(findTextRange(editor, 'other').to)

        expect(pasteClipboardEvent(editor, event)).toBe(true)
        expect(editor.state.doc.child(2).textContent).toBe('other# install\n- step __init__')
      } finally {
        editor.destroy()
      }
    })
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

  it('does not paste into a read-only editor', () => {
    const editor = createEditor()
    const event = createClipboardEvent('# Heading', '')

    try {
      editor.commands.setContent('original', { contentType: 'markdown' })
      editor.setEditable(false)

      const handled = pasteClipboardEvent(editor, event)

      expect(handled).toBe(false)
      expect(editor.markdown?.serialize(editor.getJSON()).trim()).toBe('original')
    } finally {
      editor.destroy()
    }
  })
})
