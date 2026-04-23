import type { ContentType } from '../types'
import type { ContentTypeStrategy } from './types'
import type { LinkUrlCallback, ImageUrlCallback } from './richText'
import { PlainTextStrategy } from './plainText'
import { MarkdownStrategy } from './markdown'
import { HtmlStrategy } from './html'
import { TiptapJsonStrategy } from './tiptapJson'

export interface StrategyCallbacks {
  onRequestLinkUrl?: LinkUrlCallback
  onRequestImageUrl?: ImageUrlCallback
}

export function resolveStrategy(
  contentType: ContentType,
  callbacks: StrategyCallbacks = {}
): ContentTypeStrategy {
  switch (contentType) {
    case 'plain-text':
      return new PlainTextStrategy()
    case 'markdown':
      return new MarkdownStrategy(callbacks.onRequestLinkUrl)
    case 'html':
      return new HtmlStrategy(callbacks.onRequestLinkUrl, callbacks.onRequestImageUrl)
    case 'tiptap-json':
      return new TiptapJsonStrategy(callbacks.onRequestLinkUrl, callbacks.onRequestImageUrl)
    default:
      throw new Error(`Unknown content type: ${contentType}`)
  }
}
