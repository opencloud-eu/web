// DOM globals must be installed before any tiptap / prosemirror import.
// jsdom gives us a real window, document, addEventListener, requestAnimationFrame
// etc. — what ProseMirror's EditorView expects.
import { JSDOM } from 'jsdom'
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true
})
function definePolyfill(key: string, value: unknown): void {
  const g = globalThis as unknown as Record<string, unknown>
  if (g[key] !== undefined) {
    return
  }
  try {
    g[key] = value
  } catch {
    // Some Node versions expose certain globals (e.g. `navigator`) as read-only
    // getters; ignore — the parts we actually need are all writable.
  }
}
const w = dom.window as unknown as Record<string, unknown>
function pickFromWindow(key: string): unknown {
  const value = w[key]
  // Methods need their `this` bound back to the window when accessed as free
  // globals (e.g. `addEventListener(...)` without `window.` prefix).
  return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(w) : value
}
definePolyfill('window', dom.window)
for (const key of [
  'document',
  'DOMParser',
  'Node',
  'Element',
  'HTMLElement',
  'getComputedStyle',
  'addEventListener',
  'removeEventListener',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'innerWidth',
  'innerHeight',
  'pageXOffset',
  'pageYOffset',
  'scrollX',
  'scrollY',
  'devicePixelRatio',
  'visualViewport',
  'Range',
  'Selection',
  'CSS'
]) {
  definePolyfill(key, pickFromWindow(key))
}

import { Server, type Document } from '@hocuspocus/server'
import { Logger } from '@hocuspocus/extension-logger'
import { Editor, type Extensions } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import TDocument from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import HardBreak from '@tiptap/extension-hard-break'
import * as Y from 'yjs'
import { prosemirrorJSONToYDoc, yDocToProsemirrorJSON } from 'y-prosemirror'
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import { fetch } from 'undici'

type ContentType = 'markdown' | 'plain-text'

interface RoomState {
  fileId: string
  ct: ContentType
  etag: string | null
  latestToken: string | null
}

const PORT = Number(process.env.PORT ?? 9400)
const OC_URL = (process.env.OC_URL ?? 'https://host.docker.internal:9200').replace(/\/$/, '')
const IDP_ISSUER = (process.env.IDP_ISSUER ?? OC_URL).replace(/\/$/, '')
const SAVE_DEBOUNCE_MS = Number(process.env.SAVE_DEBOUNCE_MS ?? 2000)

const rooms = new Map<string, RoomState>()

let jwksGetter: ReturnType<typeof createRemoteJWKSet> | null = null
let oidcIssuer: string | null = null

async function loadJwks() {
  const discoveryUrl = `${IDP_ISSUER}/.well-known/openid-configuration`
  // OpenCloud usually finishes booting after our compose `depends_on` thinks it
  // has — keep retrying so a fresh stack doesn't crashloop hocuspocus.
  const maxAttempts = 60
  let attempt = 0
  for (;;) {
    attempt++
    try {
      const res = await fetch(discoveryUrl)
      if (!res.ok) {
        throw new Error(`OIDC discovery failed (${res.status}) at ${discoveryUrl}`)
      }
      const doc = (await res.json()) as { issuer: string; jwks_uri: string }
      oidcIssuer = doc.issuer
      jwksGetter = createRemoteJWKSet(new URL(doc.jwks_uri))
      console.log(`[hocuspocus] OIDC issuer=${oidcIssuer} jwks=${doc.jwks_uri}`)
      return
    } catch (err) {
      if (attempt >= maxAttempts) {
        throw err
      }
      const wait = Math.min(5000, 500 * attempt)
      console.warn(
        `[hocuspocus] OIDC discovery attempt ${attempt}/${maxAttempts} failed (${(err as Error).message}); retrying in ${wait}ms`
      )
      await new Promise((resolve) => setTimeout(resolve, wait))
    }
  }
}

// Room name shape: "<fileId>__<ct>". OpenCloud fileIds are of the form
// "<storage>$<space>!<item>", so the separator must not be `!`, `$`, or `/`.
const ROOM_SEPARATOR = '__'

function parseRoom(name: string): { fileId: string; ct: ContentType } {
  const idx = name.lastIndexOf(ROOM_SEPARATOR)
  if (idx === -1) {
    throw new Error(`invalid room name "${name}": expected "<fileId>${ROOM_SEPARATOR}<ct>"`)
  }
  const fileId = name.slice(0, idx)
  const ctHint = name.slice(idx + ROOM_SEPARATOR.length)
  const ct: ContentType = ctHint === 'md' ? 'markdown' : 'plain-text'
  return { fileId, ct }
}

function buildExtensions(ct: ContentType): Extensions {
  if (ct === 'markdown') {
    return [
      StarterKit.configure({ link: false, undoRedo: false }),
      Markdown,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      Image.configure({ inline: false })
    ]
  }
  return [TDocument, Paragraph, Text, HardBreak]
}

function buildHeadlessEditor(ct: ContentType): Editor {
  const editorOptions: Record<string, unknown> = { extensions: buildExtensions(ct) }
  if (ct === 'markdown') {
    editorOptions.contentType = 'markdown'
  }
  return new Editor(editorOptions as ConstructorParameters<typeof Editor>[0])
}

function plainTextToJson(text: string) {
  if (!text) {
    return { type: 'doc', content: [{ type: 'paragraph' }] }
  }
  const lines = text.split('\n')
  return {
    type: 'doc',
    content: lines.map((line) =>
      line ? { type: 'paragraph', content: [{ type: 'text', text: line }] } : { type: 'paragraph' }
    )
  }
}

function textToYDoc(body: string, ct: ContentType): Y.Doc {
  const editor = buildHeadlessEditor(ct)
  try {
    if (ct === 'markdown') {
      editor.commands.setContent(body, { contentType: 'markdown', emitUpdate: false } as never)
    } else {
      editor.commands.setContent(plainTextToJson(body), { emitUpdate: false })
    }
    return prosemirrorJSONToYDoc(editor.schema, editor.getJSON(), 'default')
  } finally {
    editor.destroy()
  }
}

function yDocToText(doc: Y.Doc, ct: ContentType): string {
  const editor = buildHeadlessEditor(ct)
  try {
    const json = yDocToProsemirrorJSON(doc, 'default')
    editor.commands.setContent(json, { emitUpdate: false })
    if (ct === 'markdown') {
      // `getMarkdown()` is added to the Editor prototype by the `@tiptap/markdown`
      // extension when registered. Without it, output would be the plain text fallback.
      const getMarkdown = (editor as unknown as { getMarkdown?: () => string }).getMarkdown
      if (typeof getMarkdown !== 'function') {
        throw new Error(
          'tiptap/markdown extension did not register getMarkdown() — schema/extension mismatch'
        )
      }
      return getMarkdown.call(editor)
    }
    return editor.getText()
  } finally {
    editor.destroy()
  }
}

function webdavUrl(fileId: string): string {
  // OpenCloud's `$`, `!` are allowed in URL path segments (RFC 3986 sub-delims),
  // and OpenCloud's WebDAV expects the OC-FileId verbatim.
  return `${OC_URL}/remote.php/dav/spaces/${fileId}`
}

async function webdavGet(
  token: string,
  fileId: string
): Promise<{ body: string; etag: string | null }> {
  const res = await fetch(webdavUrl(fileId), {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) {
    throw new Error(`webdav GET failed (${res.status}) for ${fileId}`)
  }
  const body = await res.text()
  const etag = res.headers.get('oc-etag') ?? res.headers.get('etag')
  return { body, etag }
}

async function webdavPut(
  token: string,
  fileId: string,
  body: string,
  ifMatch: string | null
): Promise<{ etag: string | null; status: number }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/octet-stream'
  }
  if (ifMatch) {
    headers['If-Match'] = ifMatch
  }
  const res = await fetch(webdavUrl(fileId), {
    method: 'PUT',
    headers,
    body
  })
  const etag = res.headers.get('oc-etag') ?? res.headers.get('etag')
  return { etag, status: res.status }
}

async function flushRoom(roomName: string, doc: Document): Promise<void> {
  const state = rooms.get(roomName)
  if (!state) {
    return
  }
  if (!state.latestToken) {
    console.warn(`[hocuspocus] flush skipped for ${roomName}: no token in room state`)
    return
  }
  const body = yDocToText(doc, state.ct)
  const { etag, status } = await webdavPut(state.latestToken, state.fileId, body, state.etag)
  if (status === 412) {
    // The file changed on the server (or in a parallel session) since we last
    // read it. OpenCloud keeps every PUT as a version, so we can safely
    // overwrite without losing data — the superseded content remains
    // recoverable from version history. We avoid Y.Doc merge, which would
    // corrupt the live document by unioning two unrelated histories.
    try {
      const fresh = await webdavGet(state.latestToken, state.fileId)
      console.warn(
        `[hocuspocus] webdav PUT 412 for ${roomName}: external change detected ` +
          `(was etag=${state.etag}, server etag=${fresh.etag}). Forcing overwrite; ` +
          `previous server state is preserved in OpenCloud version history.`
      )
      const retry = await webdavPut(state.latestToken, state.fileId, body, null)
      if (retry.status < 200 || retry.status >= 300) {
        // Keep the old etag so the next flush will retry optimistic concurrency.
        console.error(
          `[hocuspocus] webdav PUT retry ${retry.status} for ${roomName}; ` +
            `keeping previous etag for next flush`
        )
        return
      }
      state.etag = retry.etag
      console.log(`[hocuspocus] flushed ${roomName} after 412 retry (etag=${retry.etag})`)
      // Notify connected clients so they can surface a toast — the previous
      // server content is recoverable from OpenCloud's version history.
      try {
        doc.broadcastStateless(
          JSON.stringify({
            type: 'externalOverwrite',
            fromEtag: fresh.etag,
            toEtag: retry.etag
          })
        )
      } catch (err) {
        console.warn(`[hocuspocus] broadcastStateless failed for ${roomName}:`, err)
      }
    } catch (err) {
      console.error(`[hocuspocus] 412 recovery failed for ${roomName}; keeping previous etag:`, err)
    }
    return
  }
  if (status < 200 || status >= 300) {
    // Keep state.etag so the next attempt still goes through optimistic
    // concurrency — don't mark this write as confirmed.
    console.error(`[hocuspocus] webdav PUT ${status} for ${roomName}`)
    return
  }
  state.etag = etag
  console.log(`[hocuspocus] flushed ${roomName} (etag=${etag})`)
}

async function bootstrap() {
  await loadJwks()

  const server = Server.configure({
    port: PORT,
    debounce: SAVE_DEBOUNCE_MS,
    extensions: [new Logger()],
    async onAuthenticate({ token, documentName }) {
      if (!jwksGetter) {
        throw new Error('JWKS not loaded')
      }
      const { payload } = await jwtVerify(token, jwksGetter, {
        issuer: oidcIssuer ?? undefined
      })
      // Stash the freshest token for this room so disconnect-time flushes can
      // still authenticate against WebDAV.
      const existing = rooms.get(documentName)
      if (existing) {
        existing.latestToken = token
      }
      return { token, user: payload } satisfies { token: string; user: JWTPayload }
    },
    async onLoadDocument({ documentName, context }) {
      const ctx = context as { token: string }
      const parsed = parseRoom(documentName)
      const { body, etag } = await webdavGet(ctx.token, parsed.fileId)
      rooms.set(documentName, {
        fileId: parsed.fileId,
        ct: parsed.ct,
        etag,
        latestToken: ctx.token
      })
      console.log(
        `[hocuspocus] loaded ${documentName} (ct=${parsed.ct}, etag=${etag}, bytes=${body.length})`
      )
      return textToYDoc(body, parsed.ct)
    },
    async onStoreDocument({ documentName, document }) {
      try {
        await flushRoom(documentName, document)
      } catch (err) {
        console.error(`[hocuspocus] store failed for ${documentName}:`, err)
      }
    },
    async onDisconnect({ documentName, document, clientsCount }) {
      if (clientsCount === 0) {
        try {
          await flushRoom(documentName, document)
        } catch (err) {
          console.error(`[hocuspocus] final flush failed for ${documentName}:`, err)
        }
        rooms.delete(documentName)
      }
    }
  })

  await server.listen()
  console.log(`[hocuspocus] listening on :${PORT}`)
}

bootstrap().catch((err) => {
  console.error('[hocuspocus] fatal:', err)
  process.exit(1)
})
