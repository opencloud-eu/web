import { EditorActionGroup, useEditorActions } from '../useEditorActions'
import { ContentTypeStrategy } from './types'
import type { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import Link from '@tiptap/extension-link'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { useGettext } from 'vue3-gettext'
import type { Editor } from '@tiptap/vue-3'
import { TextEditorState } from '../../types'

export const useStrategyMarkdown = (editorState: TextEditorState): ContentTypeStrategy => {
  const { $gettext } = useGettext()

  const editorContentType = () => {
    return 'markdown'
  }

  const serialize = (editor: Editor): string => {
    return (editor as any).getMarkdown()
  }

  const deserialize = (content: string): string => {
    return content
  }

  const extensions = (): Extension[] => {
    return [
      StarterKit.configure({ link: false }),
      Markdown,
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' }
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true })
    ]
  }

  const {
    undo,
    redo,
    toggleSourceMode,
    bold,
    italic,
    strikethrough,
    heading1,
    heading2,
    heading3,
    bulletList,
    orderedList,
    taskList,
    blockquote,
    codeBlock,
    horizontalRule,
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
        id: 'view-options',
        title: $gettext('View options'),
        actions: [toggleSourceMode()]
      },
      {
        id: 'text',
        title: $gettext('Text'),
        actions: [bold(), italic(), strikethrough()]
      },
      {
        id: 'basic-blocks',
        title: $gettext('Basic blocks'),
        actions: [heading1(), heading2(), heading3()]
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
