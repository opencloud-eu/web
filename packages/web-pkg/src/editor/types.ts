import type { ShallowRef, Ref, ComputedRef, MaybeRefOrGetter } from 'vue'
import type { Range } from '@tiptap/core'
import type { Resource } from '@opencloud-eu/web-client'
import type { Editor } from '@tiptap/vue-3'
import type * as Y from 'yjs'
import type { Awareness } from 'y-protocols/awareness'
import type { EditorActionGroup } from './composables'

export type ContentType = 'plain-text' | 'markdown' | 'html' | 'tiptap-json'

/**
 * Default Y.XmlFragment field name. Shared by `useTextEditor` and the
 * collaborative adapter, which must bind to the same field.
 */
export const DEFAULT_YDOC_FRAGMENT = 'default'

export interface TextEditorOptions {
  contentType: ContentType
  modelValue?: Ref<string>
  currentResource?: Ref<Resource>
  /**
   * Accepts a ref or getter, not just a snapshot: a collaborative session can
   * flip the editor read-only mid-edit (locking the room on an app-version
   * mismatch, say), and the ProseMirror view has to follow.
   */
  readonly?: MaybeRefOrGetter<boolean>
  slashCommands?: boolean
  placeholder?: string
  /** Accessible name for the editor's role="textbox" element (aria-label). */
  ariaLabel?: string
  /**
   * Action ids to exclude from the toolbar and slash commands (e.g. 'image-upload'),
   * including nested dropdown children.
   */
  excludeActions?: string[]
  onUpdate?: (content: string) => void
  /**
   * When set, the editor binds its ProseMirror state to this Y.Doc via the
   * `@tiptap/extension-collaboration` extension. Initial content is taken
   * from the Y.Doc state (populated by the host's hydration path) instead
   * of from `modelValue`.
   */
  ydoc?: Y.Doc
  /**
   * Y.XmlFragment field name inside the Y.Doc. Must match the field the
   * collaborative adapter binds to. Defaults to {@link DEFAULT_YDOC_FRAGMENT}.
   */
  ydocFragment?: string
  /**
   * Awareness instance from the same room as `ydoc`. When set, the editor
   * renders remote peer cursors via `yCursorPlugin`. Ignored when `ydoc`
   * is not also set.
   */
  awareness?: Awareness
}

export interface TextEditorLinkPanelRequest {
  range: Range
  href: string
  text: string
}

export interface TextEditorState {
  sourceMode: Ref<boolean>
  linkPanel: Ref<TextEditorLinkPanelRequest | null>
  editorZoom: Ref<number>
  currentResource?: Ref<Resource | null>
}

export interface TextEditorInstance {
  state: TextEditorState
  editor: ShallowRef<Editor | null>
  contentType: Ref<ContentType>
  /** Derived from the caller's `readonly` option; follows it while mounted. */
  readonly: ComputedRef<boolean>
  actionGroups(): EditorActionGroup[]
  getContent(): string
  setContent(value: string): void
  isEmpty: ComputedRef<boolean>
  isFocused: ComputedRef<boolean>
  focus(): void
  blur(): void
  destroy(): void
}
