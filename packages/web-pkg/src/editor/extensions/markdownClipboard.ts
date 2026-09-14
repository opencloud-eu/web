import { Extension, type JSONContent } from '@tiptap/core'
import { Slice } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { normalizeLinkUrl } from './link'

export function createMarkdownClipboardExtension() {
  return Extension.create({
    name: 'markdownClipboard',

    addProseMirrorPlugins() {
      const { editor } = this

      return [
        new Plugin({
          key: new PluginKey('markdownClipboard'),
          props: {
            clipboardTextSerializer(slice: Slice) {
              if (!slice.content.size) {
                return ''
              }

              const content = slice.content.toJSON() as JSONContent[] | null
              return editor.markdown?.serialize({ type: 'doc', content: content ?? [] }) ?? ''
            },

            handlePaste(_view, event) {
              const clipboardData = event.clipboardData
              const text =
                clipboardData?.getData('text/plain') || clipboardData?.getData('Text') || ''
              const hasHtml = clipboardData?.types.includes('text/html') ?? false

              // Let ProseMirror/Tiptap handle empty, rich HTML, and URL-only clipboard
              // content so existing formatting and link-paste behavior are preserved.
              if (!text.trim() || hasHtml || normalizeLinkUrl(text)) {
                return false
              }

              return editor.commands.insertContent(text, { contentType: 'markdown' })
            }
          }
        })
      ]
    }
  })
}
