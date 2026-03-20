import type { Editor } from '@tiptap/vue-3'

export interface ToolbarItem {
  id: string
  label: string
  icon: string
  action: (editor: Editor) => void
  isActive: (editor: Editor) => boolean
  isEnabled?: (editor: Editor) => boolean
}

export type ToolbarGroup = ToolbarItem[]
