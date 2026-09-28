import { TableOfContents } from '@tiptap/extension-table-of-contents'
import type { TextEditorState } from '../types'

export function createTableOfContentsExtension(state: TextEditorState) {
  return TableOfContents.configure({
    onUpdate(anchors) {
      if (!state.tableOfContents) {
        return
      }
      state.tableOfContents.value = anchors
    }
  })
}
