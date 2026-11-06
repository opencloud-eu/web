import { Extension, type JSONContent } from '@tiptap/core'
import {
  DOMParser as ProseMirrorDOMParser,
  Fragment,
  type Node as ProseMirrorNode,
  type Schema,
  Slice
} from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { CellSelection } from '@tiptap/pm/tables'
import type { EditorView } from '@tiptap/pm/view'

/**
 * Selection slices contain all ancestors of the selection, e.g. the whole table around a word
 * selected in a cell. Drops the ancestors enclosing the whole selection, so only the selected
 * content gets copied. Returns plain text for selections inside a code block.
 */
function getSelectedContent(slice: Slice, schema: Schema): Fragment | string {
  let { content, openStart, openEnd } = slice
  const parents: ProseMirrorNode[] = []

  // a single child open on both sides encloses the whole selection
  while (openStart > 0 && openEnd > 0 && content.childCount === 1) {
    const node = content.firstChild

    if (node.isTextblock) {
      if (node.type.spec.code) {
        return node.textContent
      }
      // inline content only, e.g. without heading markers
      return Fragment.from(schema.nodes.paragraph.create(null, node.content))
    }

    // ends at different depths, e.g. a list item and its sub item, so the node itself is selected
    if (openStart !== openEnd) {
      break
    }

    parents.push(node)
    content = node.content
    openStart--
    openEnd--
  }

  // re-add the parents needed for valid top-level content, e.g. the list around several selected items
  while (parents.length && !schema.topNodeType.validContent(content)) {
    content = Fragment.from(parents.pop().copy(content))
  }

  return content
}

/**
 * Text copied from inside a code block is raw, so parsing it as markdown would alter it.
 * Returns a code block with that text if the clipboard holds code copied from an editor, unless
 * the paste target is code itself, where ProseMirror inserts the raw text.
 */
function getCopiedCodeBlock(view: EditorView, html: string | undefined): ProseMirrorNode | null {
  const { selection } = view.state
  // multi cell selections are handled by the tables plugin within the regular paste flow
  if (!html || selection instanceof CellSelection || selection.$from.parent.type.spec.code) {
    return null
  }

  const dom = new window.DOMParser().parseFromString(html, 'text/html').body
  if (!dom.querySelector('[data-pm-slice]')) {
    return null
  }

  const { schema } = view.state
  const { content } = ProseMirrorDOMParser.fromSchema(schema).parseSlice(dom)
  const node = content.childCount === 1 ? content.firstChild : null
  if (!node?.isTextblock || !node.type.spec.code) {
    return null
  }

  // code nodes outside the block group like frontmatter can't be placed anywhere, so paste their text as code block
  if (node.type.isInGroup('block')) {
    return node
  }
  return schema.nodes.codeBlock.create(null, node.content)
}

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
                // DOM event handlers run before ProseMirror's own editable check
                if (!view.editable) {
                  return false
                }

                const text =
                  event.clipboardData?.getData('text/plain') ||
                  event.clipboardData?.getData('Text') ||
                  ''
                if (!text) {
                  return false
                }

                const codeBlock = getCopiedCodeBlock(
                  view,
                  event.clipboardData?.getData('text/html')
                )
                if (codeBlock) {
                  view.dispatch(
                    view.state.tr
                      .replaceSelectionWith(codeBlock)
                      .scrollIntoView()
                      .setMeta('paste', true)
                      .setMeta('uiEvent', 'paste')
                  )
                  event.preventDefault()
                  return true
                }

                const handled = view.pasteText(text, event)
                if (!handled) {
                  return false
                }

                event.preventDefault()
                return true
              }
            },

            clipboardTextSerializer(slice: Slice, view) {
              const content = getSelectedContent(slice, view.state.schema)
              if (typeof content === 'string') {
                return content
              }

              if (!content.size) {
                return ''
              }

              return (
                editor.markdown?.serialize({
                  type: 'doc',
                  content: (content.toJSON() as JSONContent[] | null) ?? []
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
