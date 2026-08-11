import { ContentTypeStrategy, ExtensionsOptions } from './types'
import { useGettext } from 'vue3-gettext'
import type { Extension } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import FindAndReplace from '@tiptap/extension-find-and-replace'
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
import { createLinkExtension } from '../../extensions'
import { imageFileHandlerExtension } from './imageFileHandler'

export const useStrategyTiptapJson = (editorState: TextEditorState): ContentTypeStrategy => {
  const { $gettext } = useGettext()

  const editorContentType = () => {
    return 'json'
  }

  const serialize = (doc: ProseMirrorNode): string => {
    return JSON.stringify(doc.toJSON())
  }

  const deserialize = (content: string): string => {
    return JSON.parse(content)
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
      FontFamily,
      TextStyle,
      Underline,
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
    link,
    menuEmoji,
    image,
    menuSearchAndReplace,
    imageUrl,
    imageUpload,
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
  const editorActionGroups = (): EditorActionGroup[] => {
    return [
      {
        id: 'navigation',
        title: $gettext('Navigation'),
        actions: [undo(), redo(), zoomMenu()]
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
        actions: [lineHeight(), blockquote(), codeBlock()]
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
