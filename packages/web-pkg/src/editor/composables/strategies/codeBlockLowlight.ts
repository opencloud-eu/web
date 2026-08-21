import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import { common, createLowlight } from 'lowlight'
import CodeBlockComponent from '../../components/CodeBlockComponent.vue'

const lowlight = createLowlight(common)

export function createCodeBlockLowlight() {
  return CodeBlockLowlight.extend({
    addNodeView() {
      return VueNodeViewRenderer(CodeBlockComponent)
    }
  }).configure({ lowlight })
}
