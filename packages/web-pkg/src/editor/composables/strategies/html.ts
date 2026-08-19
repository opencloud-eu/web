import { ContentTypeStrategy, ExtensionsOptions } from './types'
import { useGettext } from 'vue3-gettext'
import type { Extension } from '@tiptap/core'
import { getHTMLFromFragment } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import Image from '@tiptap/extension-image'
import FindAndReplace from '@tiptap/extension-find-and-replace'
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import TextAlign from '@tiptap/extension-text-align'

import {
  TextStyle,
  FontFamily,
  Color,
  BackgroundColor,
  FontSize,
  LineHeight
} from '@tiptap/extension-text-style'
import { EditorActionGroup, useEditorActions } from '../useEditorActions'
import { TextEditorState } from '../../types'
import { createLinkExtension } from '../../extensions'
import { imageFileHandlerExtension } from './imageFileHandler'

export const useStrategyHtml = (editorState: TextEditorState): ContentTypeStrategy => {
  const { $gettext } = useGettext()

  const editorContentType = () => {
    return 'html'
  }

  const serialize = (doc: ProseMirrorNode): string => {
    return getHTMLFromFragment(doc.content, doc.type.schema)
  }

  const deserialize = (content: string): string => {
    return content
  }

  const extensions = (options?: ExtensionsOptions): Extension[] => {
    return [
      StarterKit.configure({ link: false, undoRedo: options?.yjs ? false : undefined }),
      createLinkExtension(),
      Image.configure({
        inline: false,
        allowBase64: true,
        resize: {
          enabled: true,
          minWidth: 50,
          minHeight: 50,
          alwaysPreserveAspectRatio: true
        }
      }),
      imageFileHandlerExtension(),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      FontFamily,
      TextStyle,
      Underline,
      Subscript,
      Superscript,
      Color,
      BackgroundColor,
      FontSize,
      LineHeight,
      FindAndReplace
    ]
  }

  const {
    undo,
    redo,
    zoomMenu,
    toggleSourceMode,
    fontSize,
    lineHeight,
    backgroundColor,
    textColor,
    bold,
    italic,
    underline,
    strikethrough,
    subscript,
    superscript,
    heading,
    paragraph,
    heading1,
    heading2,
    heading3,
    heading4,
    blockquote,
    codeBlock,
    alignLeft,
    alignCenter,
    alignRight,
    alignJustify,
    bulletList,
    orderedList,
    taskList,
    horizontalRule,
    link,
    image,
    imageUrl,
    imageUpload,
    menuEmoji,
    createTable,
    addRowBefore,
    addRowAfter,
    deleteRow,
    addColumnBefore,
    addColumnAfter,
    deleteColumn,
    toggleHeaderRow,
    deleteTable,
    menuSearchAndReplace
  } = useEditorActions(editorState)

  const editorActionGroups = (): EditorActionGroup[] => {
    return [
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
          fontSize(),
          lineHeight(),
          textColor(),
          backgroundColor(),
          bold(),
          italic(),
          underline(),
          strikethrough(),
          subscript(),
          superscript()
        ]
      },
      {
        id: 'text-align',
        title: $gettext('Text align'),
        actions: [alignLeft(), alignCenter(), alignRight(), alignJustify()]
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
          link(),
          image(),
          imageUrl(),
          imageUpload(),
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
      }
    ]
  }

  return {
    editorContentType,
    serialize,
    deserialize,
    extensions,
    editorActionGroups
  }
}
