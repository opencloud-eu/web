import type { ContentType } from '../types'
import {
  ContentTypeStrategy,
  useStrategyHtml,
  useStrategyMarkdown,
  useStrategyPlainText,
  useStrategyTiptapJson
} from './strategies'

export const useContentStrategy = () => {
  const resolveStrategy = (contentType: ContentType): ContentTypeStrategy => {
    switch (contentType) {
      case 'plain-text':
        return useStrategyPlainText()
      case 'markdown':
        return useStrategyMarkdown()
      case 'html':
        return useStrategyHtml()
      case 'tiptap-json':
        return useStrategyTiptapJson()
      default:
        throw new Error(`Unknown content type: ${contentType}`)
    }
  }

  return {
    resolveStrategy
  }
}
