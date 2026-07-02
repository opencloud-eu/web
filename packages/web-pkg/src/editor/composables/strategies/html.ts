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
import TextAlign from '@tiptap/extension-text-align'

import {
  TextStyle,
  FontFamily,
  Color,
  BackgroundColor,
  FontSize,
  LineHeight
} from '@tiptap/extension-text-style'
import {
  useEditorActions,
  type EditorActionGroup,
  type UseEditorActionsOptions
} from '../useEditorActions'
import { TextEditorState } from '../../types'

export const useStrategyHtml = (
  editorState: TextEditorState,
  editorActionOptions: UseEditorActionsOptions = {}
): ContentTypeStrategy => {
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
    heading1,
    heading2,
    heading3,
    heading4,
    alignLeft,
    alignCenter,
    alignRight,
    alignJustify,
    bulletList,
    orderedList,
    taskList,
    blockquote,
    codeBlock,
    horizontalRule,
    link,
    tableMenu,
    createTable,
    addRowBefore,
    addRowAfter,
    deleteRow,
    addColumnBefore,
    addColumnAfter,
    deleteColumn
  } = useEditorActions(editorState, editorActionOptions)

  const toolbarLink = () => ({
    ...link(),
    showInToolbar: false
  })

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
          horizontalRule(),
          toolbarLink()
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
