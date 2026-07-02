import type { ContentType, TextEditorState } from '../types'
import type { UseEditorActionsOptions } from './useEditorActions'
import {
  ContentTypeStrategy,
  useStrategyHtml,
  useStrategyMarkdown,
  useStrategyPlainText,
  useStrategyTiptapJson
} from './strategies'

export const useContentStrategy = () => {
  const resolveStrategy = (
    contentType: ContentType,
    editorState: TextEditorState,
    editorActionOptions: UseEditorActionsOptions = {}
  ): ContentTypeStrategy => {
    switch (contentType) {
      case 'plain-text':
        return useStrategyPlainText(editorState)
      case 'markdown':
        return useStrategyMarkdown(editorState)
      case 'html':
        return useStrategyHtml(editorState, editorActionOptions)
      case 'tiptap-json':
        return useStrategyTiptapJson(editorState)
      default:
        throw new Error(`Unknown content type: ${contentType}`)
    }
  }

  return {
    resolveStrategy
  }
}
