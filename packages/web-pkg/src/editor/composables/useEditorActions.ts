import { unref } from 'vue'
import type { MaybeRef } from 'vue'
import type { Editor, Range } from '@tiptap/core'
import { useGettext } from 'vue3-gettext'
import { TextEditorState } from '../types'

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
  toolbarAction?: (editor: Editor, value?: string) => void
  slashCommandAction?: (ctx: { editor: Editor; range: Range }) => void

  // State management
  currentValue?: (editor: Editor) => string | undefined
  isActive?: (editor: Editor) => boolean
  isEnabled?: (editor: Editor) => boolean

  // Visibility control
  showInToolbar?: boolean
  showInSlashCommands?: boolean

  // Dropdown configuration
  isDropdown?: boolean
  dropdownOptions?: Array<{ value: string; label: string }>
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

export function useEditorActions(
  state: TextEditorState,
  options: MaybeRef<UseEditorActionsOptions> = {}
) {
  const { $gettext } = useGettext()

  // History actions
  const undo = (): EditorAction => ({
    id: 'undo',
    title: $gettext('Undo'),
    icon: 'arrow-go-back',
    iconFillType: 'line',
    toolbarAction: (editor) => editor.chain().focus().undo().run(),
    isEnabled: (editor) => editor.can().undo(),
    showInSlashCommands: false
  })

  const redo = (): EditorAction => ({
    id: 'redo',
    title: $gettext('Redo'),
    icon: 'arrow-go-forward',
    iconFillType: 'line',
    toolbarAction: (editor) => editor.chain().focus().redo().run(),
    isEnabled: (editor) => editor.can().redo(),
    showInSlashCommands: false
  })

  // View options
  const toggleSourceMode = (): EditorAction => ({
    id: 'source-mode',
    title: $gettext('Show source'),
    icon: 'code-s-slash',
    iconFillType: 'line',
    toolbarAction: () => (state.sourceMode.value = !state.sourceMode.value),
    isActive: () => state.sourceMode.value,
    showInSlashCommands: false
  })

  // Text formatting actions
  const fontSize = (): EditorAction => ({
    id: 'font-size',
    title: $gettext('Font size'),
    icon: 'font-size-2',
    isDropdown: true,
    dropdownOptions: [
      { value: '12px', label: '12px' },
      { value: '14px', label: '14px' },
      { value: '16px', label: '16px' },
      { value: '18px', label: '18px' },
      { value: '20px', label: '20px' },
      { value: '24px', label: '24px' },
      { value: '28px', label: '28px' },
      { value: '32px', label: '32px' }
    ],
    currentValue: (editor) => editor.getAttributes('textStyle').fontSize as string | undefined,
    toolbarAction: (editor, value) => editor.chain().focus().setFontSize(value).run(),
    showInSlashCommands: false
  })

  const fontFamily = (): EditorAction => ({
    id: 'font-family',
    title: $gettext('Font family'),
    icon: 'font-family',
    isDropdown: true,
    dropdownOptions: [
      { value: 'Arial', label: $gettext('Arial') },
      { value: 'Courier New', label: $gettext('Courier New') },
      { value: 'Georgia', label: $gettext('Georgia') },
      { value: 'Times New Roman', label: $gettext('Times New Roman') },
      { value: 'Trebuchet MS', label: $gettext('Trebuchet MS') },
      { value: 'Verdana', label: $gettext('Verdana') }
    ],
    currentValue: (editor) => editor.getAttributes('textStyle').fontFamily as string | undefined,
    toolbarAction: (editor, value) => editor.chain().focus().setFontFamily(value).run(),
    showInSlashCommands: false
  })

  const lineHeight = (): EditorAction => ({
    id: 'line-height',
    title: $gettext('Line height'),
    icon: 'line-height',
    isDropdown: true,
    dropdownOptions: [
      { value: '1', label: '1' },
      { value: '1.15', label: '1.15' },
      { value: '1.5', label: '1.5' },
      { value: '1.75', label: '1.75' },
      { value: '2', label: '2' },
      { value: '2.5', label: '2.5' },
      { value: '3', label: '3' }
    ],
    currentValue: (editor) => editor.getAttributes('textStyle').lineHeight as string | undefined,
    toolbarAction: (editor, value) => editor.chain().focus().setLineHeight(value).run(),
    showInSlashCommands: false
  })

  const textColor = (): EditorAction => ({
    id: 'text-color',
    title: $gettext('Text color'),
    icon: 'font-color',
    isDropdown: true,
    dropdownOptions: [
      { value: '#000000', label: $gettext('Black') },
      { value: '#e60000', label: $gettext('Red') },
      { value: '#ff9900', label: $gettext('Orange') },
      { value: '#ffff00', label: $gettext('Yellow') },
      { value: '#008a00', label: $gettext('Green') },
      { value: '#0066cc', label: $gettext('Blue') },
      { value: '#9933ff', label: $gettext('Purple') },
      { value: '#ffffff', label: $gettext('White') },
      { value: '#facccc', label: $gettext('Light red') },
      { value: '#ffebcc', label: $gettext('Light orange') },
      { value: '#ffffcc', label: $gettext('Light yellow') },
      { value: '#cce8cc', label: $gettext('Light green') },
      { value: '#cce0f5', label: $gettext('Light blue') },
      { value: '#ebd6ff', label: $gettext('Light purple') }
    ],
    currentValue: (editor) => editor.getAttributes('textStyle').color as string | undefined,
    toolbarAction: (editor, value) => editor.chain().focus().setColor(value).run(),
    showInSlashCommands: false
  })

  const backgroundColor = (): EditorAction => ({
    id: 'background-color',
    title: $gettext('Background color'),
    icon: 'mark-pen',
    iconFillType: 'line',
    isDropdown: true,
    dropdownOptions: [
      { value: 'transparent', label: $gettext('None') },
      { value: '#facccc', label: $gettext('Light red') },
      { value: '#ffebcc', label: $gettext('Light orange') },
      { value: '#ffffcc', label: $gettext('Light yellow') },
      { value: '#cce8cc', label: $gettext('Light green') },
      { value: '#cce0f5', label: $gettext('Light blue') },
      { value: '#ebd6ff', label: $gettext('Light purple') },
      { value: '#e60000', label: $gettext('Red') },
      { value: '#ff9900', label: $gettext('Orange') },
      { value: '#ffff00', label: $gettext('Yellow') },
      { value: '#008a00', label: $gettext('Green') },
      { value: '#0066cc', label: $gettext('Blue') },
      { value: '#9933ff', label: $gettext('Purple') },
      { value: '#000000', label: $gettext('Black') }
    ],
    currentValue: (editor) =>
      editor.getAttributes('textStyle').backgroundColor as string | undefined,
    toolbarAction: (editor, value) => editor.chain().focus().setBackgroundColor(value).run(),
    showInSlashCommands: false
  })

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
    toolbarAction: (editor) => {
      const deleted = editor.chain().focus().deleteRow().run()
      if (!deleted && editor.isActive('table')) {
        editor.chain().focus().deleteTable().run()
      }
    },
    slashCommandAction: ({ editor, range }) => {
      const deleted = editor.chain().focus().deleteRange(range).deleteRow().run()
      if (!deleted && editor.isActive('table')) {
        editor.chain().focus().deleteTable().run()
      }
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
    toolbarAction: (editor) => {
      const deleted = editor.chain().focus().deleteColumn().run()
      if (!deleted && editor.isActive('table')) {
        editor.chain().focus().deleteTable().run()
      }
    },
    slashCommandAction: ({ editor, range }) => {
      const deleted = editor.chain().focus().deleteRange(range).deleteColumn().run()
      if (!deleted && editor.isActive('table')) {
        editor.chain().focus().deleteTable().run()
      }
    },
    isActive: () => false,
    isEnabled: (editor) => editor.isActive('table')
  })

  return {
    // History
    undo,
    redo,
    // View options
    toggleSourceMode,
    // Text formatting
    fontSize,
    fontFamily,
    lineHeight,
    textColor,
    backgroundColor,
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
