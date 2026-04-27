import { unref } from 'vue'
import type { MaybeRef } from 'vue'
import type { Editor, Range } from '@tiptap/core'
import { useGettext } from 'vue3-gettext'

export interface EditorAction {
  // Core identification
  id: string

  // Display properties
  title: string
  description?: string
  icon: string
  iconFillType?: 'fill' | 'line' | 'none'

  // Search & discovery (for slash commands)
  keywords?: string[]

  // Execution
  toolbarAction?: (editor: Editor) => void
  slashCommandAction?: (ctx: { editor: Editor; range: Range }) => void

  // State management
  isActive?: (editor: Editor) => boolean
  isEnabled?: (editor: Editor) => boolean

  // Visibility control
  showInToolbar?: boolean
  showInSlashCommands?: boolean
}

export interface EditorActionGroup {
  id: string
  title: string
  actions: EditorAction[]
}

export interface UseEditorActionsOptions {
  onRequestLinkUrl?: (editor: Editor, currentUrl?: string) => void
  onRequestImageUrl?: (editor: Editor) => void
}

export interface ContentTypeActions {
  toolbarGroups: EditorAction[][]
  slashCommandGroups: EditorActionGroup[]
}

export function useEditorActions(options: MaybeRef<UseEditorActionsOptions> = {}) {
  const { $gettext } = useGettext()

  // Text formatting actions
  const bold = (): EditorAction => ({
    id: 'bold',
    title: $gettext('Bold'),
    icon: 'bold',
    toolbarAction: (editor) => editor.chain().focus().toggleBold().run(),
    slashCommandAction: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBold().run(),
    isActive: (editor) => editor.isActive('bold')
  })

  const italic = (): EditorAction => ({
    id: 'italic',
    title: $gettext('Italic'),
    icon: 'italic',
    toolbarAction: (editor) => editor.chain().focus().toggleItalic().run(),
    slashCommandAction: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleItalic().run(),
    isActive: (editor) => editor.isActive('italic')
  })

  const underline = (): EditorAction => ({
    id: 'underline',
    title: $gettext('Underline'),
    icon: 'underline',
    toolbarAction: (editor) => editor.chain().focus().toggleUnderline().run(),
    slashCommandAction: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleUnderline().run(),
    isActive: (editor) => editor.isActive('underline')
  })

  const strikethrough = (): EditorAction => ({
    id: 'strikethrough',
    title: $gettext('Strikethrough'),
    icon: 'strikethrough',
    toolbarAction: (editor) => editor.chain().focus().toggleStrike().run(),
    slashCommandAction: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleStrike().run(),
    isActive: (editor) => editor.isActive('strike')
  })

  const codeInline = (): EditorAction => ({
    id: 'code-inline',
    title: $gettext('Inline code'),
    icon: 'code-line',
    toolbarAction: (editor) => editor.chain().focus().toggleCode().run(),
    slashCommandAction: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCode().run(),
    isActive: (editor) => editor.isActive('code')
  })

  // Block actions
  const paragraph = (): EditorAction => ({
    id: 'paragraph',
    title: $gettext('Paragraph'),
    description: $gettext('Plain text block'),
    icon: 'paragraph',
    keywords: ['text', 'body'],
    toolbarAction: (editor) => editor.chain().focus().setParagraph().run(),
    slashCommandAction: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('paragraph').run()
    },
    showInToolbar: false
  })

  const heading1 = (): EditorAction => ({
    id: 'heading-1',
    title: $gettext('Heading 1'),
    description: $gettext('Large section heading'),
    icon: 'h-1',
    keywords: ['h1', 'title'],
    toolbarAction: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    slashCommandAction: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
    },
    isActive: (editor) => editor.isActive('heading', { level: 1 })
  })

  const heading2 = (): EditorAction => ({
    id: 'heading-2',
    title: $gettext('Heading 2'),
    description: $gettext('Medium section heading'),
    icon: 'h-2',
    keywords: ['h2', 'subtitle'],
    toolbarAction: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    slashCommandAction: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
    },
    isActive: (editor) => editor.isActive('heading', { level: 2 })
  })

  const heading3 = (): EditorAction => ({
    id: 'heading-3',
    title: $gettext('Heading 3'),
    description: $gettext('Small section heading'),
    icon: 'h-3',
    keywords: ['h3'],
    toolbarAction: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    slashCommandAction: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run()
    },
    isActive: (editor) => editor.isActive('heading', { level: 3 })
  })

  const blockquote = (): EditorAction => ({
    id: 'blockquote',
    title: $gettext('Blockquote'),
    description: $gettext('Quote block'),
    icon: 'chat-quote-line',
    keywords: ['quote'],
    toolbarAction: (editor) => editor.chain().focus().toggleBlockquote().run(),
    slashCommandAction: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run()
    },
    isActive: (editor) => editor.isActive('blockquote')
  })

  const codeBlock = (): EditorAction => ({
    id: 'code-block',
    title: $gettext('Code block'),
    description: $gettext('Preformatted code block'),
    icon: 'code-box-line',
    keywords: ['code', 'pre'],
    toolbarAction: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    slashCommandAction: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
    },
    isActive: (editor) => editor.isActive('codeBlock')
  })

  const horizontalRule = (): EditorAction => ({
    id: 'horizontal-rule',
    title: $gettext('Horizontal rule'),
    description: $gettext('Divider line'),
    icon: 'separator',
    keywords: ['hr', 'divider'],
    toolbarAction: (editor) => editor.chain().focus().setHorizontalRule().run(),
    slashCommandAction: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run()
    },
    isActive: () => false
  })

  // List actions
  const bulletList = (): EditorAction => ({
    id: 'bullet-list',
    title: $gettext('Bullet list'),
    description: $gettext('Unordered list of items'),
    icon: 'list-unordered',
    keywords: ['ul', 'unordered'],
    toolbarAction: (editor) => editor.chain().focus().toggleBulletList().run(),
    slashCommandAction: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run()
    },
    isActive: (editor) => editor.isActive('bulletList')
  })

  const orderedList = (): EditorAction => ({
    id: 'ordered-list',
    title: $gettext('Ordered list'),
    description: $gettext('Numbered list of items'),
    icon: 'list-ordered-2',
    keywords: ['ol', 'numbered'],
    toolbarAction: (editor) => editor.chain().focus().toggleOrderedList().run(),
    slashCommandAction: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run()
    },
    isActive: (editor) => editor.isActive('orderedList')
  })

  const taskList = (): EditorAction => ({
    id: 'task-list',
    title: $gettext('Task list'),
    description: $gettext('List with checkable items'),
    icon: 'list-check-3',
    keywords: ['todo', 'checklist'],
    toolbarAction: (editor) => editor.chain().focus().toggleTaskList().run(),
    slashCommandAction: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run()
    },
    isActive: (editor) => editor.isActive('taskList')
  })

  // Insert actions
  const link = (): EditorAction => ({
    id: 'link',
    title: $gettext('Link'),
    icon: 'link',
    toolbarAction: (editor) => {
      const opts = unref(options)
      if (opts.onRequestLinkUrl) {
        const previousUrl = editor.getAttributes('link').href as string | undefined
        opts.onRequestLinkUrl(editor, previousUrl)
      }
    },
    isActive: (editor) => editor.isActive('link'),
    showInSlashCommands: false
  })

  const image = (): EditorAction => ({
    id: 'image',
    title: $gettext('Image'),
    icon: 'image-line',
    toolbarAction: (editor) => {
      const opts = unref(options)
      if (opts.onRequestImageUrl) {
        opts.onRequestImageUrl(editor)
      }
    },
    isActive: () => false,
    showInSlashCommands: false
  })

  const table = (): EditorAction => ({
    id: 'table',
    title: $gettext('Table'),
    description: $gettext('3×3 table with header row'),
    icon: 'table-line',
    keywords: ['grid'],
    toolbarAction: (editor) =>
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    slashCommandAction: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run()
    },
    isActive: () => false
  })

  // Table manipulation actions
  const addRowBefore = (): EditorAction => ({
    id: 'add-row-before',
    title: $gettext('Add row above'),
    description: $gettext('Insert row before current'),
    icon: 'insert-row-top',
    keywords: ['table', 'row', 'above', 'before'],
    toolbarAction: (editor) => editor.chain().focus().addRowBefore().run(),
    slashCommandAction: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).addRowBefore().run()
    },
    isActive: () => false,
    isEnabled: (editor) => editor.isActive('table')
  })

  const addRowAfter = (): EditorAction => ({
    id: 'add-row-after',
    title: $gettext('Add row below'),
    description: $gettext('Insert row after current'),
    icon: 'insert-row-bottom',
    keywords: ['table', 'row', 'below', 'after'],
    toolbarAction: (editor) => editor.chain().focus().addRowAfter().run(),
    slashCommandAction: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).addRowAfter().run()
    },
    isActive: () => false,
    isEnabled: (editor) => editor.isActive('table')
  })

  const deleteRow = (): EditorAction => ({
    id: 'delete-row',
    title: $gettext('Delete row'),
    description: $gettext('Remove current row'),
    icon: 'delete-row',
    keywords: ['table', 'row', 'remove'],
    toolbarAction: (editor) => editor.chain().focus().deleteRow().run(),
    slashCommandAction: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).deleteRow().run()
    },
    isActive: () => false,
    isEnabled: (editor) => editor.isActive('table')
  })

  const addColumnBefore = (): EditorAction => ({
    id: 'add-column-before',
    title: $gettext('Add column left'),
    description: $gettext('Insert column before current'),
    icon: 'insert-column-left',
    keywords: ['table', 'column', 'left', 'before'],
    toolbarAction: (editor) => editor.chain().focus().addColumnBefore().run(),
    slashCommandAction: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).addColumnBefore().run()
    },
    isActive: () => false,
    isEnabled: (editor) => editor.isActive('table')
  })

  const addColumnAfter = (): EditorAction => ({
    id: 'add-column-after',
    title: $gettext('Add column right'),
    description: $gettext('Insert column after current'),
    icon: 'insert-column-right',
    keywords: ['table', 'column', 'right', 'after'],
    toolbarAction: (editor) => editor.chain().focus().addColumnAfter().run(),
    slashCommandAction: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).addColumnAfter().run()
    },
    isActive: () => false,
    isEnabled: (editor) => editor.isActive('table')
  })

  const deleteColumn = (): EditorAction => ({
    id: 'delete-column',
    title: $gettext('Delete column'),
    description: $gettext('Remove current column'),
    icon: 'delete-column',
    keywords: ['table', 'column', 'remove'],
    toolbarAction: (editor) => editor.chain().focus().deleteColumn().run(),
    slashCommandAction: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).deleteColumn().run()
    },
    isActive: () => false,
    isEnabled: (editor) => editor.isActive('table')
  })

  return {
    // Text formatting
    bold,
    italic,
    underline,
    strikethrough,
    codeInline,
    // Blocks
    paragraph,
    heading1,
    heading2,
    heading3,
    blockquote,
    codeBlock,
    horizontalRule,
    // Lists
    bulletList,
    orderedList,
    taskList,
    // Insert
    link,
    image,
    table,
    // Table manipulation
    addRowBefore,
    addRowAfter,
    deleteRow,
    addColumnBefore,
    addColumnAfter,
    deleteColumn
  }
}
