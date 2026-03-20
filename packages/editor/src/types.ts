import type { ShallowRef, Ref, ComputedRef } from 'vue'
import type { Range } from '@tiptap/core'
import type { Editor } from '@tiptap/vue-3'
import type { ToolbarGroup } from './toolbar/types'

export type ContentType = 'plain-text' | 'markdown' | 'html' | 'tiptap-json'

export interface SlashCommandItem {
  id: string
  title: string
  description?: string
  icon?: string
  keywords?: string[]
  command: (ctx: { editor: Editor; range: Range }) => void
}

export interface SlashCommandGroup {
  id: string
  title: string
  items: SlashCommandItem[]
}

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
