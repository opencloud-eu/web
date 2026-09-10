import type { Editor } from '@tiptap/core'
import type { EditorAction } from '../composables'

/** Actions that stay usable while the editor is in source mode. */
export const sourceModeEnabledActionIds = [
  'source-mode',
  'menu-zoom',
  'zoom-in',
  'zoom-out',
  'zoom-reset'
]

export function isEditorActionEnabled(
  action: EditorAction,
  editor: Editor | null | undefined,
  isSourceMode: boolean
): boolean {
  if (isSourceMode && !sourceModeEnabledActionIds.includes(action.id)) {
    return false
  }

  if (!editor) {
    return false
  }

  if (action.isEnabled) {
    return action.isEnabled(editor)
  }

  return true
}
