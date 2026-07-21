import { Editor } from '@tiptap/vue-3'
import { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { EditorActionGroup, useEditorActions } from '../useEditorActions'
import { ContentTypeStrategy } from './types'
import { TextEditorState } from '../../types'
import { useGettext } from 'vue3-gettext'

export const useStrategyPlainText = (editorState: TextEditorState): ContentTypeStrategy => {
  const { $gettext } = useGettext()

  const editorContentType = () => {
    return 'plainText'
  }

  const serialize = (editor: Editor): string => {
    return editor.getText({ blockSeparator: '\n' })
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

  const extensions = (): Extension[] => {
    return [
      StarterKit.configure({
        blockquote: false,
        bold: false,
        bulletList: false,
        code: false,
        codeBlock: false,
        dropcursor: false,
        gapcursor: false,
        heading: false,
        horizontalRule: false,
        italic: false,
        link: false,
        listItem: false,
        listKeymap: false,
        orderedList: false,
        strike: false
      })
    ]
  }

  const { undo, redo, zoomMenu, menuEmoji } = useEditorActions(editorState)
  const editorActionGroups = (): EditorActionGroup[] => {
    return [
      {
        id: 'history',
        title: $gettext('History'),
        actions: [undo(), redo()]
      },
      {
        id: 'emoji',
        title: $gettext('Emoji'),
        actions: [menuEmoji()]
      },
      {
        id: 'view-options',
        title: $gettext('View options'),
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
