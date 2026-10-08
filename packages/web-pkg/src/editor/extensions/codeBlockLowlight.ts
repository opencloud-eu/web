import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import CodeBlockComponent from '../components/CodeBlockComponent.vue'
import { lowlight } from './lowlight'

export function createCodeBlockLowlight() {
  return CodeBlockLowlight.extend({
    parseMarkdown(token, helpers) {
      // FIXME: tiptap drops fenced code blocks indented 1-3 spaces. marked
      // removes that indentation from the code, but only for backtick fences.
      const [, indent, marker] = /^( {1,3})(```|~~~)/.exec(token.raw ?? '') ?? []
      if (!indent) {
        return this.parent?.(token, helpers)
      }
      const text =
        marker === '~~~'
          ? token.text?.replace(new RegExp(`^ {1,${indent.length}}`, 'gm'), '')
          : token.text
      return this.parent?.({ ...token, raw: token.raw.trimStart(), text }, helpers)
    },

    addNodeView() {
      return VueNodeViewRenderer(CodeBlockComponent)
    }
  }).configure({
    lowlight,
    enableTabIndentation: true
  })
}
