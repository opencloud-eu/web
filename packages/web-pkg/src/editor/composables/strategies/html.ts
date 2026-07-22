import { ContentTypeStrategy } from './types'
import { useGettext } from 'vue3-gettext'
import type { Editor } from '@tiptap/vue-3'
import type { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
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

  const serialize = (editor: Editor): string => {
    return editor.getHTML()
  }

  const deserialize = (content: string): string => {
    return content
  }

  const extensions = (): Extension[] => {
    return [
      StarterKit.configure({ link: false }),
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
      Color,
      BackgroundColor,
      FontSize,
      LineHeight
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
    tableMenu,
    createTable,
    addRowBefore,
    addRowAfter,
    deleteRow,
    addColumnBefore,
    addColumnAfter,
    deleteColumn
  } = useEditorActions(editorState)

  const editorActionGroups = (): EditorActionGroup[] => {
    return [
      {
        id: 'history',
        title: $gettext('History'),
        actions: [undo(), redo()]
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
          backgroundColor(),
          textColor(),
          bold(),
          italic(),
          underline(),
          strikethrough()
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
          tableMenu(),
          menuEmoji(),
          createTable(),
          addColumnAfter(),
          addColumnBefore(),
          addRowAfter(),
          addRowBefore(),
          deleteColumn(),
          deleteRow(),
          horizontalRule()
        ]
      },
      {
        id: 'zoom',
        title: $gettext('Zoom'),
        actions: [zoomMenu()]
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
