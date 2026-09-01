import type { Extension, JSONContent } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import StarterKit from '@tiptap/starter-kit'
import Document from '@tiptap/extension-document'
import { Markdown, MarkdownManager } from '@tiptap/markdown'
import { Marked } from 'marked'
import type { marked as markedDefault } from 'marked'
import Image from '@tiptap/extension-image'
import FindAndReplace from '@tiptap/extension-find-and-replace'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { useGettext } from 'vue3-gettext'
import { EditorAction, EditorActionGroup, useEditorActions } from '../useEditorActions'
import { TextEditorState } from '../../types'
import {
  createCodeBlockLowlight,
  createLinkExtension,
  Frontmatter,
  imageFileHandlerExtension,
  registerFrontmatterTokenizer
} from '../../extensions'
import { ContentTypeStrategy, ExtensionsOptions } from './types'

export const useStrategyMarkdown = (editorState: TextEditorState): ContentTypeStrategy => {
  const { $gettext } = useGettext()

  // Every `MarkdownManager` appends its extensions' tokenizers to the marked
  // instance it is given and never removes them. Left to the default, that is a
  // process wide singleton which grows with every editor opened and keeps each
  // manager it ever saw alive. Holding our own instance bounds both to the
  // lifetime of this strategy.
  // Cast because tiptap types the option as the default export, which carries a
  // `getDefaults` helper a plain instance lacks. The manager never calls it: it
  // only touches `use`, `setOptions`, `Lexer`, `lexer` and `defaults`.
  const marked = new Marked() as unknown as typeof markedDefault
  registerFrontmatterTokenizer(marked)

  const editorContentType = () => {
    return 'markdown'
  }

  // `editor.getMarkdown()` is just `MarkdownManager.serialize(editor.getJSON())`.
  // Holding our own manager lets us render a document with no editor attached.
  // Built lazily and once: it only reads the extensions' markdown specs, which
  // never change for a given strategy.
  let markdownManager: MarkdownManager | null = null
  const serialize = (doc: ProseMirrorNode): string => {
    markdownManager ??= new MarkdownManager({ marked, extensions: extensions() })
    return markdownManager.serialize(doc.toJSON())
  }

  const deserialize = (content: string): string => {
    return content
  }

  const extensions = (options?: ExtensionsOptions): Extension[] => {
    const markdownImage = Image.extend({
      renderMarkdown: (node: JSONContent) => {
        const src = (node.attrs?.src as string | undefined) ?? ''
        const alt = (node.attrs?.alt as string | undefined) ?? ''
        const title = (node.attrs?.title as string | undefined) ?? ''
        const width = node.attrs?.width
        const height = node.attrs?.height

        if (width || height) {
          const sizeAttributes = [
            width ? `width="${width}"` : '',
            height ? `height="${height}"` : ''
          ]
            .filter(Boolean)
            .join(' ')
          const titleAttribute = title ? ` title="${title}"` : ''
          const altAttribute = alt ? ` alt="${alt}"` : ''
          return `<img src="${src}"${altAttribute}${titleAttribute} ${sizeAttributes} />`
        }

        return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`
      }
    }).configure({
      inline: false,
      allowBase64: true,
      resize: {
        enabled: true,
        minWidth: 50,
        minHeight: 50,
        alwaysPreserveAspectRatio: true
      }
    })

    return [
      StarterKit.configure({
        link: false,
        codeBlock: false,
        document: false,
        undoRedo: options?.yjs ? false : undefined
      }),
      // Frontmatter is metadata about the document, it only ever belongs at the
      // top. Spelled as an alternation rather than `frontmatter? block+` so that
      // a document holding nothing but metadata is valid too. `block+` has to
      // come first: ProseMirror fills an empty document from the leading
      // alternative, and that must be a paragraph rather than a metadata block.
      Document.extend({ content: 'block+ | (frontmatter block*)' }),
      Frontmatter,
      createCodeBlockLowlight(),
      Markdown.configure({ marked }),
      createLinkExtension(),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      markdownImage,
      imageFileHandlerExtension(),
      FindAndReplace
    ]
  }

  const {
    undo,
    redo,
    zoomMenu,
    print,
    toggleSourceMode,
    bold,
    italic,
    strikethrough,
    heading,
    paragraph,
    heading1,
    heading2,
    heading3,
    heading4,
    blockquote,
    codeBlock,
    bulletList,
    orderedList,
    taskList,
    horizontalRule,
    link,
    menuEmoji,
    frontmatter,
    image,
    menuSearchAndReplace,
    imageUrl,
    imageUpload,
    imageCloud,
    createTable,
    addRowBefore,
    addRowAfter,
    deleteRow,
    addColumnBefore,
    addColumnAfter,
    deleteColumn,
    toggleHeaderRow,
    deleteTable
  } = useEditorActions(editorState)
  /**
   * Actions that still make sense while the caret sits in the frontmatter block.
   * Everything else formats or inserts content, and the block holds raw metadata
   * text that none of it applies to.
   *
   * This is an allowlist on purpose: an action added later is restricted until
   * someone decides it belongs here.
   */
  const actionsAllowedInFrontmatter = new Set([
    'undo',
    'redo',
    'menu-zoom',
    'zoom-in',
    'zoom-out',
    'zoom-reset',
    'source-mode',
    'menu-search-and-replace',
    'print',
    'frontmatter',
    'menu-emoji'
  ])

  const restrictInFrontmatter = (action: EditorAction): EditorAction => {
    const childActions = action.childActions?.map(restrictInFrontmatter)

    if (actionsAllowedInFrontmatter.has(action.id)) {
      return childActions ? { ...action, childActions } : action
    }

    const { isEnabled } = action

    return {
      ...action,
      ...(childActions && { childActions }),
      isEnabled: (editor) => !editor.isActive('frontmatter') && (isEnabled?.(editor) ?? true)
    }
  }

  const editorActionGroups = (): EditorActionGroup[] => {
    const groups: EditorActionGroup[] = [
      {
        id: 'navigation',
        title: $gettext('Navigation'),
        actions: [undo(), redo(), zoomMenu()]
      },
      {
        id: 'view-options',
        title: $gettext('View options'),
        actions: [toggleSourceMode()]
      },
      {
        id: 'formatting',
        title: $gettext('Formatting'),
        actions: [
          heading(),
          paragraph(),
          heading1(),
          heading2(),
          heading3(),
          heading4(),
          blockquote(),
          codeBlock(),
          bold(),
          italic(),
          strikethrough()
        ]
      },
      {
        id: 'lists',
        title: $gettext('Lists'),
        actions: [bulletList(), orderedList(), taskList()]
      },
      {
        id: 'insert',
        title: $gettext('Insert'),
        actions: [
          frontmatter(),
          link(),
          image(),
          imageUrl(),
          imageUpload(),
          imageCloud(),
          createTable(),
          toggleHeaderRow(),
          addRowBefore(),
          addRowAfter(),
          deleteRow(),
          addColumnBefore(),
          addColumnAfter(),
          deleteColumn(),
          deleteTable(),
          menuEmoji(),
          horizontalRule()
        ]
      },
      {
        id: 'search',
        title: $gettext('Search'),
        actions: [menuSearchAndReplace()]
      },
      {
        id: 'export',
        title: $gettext('Export'),
        actions: [print()]
      }
    ]

    return groups.map((group) => ({
      ...group,
      actions: group.actions.map(restrictInFrontmatter)
    }))
  }

  return {
    editorContentType,
    serialize,
    deserialize,
    extensions,
    editorActionGroups
  }
}
