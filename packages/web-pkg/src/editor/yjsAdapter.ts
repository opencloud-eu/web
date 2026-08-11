import { Editor, getSchema } from '@tiptap/core'
import { Collaboration } from '@tiptap/extension-collaboration'
import { yXmlFragmentToProseMirrorRootNode } from '@tiptap/y-tiptap'
import { toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import type * as Y from 'yjs'
import type { Schema } from '@tiptap/pm/model'
import type { YjsAdapter } from '../composables/yjs/types'
import type { ContentTypeStrategy } from './composables/strategies/types'
import { DEFAULT_YDOC_FRAGMENT } from './types'

/**
 * Bridges the `web-pkg/editor` strategy contract to the
 * {@link YjsAdapter} contract that `useYjsSession`
 * expects.
 *
 * Each strategy already knows how to convert between its native string format
 * (markdown / HTML / plain text / tiptap-json) and a ProseMirror document. The
 * adapter handles the conversion between that document and the Y.Doc state
 * that `Collaboration` writes to.
 *
 * `serialize` converts the Y.XmlFragment directly into a ProseMirror node and
 * hands that to the strategy. No editor is involved, which matters because the
 * session serializes on every pause in typing on every peer.
 *
 * `hydrate` still needs an editor, because parsing native content back into
 * the shared types goes through `setContent`. It runs once per session, so its
 * cost does not matter. It spawns a headless editor for this.
 *
 * `strategy` is a `MaybeRefOrGetter` because the adapter is built before the
 * file is loaded, so the content type isn't known yet. Strategies must be
 * built in a setup context; resolving the getter later is safe.
 */
export function makeTiptapYjsAdapter(
  strategy: MaybeRefOrGetter<ContentTypeStrategy>,
  fragment = DEFAULT_YDOC_FRAGMENT
): YjsAdapter {
  // Building the schema walks every extension, so keep one per strategy. The
  // getter can resolve to a different strategy per call (the content type is
  // detected from the resource), hence a map rather than a single slot.
  const schemas = new WeakMap<ContentTypeStrategy, Schema>()
  function schemaFor(current: ContentTypeStrategy): Schema {
    let schema = schemas.get(current)
    if (!schema) {
      schema = getSchema(current.extensions({ yjs: true }))
      schemas.set(current, schema)
    }
    return schema
  }

  function makeHeadlessEditor(ydoc: Y.Doc): Editor {
    const detached = document.createElement('div')
    return new Editor({
      element: detached,
      extensions: [
        ...toValue(strategy).extensions({ yjs: true }),
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
      const current = toValue(strategy)
      const doc = yXmlFragmentToProseMirrorRootNode(
        ydoc.getXmlFragment(fragment),
        schemaFor(current)
      )
      return current.serialize(doc)
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
