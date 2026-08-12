import type * as Y from 'yjs'

/**
 * App-specific adapter between the native file format and the shared Y.Doc.
 * The Yjs session itself stays generic: it handles sync,
 * the etag loop, and lifecycle. Adapters describe how to move bytes in and
 * out of the doc.
 */
export interface YjsAdapter {
  /**
   * Populate an empty Y.Doc from the native file content. Called once per
   * document by the elected hydrating client, unless stale recovery re-runs
   * it. Other clients receive the resulting Y.Doc state through the Yjs
   * sync.
   *
   * Must be a no-op if the Y.Doc already has app data.
   *
   * **Must be synchronous.** Stale recovery wipes the shared document and
   * re-seeds it, and it relies on that running in one go: yielding partway
   * through lets a remote update move the recovery claim.
   */
  hydrate(ydoc: Y.Doc, content: string): void

  /**
   * Render the current Y.Doc state to the native file format for WebDAV PUT
   * and the local `isDirty` check in the app wrapper. Runs continuously and
   * on every peer, triggered by Y.Doc/meta changes.
   */
  serialize(ydoc: Y.Doc): string | Promise<string>

  /**
   * Returns true if the adapter has populated the Y.Doc with app data.
   * Used to detect "doc is empty, needs hydration" without the caller
   * knowing the adapter's shared-type layout.
   */
  hasContent(ydoc: Y.Doc): boolean

  /**
   * Wipe the adapter's shared content so `hasContent` returns false again.
   * Called when the persisted Y.Doc turns out to be stale (e.g. an external
   * file write happened between sessions); the elected client then
   * re-hydrates from the fresh native content.
   *
   * Optional; adapters that omit this won't recover from a stale-state
   * signal in-place; the session falls back to forcing a full reload.
   */
  reset?(ydoc: Y.Doc): void
}
