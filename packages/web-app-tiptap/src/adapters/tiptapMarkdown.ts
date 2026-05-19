import * as Y from 'yjs'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Collaboration } from '@tiptap/extension-collaboration'
import { Markdown } from '@tiptap/markdown'
import type { CollaborativeAdapter } from '@opencloud-eu/web-pkg'

// Tiptap binds Collaboration to a named Y.XmlFragment on the doc. We use
// the extension's default field name; the editor component must match.
const FRAGMENT = 'default'

// Spin up a Tiptap editor with no visible DOM and the editor bound to the
// caller's Y.Doc. Loading the schema + Markdown extension is enough to do
// MD ↔ ProseMirror conversions; the editor never paints anywhere on screen.
// We attach to a detached <div> because @tiptap/core requires an element.
function makeHeadlessEditor(ydoc: Y.Doc): Editor {
  const detached = document.createElement('div')
  return new Editor({
    element: detached,
    extensions: [
      StarterKit.configure({
        // Yjs Collaboration replaces StarterKit's undo/redo with yUndoPlugin
        // from y-tiptap. (Was `history: false` in tiptap v2, renamed in v3.)
        undoRedo: false
      }),
      Markdown,
      Collaboration.configure({ document: ydoc, field: FRAGMENT })
    ]
  })
}

export const tiptapMarkdownAdapter: CollaborativeAdapter = {
  hydrate(ydoc: Y.Doc, content: string) {
    if (!content) return
    const editor = makeHeadlessEditor(ydoc)
    try {
      // contentType: 'markdown' routes the input through @tiptap/markdown's
      // parser. The Collaboration plugin propagates the resulting
      // ProseMirror state into the bound Y.XmlFragment.
      editor.commands.setContent(content, { contentType: 'markdown' })
    } finally {
      editor.destroy()
    }
  },

  serialize(ydoc: Y.Doc): string {
    const editor = makeHeadlessEditor(ydoc)
    try {
      return editor.getMarkdown()
    } finally {
      editor.destroy()
    }
  },

  hasContent(ydoc: Y.Doc): boolean {
    return ydoc.getXmlFragment(FRAGMENT).length > 0
  },

  reset(ydoc: Y.Doc) {
    const frag = ydoc.getXmlFragment(FRAGMENT)
    if (frag.length === 0) return
    ydoc.transact(() => {
      frag.delete(0, frag.length)
    }, 'reset')
  }
}
