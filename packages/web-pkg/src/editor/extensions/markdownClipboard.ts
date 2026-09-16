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
            handleDOMEvents: {
              paste(view, event) {
                const text =
                  event.clipboardData?.getData('text/plain') ||
                  event.clipboardData?.getData('Text') ||
                  ''
                if (!text) {
                  return false
                }

                const handled = view.pasteText(text, event)
                if (!handled) {
                  return false
                }

                event.preventDefault()
                return true
              }
            },

            clipboardTextSerializer(slice: Slice) {
              if (!slice.content.size) {
                return ''
              }

              return (
                editor.markdown?.serialize({
                  type: 'doc',
                  content: (slice.content.toJSON() as JSONContent[] | null) ?? []
                }) ?? ''
              )
            },

            // Convert text clipboard payloads, then let ProseMirror's default
            // paste flow fit the slice into the current selection.
            clipboardTextParser(text, _context, _plain, view) {
              try {
                const markdownContent = editor.markdown?.parse(text)
                if (!markdownContent?.content?.length) {
                  return undefined
                }

                return new Slice(view.state.schema.nodeFromJSON(markdownContent).content, 0, 0)
              } catch {
                return undefined
              }
            }
          }
        })
      ]
    }
  })
}
