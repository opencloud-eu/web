import { Editor } from '@tiptap/core'
import { Collaboration } from '@tiptap/extension-collaboration'
import type * as Y from 'yjs'
import type { Editor as TiptapVueEditor } from '@tiptap/vue-3'
import type { CollaborativeAdapter } from '@opencloud-eu/web-pkg'
import type { ContentTypeStrategy } from '@opencloud-eu/web-pkg/editor'

// CollaborativeWrapper binds editor state to a named Y.XmlFragment. We use
// the default field name `'default'`; the editor component (TextEditorBinding,
// which calls useTextEditor with the same ydoc + default fragment) must
// match.
const FRAGMENT = 'default'

/**
 * Bridges the existing `web-pkg/editor` strategy contract to the
 * `CollaborativeAdapter` contract the `CollaborativeWrapper` expects.
 *
 * Each strategy already knows how to convert between its native string
 * format (markdown / HTML / plain text / tiptap-json) and a Tiptap editor
 * state. The adapter wraps that with the bit of plumbing the wrapper
 * needs: hydration through a headless editor that materialises into the
 * shared Y.Doc, serialisation that prefers the live editor when bound
 * (via the `getAdapterContext()` channel) and only spawns a headless
 * fallback when no UI is mounted, and `hasContent` / `reset` against the
 * `'default'` Y.XmlFragment that `Collaboration` writes to.
 *
 * Must be called from a Vue setup context — the strategy reference comes
 * from `useContentStrategy()` which in turn calls `useGettext()`.
 */
export function makeTextEditorAdapter(strategy: ContentTypeStrategy): CollaborativeAdapter {
  function makeHeadlessEditor(ydoc: Y.Doc): Editor {
    const detached = document.createElement('div')
    return new Editor({
      element: detached,
      extensions: [
        ...strategy.extensions(),
        Collaboration.configure({ document: ydoc, field: FRAGMENT })
      ]
    })
  }

  function setContentOptions(): Record<string, unknown> {
    const opts: Record<string, unknown> = { emitUpdate: false }
    if (strategy.editorContentType) {
      opts.contentType = strategy.editorContentType()
    }
    return opts
  }

  return {
    hydrate(ydoc, content) {
      if (!content) return
      const editor = makeHeadlessEditor(ydoc)
      try {
        editor.commands.setContent(
          strategy.deserialize(content) as Parameters<typeof editor.commands.setContent>[0],
          setContentOptions()
        )
      } finally {
        editor.destroy()
      }
    },

    serialize(ydoc, context) {
      const live = (context as { editor?: TiptapVueEditor } | undefined)?.editor
      if (live) return strategy.serialize(live)
      const editor = makeHeadlessEditor(ydoc)
      try {
        return strategy.serialize(editor as unknown as TiptapVueEditor)
      } finally {
        editor.destroy()
      }
    },

    hasContent(ydoc) {
      return ydoc.getXmlFragment(FRAGMENT).length > 0
    },

    reset(ydoc) {
      const frag = ydoc.getXmlFragment(FRAGMENT)
      if (frag.length === 0) return
      ydoc.transact(() => frag.delete(0, frag.length), 'reset')
    }
  }
}
