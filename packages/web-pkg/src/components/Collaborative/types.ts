import type * as Y from 'yjs'

/**
 * App-specific adapter between the native file format and the shared Y.Doc.
 * The wrapper itself stays generic: it handles realtime sync, the etag loop,
 * and lifecycle. Adapters describe how to move bytes in and out of the doc.
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
   * `context` is an opaque object the bound editor component publishes via
   * `defineExpose({ getAdapterContext() })`. The wrapper passes it through
   * untyped because adapters may need wildly different shapes — a Tiptap
   * adapter wants the live `Editor` instance to call `getMarkdown()` on
   * directly (avoiding a per-keystroke headless-editor spawn), a CodeMirror
   * adapter just reads `Y.Text.toString()` and needs nothing. Adapters cast
   * `context` to their expected shape and treat absence as "fall back to
   * Y.Doc-only serialization".
   *
   * `context` is `undefined` when no editor is bound (e.g. during
   * stale-recovery on a peer that holds the doc but never mounted a UI)
   * or when the bound editor doesn't expose `getAdapterContext`.
   */
  serialize(ydoc: Y.Doc, context?: unknown): string | Promise<string>

  /**
   * Returns true if the adapter has populated the doc with app data.
   * Used to detect "doc is empty, needs hydration" without the wrapper
   * knowing the adapter's shared-type layout.
   */
  hasContent(ydoc: Y.Doc): boolean

  /**
   * Wipe the adapter's shared content so `hasContent` returns false again.
   * The wrapper calls this when the sidecar signals a stale persisted Y.Doc
   * (external file write happened between sessions); the elected client
   * then re-hydrates from the fresh native content.
   *
   * Optional — adapters that omit this won't recover from a stale-state
   * signal in-place; the wrapper falls back to forcing a full reload.
   */
  reset?(ydoc: Y.Doc): void
}
