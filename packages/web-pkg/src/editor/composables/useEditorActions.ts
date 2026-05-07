import { unref } from 'vue'
import type { MaybeRef } from 'vue'
import type { Editor, Range } from '@tiptap/core'
import { useGettext } from 'vue3-gettext'
import { useModals } from '../../composables/piniaStores'
import { TextEditorState } from '../types'

export interface EditorAction {
  // Core identification
  id: string

  // Display properties
  title: string
  description?: string
  icon: string
  iconFillType?: 'fill' | 'line' | 'none'
  activeIcon?: (
    editor: Editor
  ) => { icon: string; iconFillType?: 'fill' | 'line' | 'none' } | undefined

  // Search & discovery (for slash commands)
  keywords?: string[]

  // Execution
  toolbarAction?: (editor: Editor, value?: string) => void
  slashCommandAction?: (ctx: { editor: Editor; range: Range }) => void

  // State management
  isActive?: (editor: Editor) => boolean
  isEnabled?: (editor: Editor) => boolean

  // Visibility control
  showInToolbar?: boolean
  showInSlashCommands?: boolean

  // Child actions (rendered as a dropdown menu in the toolbar)
  // For child actions to appear as slash commands, they must be registered
  // as separate action in the respective strategy as well
  childActions?: EditorAction[]
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
  const { dispatchModal } = useModals()

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
    showInSlashCommands: false,
    childActions: ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'].map((size) => ({
      id: `font-size-${size}`,
      title: size,
      icon: 'font-size-2',
      toolbarAction: (editor) => editor.chain().focus().setFontSize(size).run(),
      isActive: (editor) => editor.getAttributes('textStyle').fontSize === size
    }))
  })

  const textColor = (): EditorAction => ({
    id: 'text-color',
    title: $gettext('Text color'),
    icon: 'font-color',
    showInSlashCommands: false,
    childActions: [
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
    ].map(({ value, label }) => ({
      id: `text-color-${value.replace('#', '')}`,
      title: label,
      icon: 'font-color',
      toolbarAction: (editor) => editor.chain().focus().setColor(value).run(),
      isActive: (editor) => editor.getAttributes('textStyle').color === value
    }))
  })

  const backgroundColor = (): EditorAction => ({
    id: 'background-color',
    title: $gettext('Background color'),
    icon: 'mark-pen',
    iconFillType: 'line',
    showInSlashCommands: false,
    childActions: [
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
    ].map(({ value, label }) => ({
      id: `background-color-${value.replace('#', '')}`,
      title: label,
      icon: 'mark-pen',
      iconFillType: 'line' as const,
      toolbarAction: (editor) => editor.chain().focus().setBackgroundColor(value).run(),
      isActive: (editor) => editor.getAttributes('textStyle').backgroundColor === value
    }))
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

  // Heading actions
  const heading = (): EditorAction => ({
    id: 'heading',
    title: $gettext('Heading'),
    icon: 'heading',
    activeIcon: (editor) => {
      for (const level of [1, 2, 3, 4] as const) {
        if (editor.isActive('heading', { level })) {
          return { icon: `h-${level}` }
        }
      }
      return undefined
    },
    isActive: (editor) => editor.isActive('heading'),
    showInSlashCommands: false,
    childActions: [heading1(), heading2(), heading3(), heading4()]
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
    isActive: (editor) => editor.isActive('heading', { level: 1 }),
    showInToolbar: false
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
    isActive: (editor) => editor.isActive('heading', { level: 2 }),
    showInToolbar: false
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
    isActive: (editor) => editor.isActive('heading', { level: 3 }),
    showInToolbar: false
  })

  const heading4 = (): EditorAction => ({
    id: 'heading-4',
    title: $gettext('Heading 4'),
    description: $gettext('Extra small section heading'),
    icon: 'h-4',
    keywords: ['h4'],
    toolbarAction: (editor) => editor.chain().focus().toggleHeading({ level: 4 }).run(),
    slashCommandAction: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 4 }).run()
    },
    isActive: (editor) => editor.isActive('heading', { level: 4 }),
    showInToolbar: false
  })

  // Block actions
  const lineHeight = (): EditorAction => ({
    id: 'line-height',
    title: $gettext('Line height'),
    icon: 'line-height',
    showInSlashCommands: false,
    childActions: ['1', '1.15', '1.5', '1.75', '2', '2.5', '3'].map((value) => ({
      id: `line-height-${value}`,
      title: value,
      icon: 'line-height',
      toolbarAction: (editor) => editor.chain().focus().setLineHeight(value).run(),
      isActive: (editor) => editor.getAttributes('textStyle').lineHeight === value
    }))
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

  const dispatchImageModal = (editor: Editor) => {
    dispatchModal({
      title: $gettext('Insert image from URL'),
      hasInput: true,
      inputLabel: $gettext('Image URL'),
      confirmText: $gettext('Insert'),
      inputRequiredMark: true,
      onInput: (value: string, setError: (error: string) => void) => {
        const trimmed = value.trim()
        if (trimmed && !/^https?:\/\//i.test(trimmed)) {
          setError($gettext('URL must start with http:// or https://'))
          return
        }
        setError(null)
      },
      onConfirm: (value: string) => {
        const trimmed = value.trim()
        if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
          return
        }
        editor.chain().focus().setImage({ src: trimmed }).run()
      }
    })
  }

  const imageUrl = (): EditorAction => ({
    id: 'image-url',
    title: $gettext('Image from URL'),
    description: $gettext('Insert an image from a web URL'),
    icon: 'link-line',
    keywords: ['image', 'picture', 'url'],
    showInToolbar: false,
    toolbarAction: (editor) => dispatchImageModal(editor),
    slashCommandAction: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run()
      dispatchImageModal(editor)
    },
    isActive: () => false
  })

  const imageUpload = (): EditorAction => ({
    id: 'image-upload',
    title: $gettext('Image from file'),
    description: $gettext('Upload an image from your device'),
    icon: 'image-line',
    keywords: ['image', 'picture', 'upload', 'file'],
    showInToolbar: false,
    showInSlashCommands: true,
    toolbarAction: (editor) => insertImageFromFile(editor),
    slashCommandAction: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run()
      insertImageFromFile(editor)
    },
    isActive: () => false
  })

  const image = (): EditorAction => ({
    id: 'image',
    title: $gettext('Insert image'),
    icon: 'image-line',
    keywords: ['image', 'picture', 'upload', 'url'],
    showInSlashCommands: false,
    childActions: [imageUpload(), imageUrl()],
    isActive: () => false
  })

  const maxImageSizeBytes = 5 * 1024 * 1024 // 5 MB

  const insertImageFromFile = (editor: Editor) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (!file) {
        return
      }
      if (!file.type.startsWith('image/')) {
        return
      }
      if (file.size > maxImageSizeBytes) {
        return
      }
      const reader = new FileReader()
      reader.addEventListener('load', () => {
        const dataUrl = reader.result as string
        editor.chain().focus().setImage({ src: dataUrl }).run()
      })
      reader.readAsDataURL(file)
    })
    input.click()
  }

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

  // Table actions
  const createTable = (): EditorAction => ({
    id: 'table',
    title: $gettext('Create a table'),
    description: $gettext('3×3 table with header row'),
    icon: 'table-line',
    keywords: ['grid'],
    showInToolbar: false,
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

  const addRowBefore = (): EditorAction => ({
    id: 'add-row-before',
    title: $gettext('Add row above'),
    description: $gettext('Insert row before current'),
    icon: 'insert-row-top',
    keywords: ['table', 'row', 'above', 'before'],
    showInToolbar: false,
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
    showInToolbar: false,
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
    showInToolbar: false,
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
    showInToolbar: false,
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
    showInToolbar: false,
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
    showInToolbar: false,
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

  const tableMenu = (): EditorAction => ({
    id: 'table-menu',
    title: $gettext('Table'),
    icon: 'table-line',
    showInSlashCommands: false,
    childActions: [
      createTable(),
      addRowBefore(),
      addRowAfter(),
      deleteRow(),
      addColumnBefore(),
      addColumnAfter(),
      deleteColumn()
    ]
  })

  return {
    // History
    undo,
    redo,
    // View options
    toggleSourceMode,
    // Text formatting
    heading,
    heading1,
    heading2,
    heading3,
    heading4,
    fontSize,
    textColor,
    backgroundColor,
    bold,
    italic,
    underline,
    strikethrough,
    codeInline,
    // Blocks
    lineHeight,
    blockquote,
    codeBlock,
    // Lists
    bulletList,
    orderedList,
    taskList,
    // Insert
    link,
    image,
    imageUrl,
    imageUpload,
    horizontalRule,
    // Table
    tableMenu,
    createTable,
    addRowBefore,
    addRowAfter,
    deleteRow,
    addColumnBefore,
    addColumnAfter,
    deleteColumn
  }
}
