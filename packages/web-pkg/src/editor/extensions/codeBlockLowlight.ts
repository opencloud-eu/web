import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import CodeBlockComponent from '../components/CodeBlockComponent.vue'
import { lowlight } from './lowlight'

export function createCodeBlockLowlight() {
  return CodeBlockLowlight.extend({
    addNodeView() {
      return VueNodeViewRenderer(CodeBlockComponent)
    }
  }).configure({
    lowlight,
    enableTabIndentation: true
  })
}
