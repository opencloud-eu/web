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
                const markdownContent = editor.markdown?.parse(text)
                const content = markdownContent?.content ?? []
                if (!content.length) {
                  return false
                }

                const [node] = content
                const parent = view.state.selection.$from.parent

                // Only unwrap text-like blocks into existing text. Structural blocks like
                // lists or fenced code must keep their wrapper when pasted into a paragraph.
                const pasteInline =
                  parent.isTextblock &&
                  parent.content.size > 0 &&
                  content.length === 1 &&
                  (node?.type === 'paragraph' || node?.type === 'heading')

                return editor.commands.insertContent(pasteInline ? (node.content ?? []) : content)
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
