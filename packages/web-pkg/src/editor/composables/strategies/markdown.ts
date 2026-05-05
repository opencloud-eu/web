import { EditorActionGroup, useEditorActions } from '../useEditorActions'
import { ContentTypeStrategy } from './types'
import type { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import Image from '@tiptap/extension-image'
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
    return editor.getMarkdown()
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
      TaskItem.configure({ nested: true }),
      Image.configure({ inline: false })
    ]
  }

  const {
    undo,
    redo,
    toggleSourceMode,
    bold,
    italic,
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
    image,
    imageUrl,
    imageUpload,
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
          heading1(),
          heading2(),
          heading3(),
          heading4(),
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
        id: 'blocks',
        title: $gettext('Blocks'),
        actions: [blockquote(), codeBlock()]
      },
      {
        id: 'insert',
        title: $gettext('Insert'),
        actions: [
          image(),
          imageUrl(),
          imageUpload(),
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
