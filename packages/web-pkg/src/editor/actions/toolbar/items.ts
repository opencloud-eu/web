import type { Editor } from '@tiptap/vue-3'
import type { ToolbarItem } from './types'

const item = (
  id: string,
  label: string,
  icon: string,
  action: (editor: Editor) => void,
  isActive: (editor: Editor) => boolean,
  isEnabled?: (editor: Editor) => boolean
): ToolbarItem => ({ id, label, icon, action, isActive, isEnabled })

// --- Text formatting ---
export const bold = (label: string): ToolbarItem =>
  item(
    'bold',
    label,
    'bold',
    (e) => e.chain().focus().toggleBold().run(),
    (e) => e.isActive('bold')
  )

export const italic = (label: string): ToolbarItem =>
  item(
    'italic',
    label,
    'italic',
    (e) => e.chain().focus().toggleItalic().run(),
    (e) => e.isActive('italic')
  )

export const underline = (label: string): ToolbarItem =>
  item(
    'underline',
    label,
    'underline',
    (e) => e.chain().focus().toggleUnderline().run(),
    (e) => e.isActive('underline')
  )

export const strikethrough = (label: string): ToolbarItem =>
  item(
    'strikethrough',
    label,
    'strikethrough',
    (e) => e.chain().focus().toggleStrike().run(),
    (e) => e.isActive('strike')
  )

// --- Headings ---
export const heading1 = (label: string): ToolbarItem =>
  item(
    'heading-1',
    label,
    'h-1',
    (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
    (e) => e.isActive('heading', { level: 1 })
  )

export const heading2 = (label: string): ToolbarItem =>
  item(
    'heading-2',
    label,
    'h-2',
    (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    (e) => e.isActive('heading', { level: 2 })
  )

export const heading3 = (label: string): ToolbarItem =>
  item(
    'heading-3',
    label,
    'h-3',
    (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    (e) => e.isActive('heading', { level: 3 })
  )

// --- Lists ---
export const bulletList = (label: string): ToolbarItem =>
  item(
    'bullet-list',
    label,
    'list-unordered',
    (e) => e.chain().focus().toggleBulletList().run(),
    (e) => e.isActive('bulletList')
  )

export const orderedList = (label: string): ToolbarItem =>
  item(
    'ordered-list',
    label,
    'list-ordered-2',
    (e) => e.chain().focus().toggleOrderedList().run(),
    (e) => e.isActive('orderedList')
  )

export const taskList = (label: string): ToolbarItem =>
  item(
    'task-list',
    label,
    'list-check-3',
    (e) => e.chain().focus().toggleTaskList().run(),
    (e) => e.isActive('taskList')
  )

// --- Block ---
export const blockquote = (label: string): ToolbarItem =>
  item(
    'blockquote',
    label,
    'chat-quote-line',
    (e) => e.chain().focus().toggleBlockquote().run(),
    (e) => e.isActive('blockquote')
  )

export const codeInline = (label: string): ToolbarItem =>
  item(
    'code-inline',
    label,
    'code-line',
    (e) => e.chain().focus().toggleCode().run(),
    (e) => e.isActive('code')
  )

export const codeBlock = (label: string): ToolbarItem =>
  item(
    'code-block',
    label,
    'code-box-line',
    (e) => e.chain().focus().toggleCodeBlock().run(),
    (e) => e.isActive('codeBlock')
  )

export const horizontalRule = (label: string): ToolbarItem =>
  item(
    'horizontal-rule',
    label,
    'separator',
    (e) => e.chain().focus().setHorizontalRule().run(),
    () => false
  )

// --- Insert ---
// Link and image use callback-based actions so consumers can provide their own
// modal UI (e.g. design-system modals with DOMPurify sanitization).
export const link = (
  label: string,
  onRequestUrl: (editor: Editor, currentUrl?: string) => void
): ToolbarItem =>
  item(
    'link',
    label,
    'link',
    (e) => {
      const previousUrl = e.getAttributes('link').href as string | undefined
      onRequestUrl(e, previousUrl)
    },
    (e) => e.isActive('link')
  )

export const image = (label: string, onRequestUrl: (editor: Editor) => void): ToolbarItem =>
  item(
    'image',
    label,
    'image-line',
    (e) => {
      onRequestUrl(e)
    },
    () => false
  )

export const table = (label: string): ToolbarItem =>
  item(
    'table',
    label,
    'table-line',
    (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    () => false
  )

// --- Table manipulation ---
export const addRowBefore = (label: string): ToolbarItem =>
  item(
    'add-row-before',
    label,
    'insert-row-top',
    (e) => e.chain().focus().addRowBefore().run(),
    () => false,
    (e) => e.isActive('table')
  )

export const addRowAfter = (label: string): ToolbarItem =>
  item(
    'add-row-after',
    label,
    'insert-row-bottom',
    (e) => e.chain().focus().addRowAfter().run(),
    () => false,
    (e) => e.isActive('table')
  )

export const deleteRow = (label: string): ToolbarItem =>
  item(
    'delete-row',
    label,
    'delete-row',
    (e) => e.chain().focus().deleteRow().run(),
    () => false,
    (e) => e.isActive('table')
  )

export const addColumnBefore = (label: string): ToolbarItem =>
  item(
    'add-column-before',
    label,
    'insert-column-left',
    (e) => e.chain().focus().addColumnBefore().run(),
    () => false,
    (e) => e.isActive('table')
  )

export const addColumnAfter = (label: string): ToolbarItem =>
  item(
    'add-column-after',
    label,
    'insert-column-right',
    (e) => e.chain().focus().addColumnAfter().run(),
    () => false,
    (e) => e.isActive('table')
  )

export const deleteColumn = (label: string): ToolbarItem =>
  item(
    'delete-column',
    label,
    'delete-column',
    (e) => e.chain().focus().deleteColumn().run(),
    () => false,
    (e) => e.isActive('table')
  )
