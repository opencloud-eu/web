import { ContentTypeStrategy } from './types'
import { useGettext } from 'vue3-gettext'
import type { Editor } from '@tiptap/vue-3'
import type { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { EditorActionGroup, useEditorActions } from '../useEditorActions'
import {
  BackgroundColor,
  Color,
  FontFamily,
  FontSize,
  LineHeight,
  TextStyle
} from '@tiptap/extension-text-style'
import { TextEditorState } from '../../types'

export const useStrategyTiptapJson = (editorState: TextEditorState): ContentTypeStrategy => {
  const { $gettext } = useGettext()

  const editorContentType = () => {
    return 'json'
  }

  const serialize = (editor: Editor): string => {
    return JSON.stringify(editor.getJSON())
  }

  const deserialize = (content: string): string => {
    return JSON.parse(content)
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
    fontFamily,
    fontSize,
    lineHeight,
    backgroundColor,
    textColor,
    bold,
    italic,
    underline,
    strikethrough,
    paragraph,
    heading1,
    heading2,
    heading3,
    bulletList,
    orderedList,
    taskList,
    blockquote,
    codeBlock,
    horizontalRule,
    imageUrl,
    imageUpload,
    table,
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
        id: 'text',
        title: $gettext('Text'),
        actions: [
          fontFamily(),
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
        id: 'basic-blocks',
        title: $gettext('Basic blocks'),
        actions: [paragraph(), heading1(), heading2(), heading3()]
      },
      {
        id: 'lists',
        title: $gettext('Lists'),
        actions: [bulletList(), orderedList(), taskList()]
      },
      {
        id: 'advanced',
        title: $gettext('Advanced'),
        actions: [blockquote(), codeBlock(), horizontalRule(), table()]
      },
      {
        id: 'image',
        title: $gettext('Image'),
        actions: [imageUrl(), imageUpload()]
      },
      {
        id: 'table-editing',
        title: $gettext('Table editing'),
        actions: [
          addRowBefore(),
          addRowAfter(),
          deleteRow(),
          addColumnBefore(),
          addColumnAfter(),
          deleteColumn()
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
