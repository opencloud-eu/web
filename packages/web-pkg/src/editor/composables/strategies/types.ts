import type { Extension } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { EditorActionGroup } from '../useEditorActions'

export interface ExtensionsOptions {
  /**
   * The editor binds to a shared Y.Doc. Strategies must then drop
   * `StarterKit`'s `undoRedo`, because the `Collaboration` extension brings
   * the Yjs-aware undo manager (`yUndoPlugin`) and Tiptap warns and
   * double-stacks history when both run.
   */
  yjs?: boolean
}

export interface ContentTypeStrategy {
  editorContentType?(): string
  /**
   * Render a ProseMirror document to the native string format.
   *
   * Takes the document node rather than an `Editor` so it can also run on a
   * document that no editor is mounted on (e.g. relevant for the Yjs
   * adapter). A mounted editor passes `editor.state.doc`.
   */
  serialize(doc: ProseMirrorNode): string
  deserialize(content: string): Record<string, unknown> | string
  extensions(options?: ExtensionsOptions): Extension[]
  editorActionGroups(): EditorActionGroup[]
}
