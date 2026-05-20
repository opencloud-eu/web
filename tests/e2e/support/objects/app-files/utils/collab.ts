import { Page, expect } from '@playwright/test'

// Realtime status strip lives at the top of CollaborativeWrapper.vue. The
// connect handshake is async (hocuspocus auth + initial sync), so callers
// generally wait on this before touching the editor.
const statusStrip = (page: Page, status: string) =>
  page.locator('.oc-text-meta', { hasText: status }).first()

export const awaitCollabStatus = async (
  page: Page,
  status: 'connected' | 'disconnected' | 'connecting' | 'local'
): Promise<void> => {
  await expect(statusStrip(page, status)).toBeVisible({ timeout: 10_000 })
}

// Per-editor content selectors. The wrapper itself is editor-agnostic; the
// bound editor component renders its own DOM. We keep this in one place so
// scenarios stay readable.
const editorContent = {
  codemirror: '.cm-content',
  tiptap: '.ProseMirror',
  // text-editor uses the tiptap editor under the hood since the Phase 4
  // refactor, so the selector is the same.
  'text-editor': '.ProseMirror'
} as const

export type CollabEditor = keyof typeof editorContent

export const collabContent = (page: Page, editor: CollabEditor) =>
  page.locator(editorContent[editor])

// Codemirror exposes one line per `.cm-line`. Tiptap renders paragraphs as
// `<p>` etc. inside `.ProseMirror`. For multi-user cursor assertions we lean
// on codemirror's `.cm-ySelectionCaret` / `.cm-ySelectionInfo`, which the
// y-codemirror.next integration paints.
export const codemirrorLine = (page: Page, lineIndex: number) =>
  page.locator('.cm-line').nth(lineIndex)

export const remoteCaretCount = (page: Page) =>
  page.locator('.cm-ySelectionCaret').count()

export const remoteCaretLabelText = (page: Page) =>
  page.locator('.cm-ySelectionInfo').first().textContent()
