import type * as Y from 'yjs'
import type { CollaborativeAdapter } from '@opencloud-eu/web-pkg'

const SHARED_TEXT_KEY = 'content'

export const codemirrorMarkdownAdapter: CollaborativeAdapter = {
  hydrate(ydoc: Y.Doc, content: string) {
    const yText = ydoc.getText(SHARED_TEXT_KEY)
    if (yText.length > 0) return
    if (!content) return
    ydoc.transact(() => {
      yText.insert(0, content)
    }, 'hydrate')
  },

  serialize(ydoc: Y.Doc): string {
    return ydoc.getText(SHARED_TEXT_KEY).toString()
  },

  hasContent(ydoc: Y.Doc): boolean {
    return ydoc.getText(SHARED_TEXT_KEY).length > 0
  },

  reset(ydoc: Y.Doc) {
    const yText = ydoc.getText(SHARED_TEXT_KEY)
    if (yText.length === 0) return
    ydoc.transact(() => {
      yText.delete(0, yText.length)
    }, 'reset')
  }
}
