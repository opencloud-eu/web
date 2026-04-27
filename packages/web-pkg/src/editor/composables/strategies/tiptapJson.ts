import { ContentTypeStrategy } from './types'
import { useGettext } from 'vue3-gettext'
import type { Editor } from '@tiptap/vue-3'
import type { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { EditorActionGroup, useEditorActions } from '../useEditorActions'

export const useStrategyTiptapJson = (): ContentTypeStrategy => {
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
      Underline,
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
      TaskItem.configure({ nested: true })
    ]
  }

  const {
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
    table,
    addRowBefore,
    addRowAfter,
    deleteRow,
    addColumnBefore,
    addColumnAfter,
    deleteColumn
  } = useEditorActions()
  const editorActionGroups = (): EditorActionGroup[] => {
    return [
      {
        id: 'text',
        title: $gettext('Text'),
        actions: [bold(), italic(), underline(), strikethrough()]
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
