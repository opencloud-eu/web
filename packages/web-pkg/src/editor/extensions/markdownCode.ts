import Code from '@tiptap/extension-code'
import type { Mark, MarkType, Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Transform } from '@tiptap/pm/transform'

/**
 * Removes marks that cover only part of a code run. Markdown can only wrap a
 * whole code span, e.g. "**`foo`**", anything else would be saved as syntax
 * inside the backticks.
 */
function stripPartialMarks(tr: Transform, block: ProseMirrorNode, pos: number, code: MarkType) {
  let run: { from: number; to: number; nodes: ProseMirrorNode[] } | null = null

  const flush = () => {
    if (run && run.nodes.length > 1) {
      const { from, to, nodes } = run
      const marks: Mark[] = []
      nodes.forEach((node) =>
        node.marks.forEach((mark) => {
          if (!mark.isInSet(marks)) {
            marks.push(mark)
          }
        })
      )
      marks.forEach((mark) => {
        if (nodes.some((node) => !mark.isInSet(node.marks))) {
          tr.removeMark(from, to, mark)
        }
      })
    }
    run = null
  }

  block.forEach((child, offset) => {
    const from = pos + 1 + offset
    if (!child.isText || !code.isInSet(child.marks)) {
      flush()
      return
    }
    run ??= { from, to: from, nodes: [] }
    run.to = from + child.nodeSize
    run.nodes.push(child)
  })
  flush()
}

function stripPartialMarksBetween(tr: Transform, from: number, to: number, code: MarkType) {
  tr.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isTextblock) {
      return true
    }
    stripPartialMarks(tr, node, pos, code)
    return false
  })
}

/**
 * Inline code that can carry other marks. Markdown allows code spans inside
 * bold, italic, strike and links, e.g. "**`foo`**", but tiptap's code mark
 * excludes all marks, so such a document fails the schema check.
 *
 * The low priority sorts code last among the marks: mark rank decides the
 * nesting when serializing, and code has to be the innermost one. It also runs
 * `onBeforeCreate` after the Markdown extension has parsed the initial content.
 */
export const MarkdownCode = Code.extend({
  priority: 50,
  excludes: 'code',

  onBeforeCreate() {
    // the initial content is parsed without a transaction, the plugin never sees it
    const { content } = this.editor.options
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
      return
    }

    let doc: ProseMirrorNode
    try {
      doc = this.editor.schema.nodeFromJSON(content)
    } catch {
      // left for the editor to report
      return
    }

    const tr = new Transform(doc)
    stripPartialMarksBetween(tr, 0, doc.content.size, this.type)
    if (tr.docChanged) {
      this.editor.options.content = tr.doc.toJSON()
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('markdownCodeMarks'),
        appendTransaction: (transactions, oldState, newState) => {
          // a read only peer's writes are dropped by the server
          if (!this.editor.isEditable || !transactions.some((tr) => tr.docChanged)) {
            return null
          }

          const start = oldState.doc.content.findDiffStart(newState.doc.content)
          if (start === null) {
            return null
          }
          const { b } = oldState.doc.content.findDiffEnd(newState.doc.content)
          const end = Math.min(Math.max(b, start + 1), newState.doc.content.size)

          const tr = newState.tr
          stripPartialMarksBetween(tr, start, end, this.type)
          return tr.docChanged ? tr : null
        }
      })
    ]
  }
})
