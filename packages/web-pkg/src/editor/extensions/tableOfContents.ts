import { TableOfContents } from '@tiptap/extension-table-of-contents'
import type { TextEditorState } from '../types'

/**
 * Collects the document's headings into `state.tableOfContents`, which the
 * floating outline in `TextEditorContent` renders.
 *
 * The extension also stamps every heading with an `id` and a `data-toc-id`.
 * Formats that keep node attributes (tiptap-json) persist them, markdown
 * drops them on serialize and they get regenerated on the next load.
 *
 * Its own scroll tracking is left alone: it binds to the scroll parent while
 * the editor is created, before the view is mounted into our scroll
 * container. The outline works out the active heading itself.
 */
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
