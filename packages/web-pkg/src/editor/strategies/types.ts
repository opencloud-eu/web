import type { Extension } from '@tiptap/core'
import type { Editor } from '@tiptap/vue-3'
import type { SlashCommandGroup, ToolbarGroup } from '../actions'

export interface ContentTypeStrategy {
  extensions(): Extension[]
  toolbarItems(): ToolbarGroup[]
  defaultSlashCommandGroups(): SlashCommandGroup[]
  serialize(editor: Editor): string
  deserialize(content: string): Record<string, unknown> | string
  /** Optional tiptap contentType option for initial content parsing (e.g. 'markdown') */
  editorContentType?(): string
}
