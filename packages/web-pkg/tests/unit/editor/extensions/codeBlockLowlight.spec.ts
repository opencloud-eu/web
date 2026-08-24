import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { describe, expect, it } from 'vitest'
import { createCodeBlockLowlight } from '../../../../src/editor/extensions/codeBlockLowlight'

describe('editor code block lowlight extension', () => {
  it('renders selected language for a readonly language badge', () => {
    const editor = new Editor({
      extensions: [StarterKit.configure({ codeBlock: false }), createCodeBlockLowlight()]
    })

    editor.commands.setContent({
      type: 'doc',
      content: [
        {
          type: 'codeBlock',
          attrs: { language: 'typescript' },
          content: [{ type: 'text', text: 'const a = 1' }]
        }
      ]
    })

    expect(editor.getHTML()).toContain(
      '<pre data-language="typescript"><code class="language-typescript">'
    )

    editor.destroy()
  })

  it('does not render a language badge when no language is selected', () => {
    const editor = new Editor({
      extensions: [StarterKit.configure({ codeBlock: false }), createCodeBlockLowlight()]
    })

    editor.commands.setContent({
      type: 'doc',
      content: [
        {
          type: 'codeBlock',
          attrs: { language: null },
          content: [{ type: 'text', text: 'const a = 1' }]
        }
      ]
    })

    expect(editor.getHTML()).not.toContain('data-language=')

    editor.destroy()
  })
})
