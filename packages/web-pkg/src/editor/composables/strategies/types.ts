import type { Extension } from '@tiptap/core'
import type { EditorActionGroup } from '../useEditorActions'
import type { Editor } from '@tiptap/vue-3'

export interface ExtensionsOptions {
  /**
   * The editor binds to a shared Y.Doc. Strategies must then drop
   * `StarterKit`'s `undoRedo`, because the `Collaboration` extension brings
   * the collab-aware undo manager (`yUndoPlugin`) and Tiptap warns and
   * double-stacks history when both run.
   */
  collaborative?: boolean
}

export interface ContentTypeStrategy {
  editorContentType?(): string
  serialize(editor: Editor): string
  deserialize(content: string): Record<string, unknown> | string
  extensions(options?: ExtensionsOptions): Extension[]
  editorActionGroups(): EditorActionGroup[]
}
