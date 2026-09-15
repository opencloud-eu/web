import { Extension, type JSONContent } from '@tiptap/core'
import { Slice } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'

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

              if (!text) {
                return false
              }

              try {
                return editor.commands.insertContent(text, { contentType: 'markdown' })
              } catch {
                return false
              }
            }
          }
        })
      ]
    }
  })
}
