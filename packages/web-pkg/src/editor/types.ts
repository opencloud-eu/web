import type { ShallowRef, Ref, ComputedRef } from 'vue'
import { Editor } from '@tiptap/vue-3'
import type * as Y from 'yjs'
import { EditorActionGroup } from './composables'

export type ContentType = 'plain-text' | 'markdown' | 'html' | 'tiptap-json'

export interface TextEditorOptions {
  contentType: ContentType
  modelValue?: Ref<string>
  readonly?: boolean
  slashCommands?: boolean
  placeholder?: string
  onUpdate?: (content: string) => void
  onRequestLinkUrl?: (currentUrl?: string) => Promise<string | null>
  onRequestImageUrl?: () => Promise<string | null>
  /**
   * When set, the editor binds its ProseMirror state to this Y.Doc via the
   * `@tiptap/extension-collaboration` extension. Initial content is taken
   * from the Y.Doc state (populated by the host's hydration path) instead
   * of from `modelValue`. The undo manager comes from `yUndoPlugin` via
   * `@tiptap/y-tiptap` — `StarterKit`'s built-in `undoRedo` is already
   * disabled in every strategy to avoid conflict.
   */
  ydoc?: Y.Doc
  /**
   * Y.XmlFragment field name inside the Y.Doc. Matches the
   * `CollaborativeWrapper` adapter convention. Defaults to `'default'`.
   */
  ydocFragment?: string
}

export interface TextEditorState {
  sourceMode: Ref<boolean>
}

export interface TextEditorInstance {
  state: TextEditorState
  editor: ShallowRef<Editor | null>
  contentType: Ref<ContentType>
  readonly: Ref<boolean>
  actionGroups(): EditorActionGroup[]
  getContent(): string
  isEmpty: ComputedRef<boolean>
  isFocused: ComputedRef<boolean>
  focus(): void
  blur(): void
  destroy(): void
}
