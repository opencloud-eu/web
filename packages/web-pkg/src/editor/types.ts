import type { ShallowRef, Ref, ComputedRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import type { EditorActionGroup } from './composables'

export type ContentType = 'plain-text' | 'markdown' | 'html' | 'tiptap-json'
export type TextEditorToolbarVariant = 'default' | 'expanded-compose' | 'mobile'

export interface TextEditorOptions {
  contentType: ContentType
  modelValue?: Ref<string>
  readonly?: boolean
  slashCommands?: boolean
  placeholder?: string
  onUpdate?: (content: string) => void
  onRequestLinkUrl?: (currentUrl?: string) => Promise<string | null>
  onRequestImageUrl?: () => Promise<string | null>
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
