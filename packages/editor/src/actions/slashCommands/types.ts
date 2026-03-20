import type { Range } from '@tiptap/core'
import type { Editor } from '@tiptap/vue-3'

export interface SlashCommandItem {
  id: string
  title: string
  description?: string
  icon?: string
  iconFillType?: 'fill' | 'line' | 'none'
  keywords?: string[]
  command: (ctx: { editor: Editor; range: Range }) => void
  isVisible?: (editor: Editor) => boolean
}

export interface SlashCommandGroup {
  id: string
  title: string
  items: SlashCommandItem[]
}
