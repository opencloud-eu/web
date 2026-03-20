import type { ShallowRef, Ref, ComputedRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'

export type ContentType = 'plain-text' | 'markdown' | 'html' | 'tiptap-json'

export interface TextEditorOptions {
  contentType: ContentType
  modelValue?: string
  readonly?: boolean
  onUpdate?: (content: string) => void
  onRequestLinkUrl?: (currentUrl?: string) => Promise<string | null>
  onRequestImageUrl?: () => Promise<string | null>
}

export interface TextEditorInstance {
  editor: ShallowRef<Editor | null>
  contentType: Ref<ContentType>
  readonly: Ref<boolean>
  // TODO: Replace `any[]` with proper `ToolbarGroup[]` type from ./toolbar/types once Task 2 creates it
  toolbarItems: any[]
  getContent(): string
  setContent(value: string): void
  isEmpty: ComputedRef<boolean>
  isFocused: ComputedRef<boolean>
  focus(): void
  blur(): void
  destroy(): void
}
