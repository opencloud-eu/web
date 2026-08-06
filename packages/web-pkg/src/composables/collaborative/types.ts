import type * as Y from 'yjs'

/**
 * App-specific adapter between the native file format and the shared Y.Doc.
 * The collaborative session itself stays generic: it handles realtime sync,
 * the etag loop, and lifecycle. Adapters describe how to move bytes in and
 * out of the doc.
 *
 * Implementations must be deterministic — given the same Y.Doc state,
 * `serialize` must always return the same content.
 */
export interface CollaborativeAdapter {
  /**
   * Populate an empty Y.Doc from the native file content. Called once per
   * document by the elected hydrating client; other clients receive the
   * resulting Y.Doc state through the realtime sync.
   *
   * Must be a no-op if the Y.Doc already has app data.
   */
  hydrate(ydoc: Y.Doc, content: string): void | Promise<void>

  /**
   * Render the current Y.Doc state to the native file format for WebDAV PUT.
   *
   * Adapters that need the live editor instance (e.g. to avoid spawning a
   * headless one per keystroke) should close over it at construction time.
   */
  serialize(ydoc: Y.Doc): string | Promise<string>

  /**
   * Returns true if the adapter has populated the doc with app data.
   * Used to detect "doc is empty, needs hydration" without the caller
   * knowing the adapter's shared-type layout.
   */
  hasContent(ydoc: Y.Doc): boolean

  /**
   * Wipe the adapter's shared content so `hasContent` returns false again.
   * Called when the persisted Y.Doc turns out to be stale (an external file
   * write happened between sessions); the elected client then re-hydrates
   * from the fresh native content.
   *
   * Optional — adapters that omit this won't recover from a stale-state
   * signal in-place; the session falls back to forcing a full reload.
   */
  reset?(ydoc: Y.Doc): void
}
