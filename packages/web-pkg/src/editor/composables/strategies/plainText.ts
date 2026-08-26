import { Extension, getText, getTextSerializersFromSchema } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import StarterKit from '@tiptap/starter-kit'
import FindAndReplace from '@tiptap/extension-find-and-replace'
import { EditorActionGroup, useEditorActions } from '../useEditorActions'
import { ContentTypeStrategy, ExtensionsOptions } from './types'
import { TextEditorState } from '../../types'
import { useGettext } from 'vue3-gettext'

export const useStrategyPlainText = (editorState: TextEditorState): ContentTypeStrategy => {
  const { $gettext } = useGettext()

  const editorContentType = () => {
    return 'plainText'
  }

  const serialize = (doc: ProseMirrorNode): string => {
    return getText(doc, {
      blockSeparator: '\n',
      textSerializers: getTextSerializersFromSchema(doc.type.schema)
    })
  }

  const deserialize = (content: string): Record<string, unknown> => {
    if (!content) {
      return { type: 'doc', content: [{ type: 'paragraph' }] }
    }

    const lines = content.split('\n')
    return {
      type: 'doc',
      content: lines.map((line) => {
        if (!line) {
          return { type: 'paragraph' }
        }
        return { type: 'paragraph', content: [{ type: 'text', text: line }] }
      })
    }
  }

  const extensions = (options?: ExtensionsOptions): Extension[] => {
    return [
      StarterKit.configure({
        undoRedo: options?.yjs ? false : undefined,
        blockquote: false,
        bold: false,
        bulletList: false,
        code: false,
        codeBlock: false,
        gapcursor: false,
        heading: false,
        horizontalRule: false,
        italic: false,
        link: false,
        listItem: false,
        listKeymap: false,
        orderedList: false,
        strike: false
      }),
      FindAndReplace
    ]
  }

  const { undo, redo, zoomMenu, print, menuEmoji, menuSearchAndReplace } =
    useEditorActions(editorState)
  const editorActionGroups = (): EditorActionGroup[] => {
    return [
      {
        id: 'navigation',
        title: $gettext('Navigation'),
        actions: [undo(), redo(), zoomMenu()]
      },
      {
        id: 'emoji',
        title: $gettext('Emoji'),
        actions: [menuEmoji()]
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
  }

  return {
    editorContentType,
    serialize,
    deserialize,
    extensions,
    editorActionGroups
  }
}
