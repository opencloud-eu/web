import { Editor } from '@tiptap/vue-3'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import HardBreak from '@tiptap/extension-hard-break'
import { Extension } from '@tiptap/core'
import { EditorActionGroup } from '../useEditorActions'
import { ContentTypeStrategy } from './types'

export const useStrategyPlainText = (): ContentTypeStrategy => {
  const editorContentType = () => {
    return 'plainText'
  }

  const serialize = (editor: Editor): string => {
    return editor.getText()
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
    return [Document, Paragraph, Text, HardBreak]
  }

  const editorActionGroups = (): EditorActionGroup[] => {
    return []
  }

  return {
    editorContentType,
    serialize,
    deserialize,
    extensions,
    editorActionGroups
  }
}
