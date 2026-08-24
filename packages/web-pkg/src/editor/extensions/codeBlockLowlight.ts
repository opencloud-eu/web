import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { mergeAttributes } from '@tiptap/core'
import { common, createLowlight } from 'lowlight'

const lowlight = createLowlight(common)

export function createCodeBlockLowlight() {
  return CodeBlockLowlight.extend({
    renderHTML({ node, HTMLAttributes }) {
      const language = (node.attrs.language as string | null) ?? null

      return [
        'pre',
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, language ? { 'data-language': language } : {}),
        [
          'code',
          {
            class: language ? this.options.languageClassPrefix + language : null
          },
          0
        ]
      ]
    }
  }).configure({
    lowlight,
    enableTabIndentation: true
  })
}
