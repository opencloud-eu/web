import { Editor } from '@tiptap/core'
import { Collaboration } from '@tiptap/extension-collaboration'
import { toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import type * as Y from 'yjs'
import type { Editor as TiptapVueEditor } from '@tiptap/vue-3'
import type { CollaborativeAdapter } from '../composables/collaborative/types'
import type { ContentTypeStrategy } from './composables/strategies/types'

/**
 * Default Y.XmlFragment field name. Must match `useTextEditor`'s
 * `ydocFragment` option, which defaults to the same value.
 */
const DEFAULT_FRAGMENT = 'default'

/**
 * Bridges the `web-pkg/editor` strategy contract to the
 * {@link CollaborativeAdapter} contract that `useCollaborativeDocument`
 * expects.
 *
 * Each strategy already knows how to convert between its native string format
 * (markdown / HTML / plain text / tiptap-json) and a Tiptap editor state. The
 * adapter adds the plumbing around it: hydrate and serialize run through a
 * throwaway headless editor bound to the shared Y.Doc, and `hasContent` /
 * `reset` work on the Y.XmlFragment that `Collaboration` writes to.
 *
 * Building that editor costs a few milliseconds and only happens once per
 * save — the session debounces serialization to one call per pause in typing,
 * not one per keystroke — so it is not worth caching or routing the mounted
 * editor back here.
 *
 * `strategy` is a `MaybeRefOrGetter` because the adapter is built before the
 * file is loaded, so the content type isn't known yet. It must be *resolved*
 * from a Vue setup context though: strategies call `useGettext()`.
 */
export function makeTiptapCollabAdapter(
  strategy: MaybeRefOrGetter<ContentTypeStrategy>,
  fragment = DEFAULT_FRAGMENT
): CollaborativeAdapter {
  function makeHeadlessEditor(ydoc: Y.Doc): Editor {
    const detached = document.createElement('div')
    return new Editor({
      element: detached,
      extensions: [
        ...toValue(strategy).extensions({ collaborative: true }),
        Collaboration.configure({ document: ydoc, field: fragment })
      ]
    })
  }

  function setContentOptions(): Record<string, unknown> {
    const opts: Record<string, unknown> = { emitUpdate: false }
    const editorContentType = toValue(strategy).editorContentType
    if (editorContentType) {
      opts.contentType = editorContentType()
    }
    return opts
  }

  return {
    hydrate(ydoc, content) {
      if (!content) return
      const editor = makeHeadlessEditor(ydoc)
      try {
        editor.commands.setContent(
          toValue(strategy).deserialize(content) as Parameters<
            typeof editor.commands.setContent
          >[0],
          setContentOptions()
        )
      } finally {
        editor.destroy()
      }
    },

    serialize(ydoc) {
      const editor = makeHeadlessEditor(ydoc)
      try {
        return toValue(strategy).serialize(editor as unknown as TiptapVueEditor)
      } finally {
        editor.destroy()
      }
    },

    hasContent(ydoc) {
      return ydoc.getXmlFragment(fragment).length > 0
    },

    reset(ydoc) {
      const frag = ydoc.getXmlFragment(fragment)
      if (frag.length === 0) return
      frag.delete(0, frag.length)
    }
  }
}
