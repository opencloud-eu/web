import { computed, markRaw, ref, unref } from 'vue'
import type { Component } from 'vue'
import type { Editor, Range } from '@tiptap/core'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'
import type { Resource } from '@opencloud-eu/web-client'
import { OcEmojiPicker } from '@opencloud-eu/design-system/components'
import { useModals, useThemeStore } from '../../composables'
import { useClientService, useGetMatchingSpace, useFolderLink } from '../../composables'
import FilePickerModal from '../../components/Modals/FilePickerModal.vue'
import { arrayBufferToDataUrl, withoutExtension } from '../../helpers'
import { TextEditorState } from '../types'
import { requestLinkPanel, printEditorContent } from '../helpers'
import TextEditorSearchAndReplacePanel from '../components/TextEditorSearchAndReplacePanel.vue'
import TextEditorTableSizeSelector from '../components/TextEditorTableSizeSelector.vue'

export interface EditorAction {
  // Core identification
  id: string

  // Display properties
  title: string
  description?: string
  icon?: string
  iconFillType?: 'fill' | 'line' | 'none'
  swatchColor?: string
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
  menuCloseOnClick?: boolean
  menuComponent?: Component
  menuComponentAttrs?: (editor: Editor, closeMenu: () => void) => Record<string, unknown>

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

export function useEditorActions(state: TextEditorState) {
  const { $gettext } = useGettext()
  const { dispatchModal } = useModals()
  const themeStore = useThemeStore()
  const { currentTheme } = storeToRefs(themeStore)
  const clientService = useClientService()
  const { getMatchingSpace } = useGetMatchingSpace()
  const { getParentFolderLink } = useFolderLink()
  const currentResource = computed<Resource | null>(() => {
    return unref(state.currentResource) ?? null
  })

  //Search
  const searchSearchTerm = ref('')
  const searchReplaceTerm = ref('')
  const searchCaseSensitive = ref(false)
  const searchWholeWord = ref(false)

  const zoomStep = 10
  const zoomMin = 50
  const zoomMax = 200
  const clampZoom = (value: number) => Math.min(zoomMax, Math.max(zoomMin, value))

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

  const zoomIn = (): EditorAction => ({
    id: 'zoom-in',
    title: $gettext('Zoom in'),
    icon: 'zoom-in',
    iconFillType: 'line',
    toolbarAction: () => {
      state.editorZoom.value = clampZoom(state.editorZoom.value + zoomStep)
    },
    isEnabled: () => state.editorZoom.value < zoomMax,
    showInSlashCommands: false
  })

  const zoomOut = (): EditorAction => ({
    id: 'zoom-out',
    title: $gettext('Zoom out'),
    icon: 'zoom-out',
    iconFillType: 'line',
    toolbarAction: () => {
      state.editorZoom.value = clampZoom(state.editorZoom.value - zoomStep)
    },
    isEnabled: () => state.editorZoom.value > zoomMin,
    showInSlashCommands: false
  })

  const zoomReset = (): EditorAction => ({
    id: 'zoom-reset',
    title: $gettext('Reset zoom'),
    icon: 'reset-left',
    iconFillType: 'line',
    toolbarAction: () => {
      state.editorZoom.value = 100
    },
    isEnabled: () => state.editorZoom.value !== 100,
    showInSlashCommands: false
  })

  const zoomMenu = (): EditorAction => ({
    id: 'menu-zoom',
    title: `${$gettext('Zoom')} (${state.editorZoom.value}%)`,
    icon: 'zoom-in',
    iconFillType: 'line',
    showInSlashCommands: false,
    menuCloseOnClick: false,
    childActions: [zoomOut(), zoomIn(), zoomReset()]
  })

  const print = (): EditorAction => ({
    id: 'print',
    title: $gettext('Print'),
    icon: 'printer',
    iconFillType: 'line',
    toolbarAction: (editor) => {
      const fileName = unref(currentResource)?.name
      if (!fileName) {
        return
      }
      const extension = unref(currentResource)?.extension
      const title = extension ? withoutExtension(fileName, extension) : fileName
      printEditorContent(editor, title)
    },
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

  const alignLeft = (): EditorAction => ({
    id: 'align-left',
    title: $gettext('Align left'),
    icon: 'align-left',
    toolbarAction: (editor) => editor.chain().focus().setTextAlign('left').run(),
    slashCommandAction: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setTextAlign('left').run(),
    isActive: (editor) => editor.isActive({ textAlign: 'left' })
  })

  const alignCenter = (): EditorAction => ({
    id: 'align-center',
    title: $gettext('Align center'),
    icon: 'align-center',
    toolbarAction: (editor) => editor.chain().focus().setTextAlign('center').run(),
    slashCommandAction: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setTextAlign('center').run(),
    isActive: (editor) => editor.isActive({ textAlign: 'center' })
  })

  const alignRight = (): EditorAction => ({
    id: 'align-right',
    title: $gettext('Align right'),
    icon: 'align-right',
    toolbarAction: (editor) => editor.chain().focus().setTextAlign('right').run(),
    slashCommandAction: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setTextAlign('right').run(),
    isActive: (editor) => editor.isActive({ textAlign: 'right' })
  })

  const alignJustify = (): EditorAction => ({
    id: 'align-justify',
    title: $gettext('Align justify'),
    icon: 'align-justify',
    toolbarAction: (editor) => editor.chain().focus().setTextAlign('justify').run(),
    slashCommandAction: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setTextAlign('justify').run(),
    isActive: (editor) => editor.isActive({ textAlign: 'justify' })
  })

  const textAlign = (): EditorAction => ({
    id: 'text-align',
    title: $gettext('Text align'),
    icon: 'align-left',
    showInSlashCommands: false,
    childActions: [alignLeft(), alignCenter(), alignRight(), alignJustify()],
    activeIcon: (editor) => {
      const action = [alignJustify(), alignRight(), alignCenter(), alignLeft()].find((candidate) =>
        candidate.isActive?.(editor)
      )
      if (!action?.icon) {
        return undefined
      }
      return { icon: action.icon }
    }
  })

  const textColor = (): EditorAction => ({
    id: 'text-color',
    title: $gettext('Text color'),
    icon: 'font-color',
    isActive: (editor) => !!editor.getAttributes('textStyle').color,
    showInSlashCommands: false,
    childActions: [
      {
        id: 'text-color-default',
        title: $gettext('Default'),
        swatchColor: 'transparent',
        toolbarAction: (editor: Editor) => editor.chain().focus().unsetColor().run(),
        isActive: (editor: Editor) => !editor.getAttributes('textStyle').color
      },
      ...[
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
        swatchColor: value,
        toolbarAction: (editor: Editor) => editor.chain().focus().setColor(value).run(),
        isActive: (editor: Editor) => editor.getAttributes('textStyle').color === value
      }))
    ]
  })

  const backgroundColor = (): EditorAction => ({
    id: 'background-color',
    title: $gettext('Background color'),
    icon: 'mark-pen',
    iconFillType: 'line',
    isActive: (editor) => {
      const backgroundColor = editor.getAttributes('textStyle').backgroundColor
      return !!backgroundColor
    },
    showInSlashCommands: false,
    childActions: [
      {
        id: 'background-color-transparent',
        title: $gettext('None'),
        swatchColor: 'transparent',
        toolbarAction: (editor: Editor) => editor.chain().focus().unsetBackgroundColor().run(),
        isActive: (editor: Editor) => {
          const backgroundColor = editor.getAttributes('textStyle').backgroundColor
          return !backgroundColor
        }
      },
      ...[
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
        swatchColor: value,
        toolbarAction: (editor: Editor) => editor.chain().focus().setBackgroundColor(value).run(),
        isActive: (editor: Editor) => editor.getAttributes('textStyle').backgroundColor === value
      }))
    ]
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

  const subscript = (): EditorAction => ({
    id: 'subscript',
    title: $gettext('Subscript'),
    icon: 'subscript',
    toolbarAction: (editor) => editor.chain().focus().toggleSubscript().run(),
    slashCommandAction: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleSubscript().run(),
    isActive: (editor) => editor.isActive('subscript')
  })

  const superscript = (): EditorAction => ({
    id: 'superscript',
    title: $gettext('Superscript'),
    icon: 'superscript',
    toolbarAction: (editor) => editor.chain().focus().toggleSuperscript().run(),
    slashCommandAction: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleSuperscript().run(),
    isActive: (editor) => editor.isActive('superscript')
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
    id: 'turn-into',
    title: $gettext('Turn into'),
    icon: 'text',
    activeIcon: (editor) => {
      for (const action of [
        heading1(),
        heading2(),
        heading3(),
        heading4(),
        blockquote(),
        codeBlock()
      ]) {
        if (action.isActive?.(editor)) {
          return { icon: action.icon }
        }
      }

      return undefined
    },
    isActive: (editor) =>
      editor.isActive('heading') || editor.isActive('blockquote') || editor.isActive('codeBlock'),
    showInSlashCommands: false,
    childActions: [
      paragraph(),
      heading1(),
      heading2(),
      heading3(),
      heading4(),
      blockquote(),
      codeBlock()
    ]
  })

  const paragraph = (): EditorAction => ({
    id: 'paragraph',
    title: $gettext('Paragraph'),
    description: $gettext('Text paragraph'),
    icon: 'text',
    keywords: ['paragraph', 'text'],
    toolbarAction: (editor) => editor.chain().focus().setParagraph().run(),
    slashCommandAction: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('paragraph').run()
    },
    isActive: (editor) => {
      const { $from } = editor.state.selection
      return $from.parent.type.name === 'paragraph' && $from.depth === 1
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
    isActive: (editor) => editor.isActive('blockquote'),
    showInToolbar: false
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
    isActive: (editor) => editor.isActive('codeBlock'),
    showInToolbar: false
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
    description: $gettext('Link to a website'),
    icon: 'link',
    keywords: ['link', 'url', 'website', 'hyperlink'],
    toolbarAction: (editor) => requestLinkPanel(editor, state),
    slashCommandAction: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run()
      requestLinkPanel(editor, state, {
        range: { from: range.from, to: range.from },
        linkRange: null
      })
    },
    isActive: (editor) => editor.isActive('link')
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

  const insertImageFromCloudResource = async (editor: Editor, resource: Resource) => {
    const space = getMatchingSpace(resource)
    const response = await clientService.webdav.getFileContents(
      space,
      { path: resource.path },
      { responseType: 'arraybuffer' }
    )
    const body = response?.body as ArrayBuffer | undefined
    if (!body) {
      return
    }
    const mimeType = resource.mimeType || 'application/octet-stream'
    const dataUrl = await arrayBufferToDataUrl(body, mimeType)
    editor.chain().focus().setImage({ src: dataUrl }).run()
  }

  const openCloudImagePicker = (editor: Editor) => {
    const resource = unref(currentResource)
    if (!resource) {
      return
    }

    dispatchModal({
      elementClass: 'file-picker-modal',
      title: $gettext('Insert image from cloud'),
      customComponent: markRaw(FilePickerModal),
      hideActions: true,
      customComponentAttrs: () => ({
        allowedFileTypes: ['image/png', 'image/gif', 'image/jpeg', 'image/svg'],
        parentFolderLink: getParentFolderLink(resource),
        callbackFn: async ({ resource }: { resource: Resource }) => {
          if (!resource.mimeType?.startsWith('image/')) {
            return
          }
          await insertImageFromCloudResource(editor, resource)
        }
      }),
      focusTrapInitial: false
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

  const imageCloud = (): EditorAction => ({
    id: 'image-cloud',
    title: $gettext('Insert from cloud'),
    description: $gettext('Insert an image from your cloud files'),
    icon: 'cloud-line',
    keywords: ['image', 'picture', 'cloud'],
    showInSlashCommands: true,
    showInToolbar: false,
    toolbarAction: (editor) => openCloudImagePicker(editor),
    slashCommandAction: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run()
      openCloudImagePicker(editor)
    },
    isActive: () => false
  })

  const image = (): EditorAction => ({
    id: 'image',
    title: $gettext('Insert image'),
    icon: 'image-line',
    keywords: ['image', 'picture', 'upload', 'url', 'cloud'],
    showInSlashCommands: false,
    childActions: [imageUpload(), imageUrl(), imageCloud()],
    isActive: () => false
  })

  const menuEmoji = (): EditorAction => ({
    id: 'menu-emoji',
    title: $gettext('Insert emoji'),
    description: $gettext('Insert an emoji'),
    icon: 'emoji-sticker',
    iconFillType: 'line',
    keywords: ['emoji', 'smiley', 'emoticon'],
    showInSlashCommands: false,
    menuCloseOnClick: false,
    menuComponent: markRaw(OcEmojiPicker),
    menuComponentAttrs: (editor, closeMenu) => ({
      theme: unref(currentTheme)?.isDark ? 'dark' : 'light',
      onEmojiSelect: (selectedEmoji: string) => {
        editor.chain().focus().insertContent(selectedEmoji).run()
        closeMenu()
      }
    }),
    isActive: () => false
  })

  const menuSearchAndReplace = (): EditorAction => ({
    id: 'menu-search-and-replace',
    title: $gettext('Search and replace'),
    icon: 'seo',
    iconFillType: 'line',
    showInSlashCommands: false,
    menuCloseOnClick: false,
    menuComponent: markRaw(TextEditorSearchAndReplacePanel),
    menuComponentAttrs: (editor, closeMenu) => ({
      editor,
      closeMenu,
      searchSearchTerm: searchSearchTerm.value,
      'onUpdate:searchSearchTerm': (val: string) => (searchSearchTerm.value = val),
      searchReplaceTerm: searchReplaceTerm.value,
      'onUpdate:searchReplaceTerm': (val: string) => (searchReplaceTerm.value = val),
      searchCaseSensitive: searchCaseSensitive.value,
      'onUpdate:searchCaseSensitive': (val: boolean) => (searchCaseSensitive.value = val),
      searchWholeWord: searchWholeWord.value,
      'onUpdate:searchWholeWord': (val: boolean) => (searchWholeWord.value = val)
    })
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

  // Frontmatter actions
  const hasFrontmatter = (editor: Editor) => {
    return editor.state.doc.firstChild?.type.name === 'frontmatter'
  }

  const toggleFrontmatter = (editor: Editor, range?: Range) => {
    // Drop the slash query first, so it does not linger in the document when the
    // confirmation below is cancelled.
    if (range) {
      editor.chain().focus().deleteRange(range).run()
    }

    if (!hasFrontmatter(editor)) {
      editor.chain().focus().setFrontmatter().run()
      return
    }

    // Only one block can exist, so there is nothing to add. Take the user to it
    // instead, landing where another key would go.
    if (!editor.isActive('frontmatter')) {
      const endOfMetadata = editor.state.doc.firstChild!.nodeSize - 1
      editor.chain().focus().setTextSelection(endOfMetadata).run()
      return
    }

    // Removing the block throws away everything the metadata holds, so never do
    // it on a single click.
    dispatchModal({
      title: $gettext('Delete frontmatter'),
      message: $gettext(
        'The frontmatter block and all metadata in it will be removed from the document.'
      ),
      confirmText: $gettext('Delete'),
      onConfirm: () => {
        editor.chain().focus().unsetFrontmatter().run()
      }
    })
  }

  const frontmatter = (): EditorAction => ({
    id: 'frontmatter',
    title: $gettext('Frontmatter'),
    description: $gettext('Document metadata'),
    icon: 'file-list-2',
    iconFillType: 'line',
    keywords: ['frontmatter', 'metadata', 'yaml'],
    toolbarAction: (editor) => toggleFrontmatter(editor),
    slashCommandAction: ({ editor, range }) => toggleFrontmatter(editor, range),
    isActive: (editor) => editor.isActive('frontmatter')
  })

  // Table actions
  const createTable = (): EditorAction => ({
    id: 'table',
    title: $gettext('Create a table'),
    description: $gettext('Insert a table'),
    icon: 'table-line',
    keywords: ['grid'],
    childActions: [
      {
        id: 'table-default',
        title: $gettext('Small table (3×3)'),
        description: $gettext('3×3 table with header row'),
        icon: 'table-line',
        toolbarAction: (editor) =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
        isActive: () => false
      },
      {
        id: 'table-custom',
        title: $gettext('Choose rows & columns'),
        description: $gettext('Select custom table size'),
        icon: 'grid',
        iconFillType: 'line',
        menuComponent: markRaw(TextEditorTableSizeSelector),
        menuCloseOnClick: false,
        menuComponentAttrs: (editor, closeMenu) => ({
          editor,
          closeMenu
        }),
        isActive: () => false
      }
    ],
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

  const toggleHeaderRow = (): EditorAction => ({
    id: 'toggle-header-row',
    title: $gettext('Toggle header row'),
    description: $gettext('Toggle header row'),
    icon: 'layout-row-fill',
    keywords: ['table', 'header', 'row'],
    showInToolbar: false,
    toolbarAction: (editor) => editor.chain().focus().toggleHeaderRow().run(),
    slashCommandAction: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleHeaderRow().run()
    },
    isActive: () => false,
    isEnabled: (editor) => editor.isActive('table')
  })

  const deleteTable = (): EditorAction => ({
    id: 'delete-table',
    title: $gettext('Delete table'),
    description: $gettext('Remove current table'),
    icon: 'delete-bin-2-line',
    keywords: ['table', 'remove', 'delete'],
    showInToolbar: false,
    toolbarAction: (editor) => editor.chain().focus().deleteTable().run(),
    slashCommandAction: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).deleteTable().run()
    },
    isActive: () => false,
    isEnabled: (editor) => editor.isActive('table')
  })

  return {
    // History
    undo,
    redo,
    // View options
    zoomIn,
    zoomOut,
    zoomReset,
    zoomMenu,
    print,
    toggleSourceMode,
    // Text formatting
    heading,
    paragraph,
    heading1,
    heading2,
    heading3,
    heading4,
    fontSize,
    textColor,
    textAlign,
    alignLeft,
    alignCenter,
    alignRight,
    alignJustify,
    backgroundColor,
    bold,
    italic,
    underline,
    strikethrough,
    subscript,
    superscript,
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
    menuEmoji,
    menuSearchAndReplace,
    imageUrl,
    imageUpload,
    imageCloud,
    horizontalRule,
    frontmatter,
    // Table
    createTable,
    addRowBefore,
    addRowAfter,
    deleteRow,
    addColumnBefore,
    addColumnAfter,
    deleteColumn,
    toggleHeaderRow,
    deleteTable
  }
}
