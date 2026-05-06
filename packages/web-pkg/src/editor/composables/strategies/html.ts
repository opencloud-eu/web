import { ContentTypeStrategy } from './types'
import { useGettext } from 'vue3-gettext'
import type { Editor } from '@tiptap/vue-3'
import type { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
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
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' }
      }),
      Image.configure({ inline: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
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
    fontSize,
    lineHeight,
    backgroundColor,
    textColor,
    bold,
    italic,
    underline,
    strikethrough,
    heading,
    heading1,
    heading2,
    heading3,
    heading4,
    bulletList,
    orderedList,
    taskList,
    blockquote,
    codeBlock,
    horizontalRule,
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
        id: 'formatting',
        title: $gettext('Formatting'),
        actions: [
          heading(),
          heading1(),
          heading2(),
          heading3(),
          heading4(),
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
        id: 'lists',
        title: $gettext('Lists'),
        actions: [bulletList(), orderedList(), taskList()]
      },
      {
        id: 'blocks',
        title: $gettext('Blocks'),
        actions: [blockquote(), codeBlock()]
      },
      {
        id: 'insert',
        title: $gettext('Insert'),
        actions: [
          tableMenu(),
          createTable(),
          addColumnAfter(),
          addColumnBefore(),
          addRowAfter(),
          addRowBefore(),
          deleteColumn(),
          deleteRow(),
          horizontalRule()
        ]
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
