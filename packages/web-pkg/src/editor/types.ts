import type { ShallowRef, Ref, ComputedRef } from 'vue'
import type { ToolbarGroup, SlashCommandGroup } from './actions'
import { Editor } from '@tiptap/vue-3'

export type ContentType = 'plain-text' | 'markdown' | 'html' | 'tiptap-json'

export interface TextEditorOptions {
  contentType: ContentType
  modelValue?: string
  readonly?: boolean
  slashCommands?: boolean
  slashCommandItems?: SlashCommandGroup[]
  onUpdate?: (content: string) => void
  onRequestLinkUrl?: (currentUrl?: string) => Promise<string | null>
  onRequestImageUrl?: () => Promise<string | null>
}

export interface TextEditorInstance {
  editor: ShallowRef<Editor | null>
  contentType: Ref<ContentType>
  readonly: Ref<boolean>
  toolbarItems: ToolbarGroup[]
  getContent(): string
  setContent(value: string): void
  isEmpty: ComputedRef<boolean>
  isFocused: ComputedRef<boolean>
  focus(): void
  blur(): void
  destroy(): void
}
