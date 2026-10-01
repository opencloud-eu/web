import { Extension, getTextBetween, getTextSerializersFromSchema } from '@tiptap/core'
import { Fragment, Slice } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'

/**
 * Clipboard handling for the plain text editor.
 *
 * Plain text files are stored as one paragraph per line (see the plain text strategy),
 * so copying and pasting has to follow the same rule instead of ProseMirror's defaults.
 */
export function createPlainTextClipboardExtension() {
  return Extension.create({
    name: 'plainTextClipboard',

    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey('plainTextClipboard'),
          props: {
            handleDOMEvents: {
              // ProseMirror prefers text/html over text/plain when both are present. Parsing
              // the html into the reduced plain text schema strips everything it can't
              // represent, e.g. markdown copied from the markdown editor loses its syntax.
              // This runs as a DOM event handler because `handlePaste` only receives the
              // already parsed html slice, and calling `pasteText` from there would re-enter it.
              paste(view, event) {
                const text = event.clipboardData?.getData('text/plain')
                if (!text || !view.pasteText(text, event)) {
                  // no text payload (e.g. html only): fall back to the default paste handling
                  return false
                }

                event.preventDefault()
                return true
              }
            },

            // Tiptap's core clipboard text serializer separates blocks with a blank line, which
            // would double every line break when copying within the plain text editor. Use the
            // same helpers with a single line break instead, matching how the file is saved.
            // Tiptap orders plugins of custom extensions before its core ones, so this one wins.
            clipboardTextSerializer(_slice, view) {
              const { doc, selection, schema } = view.state
              return getTextBetween(doc, selection, {
                blockSeparator: '\n',
                textSerializers: getTextSerializersFromSchema(schema)
              })
            },

            // ProseMirror's default parser collapses consecutive line breaks, which would drop
            // empty lines. Map every line to its own paragraph instead, keeping empty ones.
            // The open slice (1, 1) lets the first and last line merge into the paragraph
            // at the cursor, so pasting a single line inserts it inline.
            clipboardTextParser(text, _context, _plain, view) {
              const { schema } = view.state
              const paragraphs = text
                .split(/\r\n?|\n/)
                .map((line) => schema.nodes.paragraph.create(null, line ? schema.text(line) : null))

              return new Slice(Fragment.from(paragraphs), 1, 1)
            }
          }
        })
      ]
    }
  })
}
