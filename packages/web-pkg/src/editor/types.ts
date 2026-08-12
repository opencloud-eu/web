import type { ShallowRef, Ref, ComputedRef } from 'vue'
import type { Range } from '@tiptap/core'
import type { Editor } from '@tiptap/vue-3'
import type { Resource } from '@opencloud-eu/web-client'
import type { EditorActionGroup } from './composables'

export type ContentType = 'plain-text' | 'markdown' | 'html' | 'tiptap-json'

export interface TextEditorOptions {
  contentType: ContentType
  modelValue?: Ref<string>
  currentResource?: Ref<Resource>
  readonly?: boolean
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
  readonly: Ref<boolean>
  actionGroups(): EditorActionGroup[]
  getContent(): string
  setContent(value: string): void
  isEmpty: ComputedRef<boolean>
  isFocused: ComputedRef<boolean>
  focus(): void
  blur(): void
  destroy(): void
}
