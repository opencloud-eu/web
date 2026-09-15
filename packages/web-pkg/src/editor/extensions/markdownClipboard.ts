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

            handlePaste(view, event) {
              // Let the original paste handler insert plain text inside code-like nodes.
              // Parsing it as markdown would split pasted code into regular document blocks.
              if (view.state.selection.$from.parent.type.spec.code) {
                return false
              }

              const clipboardData = event.clipboardData
              const text =
                clipboardData?.getData('text/plain') || clipboardData?.getData('Text') || ''

              if (!text) {
                return false
              }

              try {
                return editor.commands.insertContent(text, { contentType: 'markdown' })
              } catch {
                // Let the original paste handler take over when markdown insertion fails.
                // This keeps browser/editor fallbacks like link-on-paste intact.
                return false
              }
            }
          }
        })
      ]
    }
  })
}
