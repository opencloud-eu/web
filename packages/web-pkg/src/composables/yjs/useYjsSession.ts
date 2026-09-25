import { computed, ref, shallowRef, toValue, unref, watch } from 'vue'
import type { MaybeRefOrGetter, Ref, ShallowRef } from 'vue'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import { HocuspocusProvider } from '@hocuspocus/provider'
import type { Resource } from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'
import { useAuthStore, useConfigStore } from '../piniaStores'
import type { YjsAdapter } from './types'
import { decodeIdentityMessage } from './useYjsCollaborators'

export const YjsStatus = {
  Connecting: 'connecting',
  Connected: 'connected',
  Disconnected: 'disconnected',
  Local: 'local'
} as const

export type YjsStatus = (typeof YjsStatus)[keyof typeof YjsStatus]

/**
 * Whether a session has a transport state worth showing. A session that is local only or has
 * not started yet collaborates with nobody, so there is nothing to report.
 */
export function hasVisibleYjsStatus(status: YjsStatus | null) {
  return status !== null && status !== YjsStatus.Local
}

/**
 * Why the Yjs server refused the handshake. Mirrors `DeniedReason` in
 * `services/yjs/src/server.ts`, keep the two in sync.
 */
export const YjsDeniedReason = {
  TokenInvalid: 'token-invalid',
  AccessDenied: 'access-denied',
  MalformedDocument: 'malformed-document',
  ServerError: 'server-error'
} as const

export type YjsDeniedReason = (typeof YjsDeniedReason)[keyof typeof YjsDeniedReason]

export interface YjsSessionOptions {
  /** The file the session is bound to. Its id forms the room name, its etag drives staleness detection. */
  resource: MaybeRefOrGetter<Resource>
  /** Native file content, used to seed an empty Y.Doc. */
  currentContent: MaybeRefOrGetter<string>
  /**
   * Holds the session back until `currentContent` has been fetched. Starting
   * earlier would hydrate - and publish to every peer - an empty document.
   */
  enabled: MaybeRefOrGetter<boolean>
  /**
   * Read-only clients never seed the shared room and never recover a stale
   * doc. They only hydrate a private copy while the room is empty, see
   * `runInitialHydration`.
   */
  isReadOnly: MaybeRefOrGetter<boolean>
  /** Translates between the native file format and the doc's shared types. */
  adapter: MaybeRefOrGetter<YjsAdapter>
  /**
   * Namespace for the Yjs room. Editor apps with incompatible Y.Doc schemas
   * can open the same file, so they MUST land in separate rooms.
   */
  documentPrefix: MaybeRefOrGetter<string>
  /** The Y.Doc changed through a real edit (local or remote). */
  onContentChange: (content: string) => void
  /** A peer saved: the given content is now what's on disk. */
  onServerContentChange: (content: string) => void
  /** A peer save propagated a fresh etag through the room. */
  onEtagChange: (etag: string) => void
  /** Whether the caller holds edits that are not on disk yet. */
  hasUnsavedChanges: MaybeRefOrGetter<boolean>
  /** The session gave up the room because the file changed outside it. */
  onConflict: () => void
  /** The room has been updated with an external write. Fired once per update. */
  onExternalUpdate?: () => void
}

/** Outcome of {@link YjsSession.applyExternalUpdate}. */
export type ExternalUpdateResult = 'recovered' | 'conflicted' | 'skipped'

export interface YjsSession {
  ydoc: ShallowRef<Y.Doc | null>
  awareness: ShallowRef<Awareness | null>
  provider: ShallowRef<HocuspocusProvider | null>
  status: ShallowRef<YjsStatus>
  /**
   * False until initial sync and the hydration decision have settled. In
   * remote mode that decision is a round trip to the Yjs server. Consumers
   * gate the editor mount on this to avoid a brief empty-editor flash while
   * hydration runs.
   */
  isReady: ShallowRef<boolean>
  /**
   * True after a forced disconnect. The editor
   * should stay mounted with the last-known content but flip read-only, and
   * the user should be asked to reload.
   */
  isLockedForReload: Ref<boolean>
  /** Set when the persisted state was stale or Yjs auth failed. */
  error: ShallowRef<Error | null>
  /**
   * True after the session left the room over an external change it cannot
   * follow without discarding the caller's unsaved work. The Y.Doc stays, so
   * the editor keeps showing that work.
   */
  isConflicted: ShallowRef<boolean>
  /**
   * Give up the room because the file moved outside it. Idempotent, and a
   * no-op in local mode. `notify` off when the caller already surfaced the
   * conflict itself.
   */
  markConflicted: (notify?: boolean) => void
  /**
   * Whether the file now on disk under `etag` was written by this room.
   * A peer's save is already merged into our Y.Doc, so republishing over it
   * loses nothing. A write from anywhere else never entered the room, so
   * overwriting it would destroy content nobody here has seen.
   */
  wasWrittenByRoom: (etag: string, timeoutMs?: number) => Promise<boolean>
  /**
   * Announce that the caller is about to write the content it is holding
   * right now, so the session stamps the matching doc state once the write
   * lands - the doc usually moves on while the PUT is in flight.
   */
  beginSave: () => void
  /**
   * The merged room state, serialized now and registered as what the caller
   * is about to write. Used to retry a conflicted save without dropping the
   * peer edits that caused the conflict.
   */
  serializeMerged: () => Promise<string | null>
  /**
   * Whether a write announced with this etag came from inside the room, i.e.
   * the room's etag stamp already names it. Always false in local mode.
   */
  isRoomWrite: (etag: string) => boolean
  /**
   * Stamp the given etag on the room without claiming a save, so peers keep
   * their dirty state.
   */
  adoptEtag: (etag: string) => void
  /**
   * The file changed outside the room and the caller fetched the new body.
   * Recovers the room from it when nothing is unsaved, otherwise flags the
   * room and conflicts.
   */
  applyExternalUpdate: (update: { content: string; etag: string }) => Promise<ExternalUpdateResult>
}

const META_KEY = '_oc_meta'
const SERIALIZE_DEBOUNCE_MS = 300
/** How long to wait for the Yjs server before running the session locally. */
const CONNECT_TIMEOUT_MS = 10_000
/**
 * How long `wasWrittenByRoom` waits for a peer's etag stamp that may still be
 * in flight at conflict time. Only ever paid in full for a genuine external
 * write while peers are present.
 */
const ROOM_ETAG_GRACE_MS = 1_000
/**
 * Stateless messages through which the Yjs server grants a room-wide job to
 * one client at a time, each followed by the grant key. Must match
 * `GrantMessage` in `services/yjs/src/lib/grants.ts`, keep the two in sync.
 */
const GRANT_REQUEST = '_oc_grant_request:'
const GRANT_GRANTED = '_oc_grant_granted:'
const GRANT_DENIED = '_oc_grant_denied:'
const GRANT_RELEASE = '_oc_grant_release:'
const SEED_GRANT = 'seed'
/**
 * The seed grant's payloads, unchanged since before recovery grants, so every
 * client and server version can seed. Must match `SeedMessage`.
 *
 * TODO: switch to `GRANT_*` and drop these, see https://github.com/opencloud-eu/web/issues/3436
 */
const SEED_REQUEST = '_oc_seed_request'
const SEED_GRANTED = '_oc_seed_granted'
const SEED_DENIED = '_oc_seed_denied'
/**
 * @deprecated How long a recovery grant request waits for an answer. A server
 * from before the recovery grant never answers, see `RECOVERY_ELECTION_MS`.
 */
const RECOVERY_GRANT_TIMEOUT_MS = 5_000
/**
 * @deprecated Fallback for a Yjs server without recovery grants, drop once
 * none is around (v1.0.0). The clients that noticed the write elect one among
 * themselves instead: the last write to `recoveryClientId` wins after this
 * wait. Unlike the grant it can let two recoveries through.
 */
const RECOVERY_ELECTION_MS = 150
function grantRequest(key: string) {
  return key === SEED_GRANT ? SEED_REQUEST : GRANT_REQUEST + key
}
/** Key and verdict of a grant answer, or null for any other payload. */
function parseGrantAnswer(payload: string): { key: string; granted: boolean } | null {
  if (payload === SEED_GRANTED) return { key: SEED_GRANT, granted: true }
  if (payload === SEED_DENIED) return { key: SEED_GRANT, granted: false }
  if (payload.startsWith(GRANT_GRANTED)) {
    return { key: payload.slice(GRANT_GRANTED.length), granted: true }
  }
  if (payload.startsWith(GRANT_DENIED)) {
    return { key: payload.slice(GRANT_DENIED.length), granted: false }
  }
  return null
}
function recoveryGrant(etag: string) {
  return `recover:${etag}`
}
/**
 * How long an SSE-triggered check waits for a peer's etag stamp before it
 * treats the write as external.
 */
export const EXTERNAL_UPDATE_ETAG_GRACE_MS = 2_000
const FALLBACK_WEB_VERSION = '0.0.0'

function resolveWebVersion(): string {
  const version = process.env.PACKAGE_VERSION?.trim()
  return version || FALLBACK_WEB_VERSION
}

export function buildYjsRoomName({
  documentPrefix,
  fileId,
  webVersion
}: {
  documentPrefix?: string
  fileId: string
  webVersion?: string
}): string {
  const version = webVersion?.trim() || FALLBACK_WEB_VERSION
  const versionedFileId = `${fileId}:${version}`
  return documentPrefix ? `${documentPrefix}::${versionedFileId}` : versionedFileId
}

/**
 * The coordination fields this session keeps in the doc's `_oc_meta` map,
 * next to the adapter's shared types.
 */
interface SessionMeta {
  /** Etag of the file on disk, stamped by whichever peer last wrote it. */
  etag: string
  /** The room's state no longer matches the file on disk; triggers recovery. */
  isStale: boolean
  /** Etag of the fresh file body recovery must settle on. */
  nativeEtag: string
  /** @deprecated The client elected to recover, see `RECOVERY_ELECTION_MS`. */
  recoveryClientId: number
  /**
   * Bumped with every `isStale`. Unlike the flag it is never cleared, so a
   * recovery that arrives whole in one merged update still shows as a change.
   */
  recoveryEpoch: number
  /** Doc state behind the last written file, see `lastReportedStateVector`. */
  savedStateVector: Uint8Array
  /** A writer announced it is seeding the room. */
  hydrated: boolean
  /** Timestamp of the last save; doubles as the peer-save signal. */
  lastSavedAt: number
}

/**
 * Typed accessors for {@link SessionMeta}. Values come from peers, so reads
 * of remote-controlled data still need runtime checks where it matters.
 */
function sessionMeta(doc: Y.Doc) {
  const map = doc.getMap(META_KEY)
  return {
    /** The raw Y.Map, for observers. */
    map,
    get<K extends keyof SessionMeta>(key: K) {
      return map.get(key) as SessionMeta[K] | undefined
    },
    set<K extends keyof SessionMeta>(key: K, value: SessionMeta[K]) {
      map.set(key, value)
    },
    delete(key: keyof SessionMeta) {
      map.delete(key)
    }
  }
}
type SessionMetaMap = ReturnType<typeof sessionMeta>

/**
 * Owns a Yjs session for a single file: the Y.Doc, the optional Hocuspocus
 * provider, hydration and stale-state recovery.
 *
 * It knows nothing about editors. The caller mounts whatever editor it likes
 * against the returned `ydoc` / `awareness`, and supplies a {@link YjsAdapter}
 * that translates between the native file format and the doc's shared types.
 */
export function useYjsSession(options: YjsSessionOptions): YjsSession {
  const {
    resource,
    currentContent,
    enabled,
    isReadOnly,
    adapter,
    documentPrefix,
    onContentChange,
    onServerContentChange,
    onEtagChange,
    hasUnsavedChanges,
    onConflict,
    onExternalUpdate
  } = options

  const { $gettext } = useGettext()
  const authStore = useAuthStore()
  const configStore = useConfigStore()

  const sessionNonce = ref(0)
  const ydoc = shallowRef<Y.Doc | null>(null)
  const provider = shallowRef<HocuspocusProvider | null>(null)
  const awareness = shallowRef<Awareness | null>(null)
  const status = shallowRef<YjsStatus>('connecting')
  const isReady = shallowRef(false)
  const isLockedForReload = ref(false)
  const isConflicted = shallowRef(false)
  const error = shallowRef<Error | null>(null)

  const effectiveReadOnly = computed(() => toValue(isReadOnly) || unref(isLockedForReload))

  // Unset `yjsServerUrl` runs every session in local mode: a Y.Doc and
  // Awareness still spin up so the editor binding stays on one codepath, but
  // nothing connects. Public-link visitors stay local too: the Yjs server
  // authenticates user bearer tokens against Graph `/me` and knows nothing
  // about public-link tokens. Vault resources are always local as well: even
  // with a configured server URL, encrypted files must never go collaborative.
  const yjsServerUrl = computed<string | null>(() => {
    if (!configStore.options.yjsServerUrl) return null
    if (!authStore.accessToken) return null
    if (authStore.publicLinkContextReady) return null
    if (toValue(resource)?.isInVault) return null
    return configStore.options.yjsServerUrl
  })

  const documentName = computed(() => {
    // `fileId` is the composite id identical for all peers (a share recipient
    // carries a different `id`). It also serves as the ACL probe target the
    // Yjs server passes to Graph.
    const r = toValue(resource)
    const fileId = r?.fileId ?? r?.id
    if (!fileId) return null
    return buildYjsRoomName({
      documentPrefix: toValue(documentPrefix),
      fileId,
      webVersion: resolveWebVersion()
    })
  })

  // Explicit session key instead of a watchEffect: the caller mutates
  // `resource` after each save (`upsertResource`), and re-running on that
  // would tear down the Y.Doc on every save and lose peer edits.
  const sessionKey = computed(() => {
    const name = unref(documentName)
    if (!name || !toValue(enabled)) return null
    return `${name}::${unref(yjsServerUrl) ?? 'local'}::${unref(sessionNonce)}`
  })

  /**
   * True while this read-only client holds content that only exists in its
   * own browser (see `runInitialHydration`). Merging that private copy with a
   * peer's later seeding would duplicate the document, so the session is
   * rebuilt instead.
   */
  let hasLocalOnlyContent = false

  /** What a recovery publishes: a native file body and the etag it was read under. */
  interface RecoveryPayload {
    content: string
    etag: string
  }

  /**
   * The doc state behind the last content handed to the caller, i.e. what its
   * next PUT writes. Stamped into `_oc_meta.savedStateVector` after that PUT.
   *
   * Encoding the vector at stamping time instead would claim peer edits that
   * merged in during the debounce + PUT round-trip as written when they are
   * not; a peer reading such a stamp drops its dirty flag and can lose the
   * edit with the tab. Erring old just keeps peers dirty and saving again.
   */
  let lastReportedStateVector: Uint8Array | null = null

  /**
   * The content behind `lastReportedStateVector`. Kept so a resync that
   * dropped our unsaved work can be undone, see `undoResyncWipe`.
   */
  let lastReportedContent: string | null = null

  /**
   * `lastReportedStateVector` frozen at the moment the caller began a save,
   * so a report landing while the PUT is in flight cannot move it. See
   * {@link YjsSession.beginSave}.
   */
  let pendingSaveStateVector: Uint8Array | null = null

  /**
   * Whether the peer that published this state vector already held every
   * operation *we* contributed, i.e. "is my work on disk". Only our own
   * client id is compared: a third peer's ops are tracked by that peer's own
   * dirty state, and the saver's vector can never include its own stamping
   * writes.
   */
  function peerSaveCoversUs(doc: Y.Doc, theirs: Uint8Array): boolean {
    const ourClock = Y.decodeStateVector(Y.encodeStateVector(doc)).get(doc.clientID) ?? 0
    const theirView = Y.decodeStateVector(theirs).get(doc.clientID) ?? 0
    return theirView >= ourClock
  }

  /**
   * See {@link YjsSession.wasWrittenByRoom}. `_oc_meta.etag` is the proof:
   * every peer stamps the etag its own PUT produced. A mismatch may just be a
   * stamp still in flight, so with peers around we give it a moment; alone in
   * the room there is nothing to wait for.
   */
  function wasWrittenByRoom(etag: string, timeoutMs = ROOM_ETAG_GRACE_MS): Promise<boolean> {
    const doc = unref(ydoc)
    if (!etag || !doc || doc.isDestroyed || !unref(provider)) return Promise.resolve(false)

    const meta = sessionMeta(doc)
    if (meta.get('etag') === etag) return Promise.resolve(true)

    const states = unref(awareness)?.getStates()
    if (!states || states.size <= 1) return Promise.resolve(false)

    return new Promise<boolean>((resolve) => {
      // `settle` only runs from the observer or the timeout, so `timer` is
      // always initialized by then.
      function settle(result: boolean) {
        window.clearTimeout(timer)
        meta.map.unobserve(onMetaChange)
        resolve(result)
      }
      function onMetaChange(event: Y.YMapEvent<unknown>) {
        if (!event.keysChanged.has('etag')) return
        if (meta.get('etag') === etag) settle(true)
      }
      meta.map.observe(onMetaChange)
      const timer = window.setTimeout(() => settle(false), timeoutMs)
    })
  }

  /**
   * Raise the staleness flag for the file body behind `nativeEtag`. Peers
   * holding unsaved work leave the room on it, see the meta observer.
   */
  function flagStale(doc: Y.Doc, meta: SessionMetaMap, nativeEtag: string) {
    doc.transact(() => {
      meta.set('nativeEtag', nativeEtag)
      meta.set('recoveryEpoch', (meta.get('recoveryEpoch') ?? 0) + 1)
      meta.set('isStale', true)
    })
  }

  /**
   * Takes a provider out of service for the rest of the session.
   * `disconnect()` alone is not enough: it leaves the provider attached, and
   * the doc's update handler keeps calling `send()`.
   */
  function stopProvider(prov: HocuspocusProvider | null) {
    status.value = YjsStatus.Disconnected
    // No answer can arrive any more.
    abandonGrants()
    if (!prov) return
    try {
      prov.disconnect()
      prov.detach()
    } catch {
      // can throw if already torn down; ignore.
    }
  }

  /**
   * See {@link YjsSession.markConflicted}. Keeps the doc so the user can still
   * copy their work out or use "Save As". Deliberately no `error`: the caller
   * owns the conflict message and would otherwise get a second, generic toast.
   */
  function markConflicted(notify = true) {
    if (unref(isConflicted)) return
    // Local mode has no room to leave and no peer that could have written the
    // file. Conflicting would only stop its autosave, which is the single
    // safety net there. `applyExternalUpdate` is the one path that knows
    // better, see there.
    if (unref(status) === YjsStatus.Local) return
    isConflicted.value = true
    const prov = unref(provider)
    if (prov) stopProvider(prov)
    if (notify) onConflict()
  }

  function lockForReload(prov: HocuspocusProvider | null, message: string) {
    if (unref(isLockedForReload)) return
    isLockedForReload.value = true
    error.value = new Error(message)
    stopProvider(prov)
  }

  async function serializeDoc(doc: Y.Doc): Promise<string | null> {
    const current = toValue(adapter)
    if (doc.isDestroyed || !current.hasContent(doc)) return null
    const value = await Promise.resolve(current.serialize(doc))
    if (doc.isDestroyed) return null
    return value
  }

  /** See {@link YjsSession.beginSave}. */
  function beginSave() {
    const doc = unref(ydoc)
    if (!doc || doc.isDestroyed) return
    pendingSaveStateVector = lastReportedStateVector ?? Y.encodeStateVector(doc)
  }

  /** See {@link YjsSession.serializeMerged}. */
  async function serializeMerged(): Promise<string | null> {
    const doc = unref(ydoc)
    if (!doc || doc.isDestroyed) return null
    // Taken before serializing, for the same reason as in the debounced emit.
    const vector = Y.encodeStateVector(doc)
    const value = await serializeDoc(doc)
    if (value === null) return null
    pendingSaveStateVector = vector
    return value
  }

  // True while the session itself writes the live doc (recovery, late seed).
  // See `canReportContent`.
  let isRewritingDoc = false

  /**
   * Whether a Y.Doc change should be reported to the caller as new content.
   *
   * Only real edits qualify. Everything the session itself does - initial
   * sync and hydration (gated via `isReady`), stale recovery (gated via
   * `isRewritingDoc`) - must not be reported: the caller derives its dirty
   * state by comparing reports against the file it fetched, and serialization
   * is not byte-identical to the original (Tiptap renormalises markdown), so
   * reporting would mark an untouched file dirty. Gated on session state
   * rather than transaction origins so adapters need to know nothing.
   */
  function canReportContent(): boolean {
    return unref(isReady) && !isRewritingDoc
  }

  /**
   * Grant requests waiting on the server's answer, by grant key. A pending
   * request also marks a hydration or recovery in flight: they are what waits
   * on it.
   */
  const pendingGrants = new Map<string, (granted: boolean | null) => void>()

  /**
   * Abandon requests that can no longer be answered. Answered as refusals so
   * whatever waits on them unwinds without touching the doc.
   */
  function abandonGrants() {
    for (const resolve of [...pendingGrants.values()]) resolve(false)
  }

  /**
   * Ask the Yjs server whether we may do a job only one client in the room
   * may do. A request already in flight for the same key is ours to finish,
   * so a second one is refused right away. With `timeoutMs`, a request left
   * unanswered resolves to null (deprecated, see `RECOVERY_GRANT_TIMEOUT_MS`).
   */
  function requestGrant(
    prov: HocuspocusProvider,
    key: string,
    timeoutMs?: number
  ): Promise<boolean | null> {
    if (pendingGrants.has(key)) return Promise.resolve(false)
    return new Promise<boolean | null>((resolve) => {
      const timer =
        timeoutMs === undefined
          ? undefined
          : window.setTimeout(() => pendingGrants.get(key)?.(null), timeoutMs)
      pendingGrants.set(key, (granted) => {
        window.clearTimeout(timer)
        pendingGrants.delete(key)
        resolve(granted)
      })
      prov.sendStateless(grantRequest(key))
    })
  }

  /**
   * Give a granted job back without doing it, so the next writer that asks
   * does not wait for our disconnect or the server's lease. Only for jobs that
   * left the doc untouched: the server frees a done one itself, once it has
   * the result.
   */
  function releaseGrant(prov: HocuspocusProvider, key: string) {
    prov.sendStateless(GRANT_RELEASE + key)
  }

  /**
   * The server's answer to a grant request, or an unsolicited seed grant when
   * the previous holder left the room without seeding it.
   */
  function onGrantMessage(doc: Y.Doc, prov: HocuspocusProvider, payload: string) {
    const answer = parseGrantAnswer(payload)
    if (!answer) return
    const { key, granted } = answer
    const pending = pendingGrants.get(key)
    if (pending) {
      pending(granted)
      return
    }
    if (granted && key === SEED_GRANT) seedOnUnsolicitedGrant(doc, prov)
  }

  /**
   * Write the initial body, and announce it so a read-only peer can drop the
   * private copy it hydrated while the room was still empty.
   */
  function seedDoc(doc: Y.Doc, current: YjsAdapter, meta: SessionMetaMap) {
    try {
      // Announce and body in one transaction, so a read-only peer sees the
      // announce and the body together. Its meta observer then rebuilds the
      // session from the room's state and cancels the pending report, so the
      // merged private copy is never shown for long or reported.
      doc.transact(() => {
        meta.set('hydrated', true)
        current.hydrate(doc, toValue(currentContent))
      })
    } catch (e) {
      // Withdraw the announce, or a read-only peer waits forever for a body
      // that is never coming.
      doc.transact(() => meta.delete('hydrated'))
      throw e
    }
  }

  /** Hydration threw. Lock rather than mount an editable empty doc. */
  function failHydration(prov: HocuspocusProvider | null, e: unknown) {
    console.error('[yjs] hydration failed:', e)
    lockForReload(
      prov,
      $gettext('Preparing this file for collaborative editing failed. Please reload.')
    )
  }

  /**
   * A grant that arrived on its own, because the previous holder left the room
   * without seeding it. The grant is permission, not an instruction, so every
   * reason not to seed is re-checked here.
   */
  function seedOnUnsolicitedGrant(doc: Y.Doc, prov: HocuspocusProvider) {
    if (doc.isDestroyed || unref(ydoc) !== doc) return
    // Not synced yet: the room's content may still be on the way. Hydration
    // asks for its own grant once it runs, and the server answers the holder
    // with another grant.
    if (!unref(isReady)) return
    if (unref(effectiveReadOnly)) return
    const current = toValue(adapter)
    if (current.hasContent(doc)) return
    // The session is live, so the seed must not be reported as an edit.
    isRewritingDoc = true
    try {
      seedDoc(doc, current, sessionMeta(doc))
      lastReportedStateVector = Y.encodeStateVector(doc)
    } catch (e) {
      failHydration(prov, e)
    } finally {
      isRewritingDoc = false
    }
  }

  /**
   * Hydration: one client per room seeds the Y.Doc from native content, and
   * the Yjs server picks which - see `requestGrant`. In local mode there
   * is no room, so no permission is needed.
   */
  async function runInitialHydration(doc: Y.Doc, prov: HocuspocusProvider | null) {
    const current = toValue(adapter)
    const meta = sessionMeta(doc)

    // The body recovery must publish, captured now: once the room's own state
    // syncs in, it gets reported back into `currentContent`.
    const nativeEtag = toValue(resource)?.etag
    const content = toValue(currentContent)

    // Flagged stale, or etag drift. The Yjs server is relay-only and persists
    // nothing, so the room's own `_oc_meta.etag` (seeded by whichever peer
    // entered first) is compared against the etag the caller just fetched: a
    // mismatch means the file on disk moved. A flag may be left by a peer
    // that navigated away before finishing, so joiners retry it.
    const docEtag = meta.get('etag')
    if (meta.get('isStale') === true || (docEtag && nativeEtag && docEtag !== nativeEtag)) {
      if (unref(effectiveReadOnly)) return
      const recovered =
        !!nativeEtag &&
        nativeEtag !== docEtag &&
        (await recoverFromStaleState(doc, prov, { content, etag: nativeEtag }))
      if (!recovered) adoptRoomEtag(doc, meta)
      return
    }
    if (!docEtag && nativeEtag) {
      doc.transact(() => {
        if (!meta.get('etag')) meta.set('etag', nativeEtag)
      })
    }

    if (current.hasContent(doc)) return

    // Seeding is a first-entry decision. Mid-session this is a reconnect, and
    // an empty doc here is one the user emptied - the room takes it as is.
    if (unref(isReady)) return

    // Read-only client in an empty room: hydrate a private copy so the file
    // is not shown blank. It never reaches the room (the server rejects
    // read-only writes); `hasLocalOnlyContent` lets the meta observer drop it
    // again the moment a peer starts seeding for real.
    if (unref(effectiveReadOnly)) {
      // A peer already announced its seeding; its content is on the way.
      if (meta.get('hydrated') === true) return
      hasLocalOnlyContent = true
      current.hydrate(doc, toValue(currentContent))
      hasLocalOnlyContent = current.hasContent(doc)
      return
    }

    // Let the server pick who seeds. Skipped in local mode.
    if (prov) {
      if (!(await requestGrant(prov, SEED_GRANT))) return
      // Content may have landed while we waited.
      if (current.hasContent(doc)) return
    }

    seedDoc(doc, current, meta)
  }

  /**
   * A writer joined a room that is behind the file on disk and did not
   * rewrite it. The caller still holds the fresh etag, so its next save would
   * put the room's old content over the external write with a matching
   * `If-Match`. The room's etag makes that save conflict instead; the rewrite
   * brings the fresh one along if it still comes.
   */
  function adoptRoomEtag(doc: Y.Doc, meta: SessionMetaMap) {
    if (doc.isDestroyed || unref(ydoc) !== doc) return
    const roomEtag = meta.get('etag')
    if (roomEtag) onEtagChange(roomEtag)
  }

  /**
   * @deprecated Recovery arbitration for a Yjs server that never answers the
   * recovery grant request, see `RECOVERY_ELECTION_MS`.
   */
  async function winRecoveryElection(doc: Y.Doc, meta: SessionMetaMap) {
    doc.transact(() => meta.set('recoveryClientId', doc.clientID))
    await new Promise((resolve) => window.setTimeout(resolve, RECOVERY_ELECTION_MS))
    return meta.get('recoveryClientId') === doc.clientID
  }

  /**
   * Stale-state recovery: rewrite the room from a fresh file body. The Yjs
   * server grants it to one client at a time, so peers that noticed the same
   * write, or back-to-back writes, never re-seed the room twice at once. A
   * refused peer with a newer body leaves it to the winner, which hears the
   * newer write too and recovers again. The winner raises `isStale`, wipes
   * the adapter content, re-hydrates and clears the flags; peers receive all
   * of it as ordinary CRDT updates, the flag first.
   *
   * Only a client holding the body behind `etag` may run this. Re-seeding
   * from anything else would publish a pre-drift body and stamp the fresh
   * etag onto it, so the next save would overwrite the external writer with
   * a matching `If-Match` and no warning.
   *
   * True when this run rewrote the room.
   */
  async function recoverFromStaleState(
    doc: Y.Doc,
    prov: HocuspocusProvider | null,
    { content, etag }: RecoveryPayload
  ): Promise<boolean> {
    const current = toValue(adapter)
    const meta = sessionMeta(doc)
    if (typeof current.reset !== 'function') {
      lockForReload(
        prov,
        $gettext(
          'This file was changed externally and your editor cannot recover in-place. Please reload.'
        )
      )
      return false
    }

    const grant = recoveryGrant(etag)
    let isServerGrant = false
    if (prov) {
      const answer = await requestGrant(prov, grant, RECOVERY_GRANT_TIMEOUT_MS)
      isServerGrant = answer === true
      const granted = answer ?? (await winRecoveryElection(doc, meta))
      if (!granted) return false
    }
    function giveUp() {
      if (isServerGrant && prov) releaseGrant(prov, grant)
      return false
    }
    // The rewrite would wipe what was typed while waiting for the grant.
    if (unref(isReady)) await activeReporter?.flush()
    if (doc.isDestroyed || unref(ydoc) !== doc) return giveUp()
    if (unref(effectiveReadOnly) || unref(isConflicted)) return giveUp()
    // The rewrite for this etag already landed.
    if (meta.get('etag') === etag) return giveUp()
    if (unref(isReady) && toValue(hasUnsavedChanges)) {
      flagStale(doc, meta, etag)
      markConflicted()
      return false
    }

    // Flag, reset + hydrate and commit run in one go, as separate updates:
    // dirty peers leave the room on the flag before the rewrite reaches them.
    flagStale(doc, meta, etag)

    // Reset and hydrate share one transaction: mounted editors must never
    // observe the emptied doc, or ProseMirror pads it with an empty paragraph
    // that survives the re-seed. A crash inside still commits the reset and
    // leaves `isStale` set, so the next joiner retries instead of inheriting
    // an empty doc. None of it is a user edit, so none of it is reported as
    // content.
    isRewritingDoc = true
    try {
      doc.transact(() => {
        current.reset?.(doc)
        current.hydrate(doc, content)
      })

      doc.transact(() => {
        meta.delete('isStale')
        meta.delete('nativeEtag')
        // Deprecated, see `RECOVERY_ELECTION_MS`.
        meta.delete('recoveryClientId')
        meta.set('etag', etag)
        // The recovered body is what is on disk now, so clean peers take the
        // ordinary peer-save fan-out and stop counting it as unsaved work.
        meta.set('savedStateVector', Y.encodeStateVector(doc))
        meta.set('lastSavedAt', Date.now())
      })

      return true
    } catch (e) {
      // The reset already emptied the shared doc for every peer; `isStale`
      // stays up so a later joiner holding the fresh body retries. Lock so
      // nothing autosaves the empty document in the meantime.
      console.error('[yjs] stale-state recovery failed:', e)
      lockForReload(
        prov,
        $gettext('This file was changed externally and recovering it failed. Please reload.')
      )
      return false
    } finally {
      isRewritingDoc = false
    }
  }

  /**
   * Single entry point for both modes (remote `onSynced` and the immediate
   * local-mode call): flips `isReady` once the hydration decision has
   * settled, so the editor mount is gated on one signal. The
   * `ydoc.value === doc` guard keeps a stale invocation from clearing the
   * loading state of the next session.
   */
  async function onProviderSynced(doc: Y.Doc, prov: HocuspocusProvider | null) {
    try {
      await runInitialHydration(doc, prov)
    } catch (e) {
      // Call sites fire this without awaiting, so an escaping rejection would
      // leave a half-hydrated document with no explanation.
      failHydration(prov, e)
    } finally {
      if (!doc.isDestroyed && unref(ydoc) === doc) {
        // Baseline for a save before any edit: the hydrated doc is the same
        // body the caller fetched and would PUT.
        lastReportedStateVector = Y.encodeStateVector(doc)
        isReady.value = true
      }
    }
  }

  /**
   * Debounced serialize -> report: the caller diffs the reported string
   * against its own server content to derive a dirty state.
   */
  function createContentReporter(doc: Y.Doc) {
    let timer: number | undefined
    let inFlight: Promise<void> | null = null
    function serialize(): Promise<void> {
      if (doc.isDestroyed) return Promise.resolve()
      // Vector taken before serializing: adapters may serialize
      // asynchronously, and a peer update landing in between must not be
      // counted as part of what we reported.
      const vectorAtSerialize = Y.encodeStateVector(doc)
      return serializeDoc(doc).then((value) => {
        if (value === null) return
        lastReportedStateVector = vectorAtSerialize
        lastReportedContent = value
        onContentChange(value)
      })
    }
    function report(): Promise<void> {
      // Re-checked: the debounce window can outlive the change that opened it.
      if (!canReportContent()) return Promise.resolve()
      // Chained onto a running report: two concurrent serializations could
      // settle out of order, and the older one would then win.
      const previous = inFlight
      const run: Promise<void> = (previous ? previous.then(serialize) : serialize())
        .catch((e) => console.error('[yjs] serialize for content update failed:', e))
        .finally(() => {
          if (inFlight === run) inFlight = null
        })
      inFlight = run
      return run
    }
    function onDocUpdate() {
      if (!canReportContent()) return
      if (timer !== undefined) window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        timer = undefined
        void report()
      }, SERIALIZE_DEBOUNCE_MS)
    }
    /**
     * Run a pending report now. The caller's dirty state lags the doc by the
     * debounce, and a decision about unsaved work must not miss a keystroke
     * from inside that window. A doc with no pending report stays untouched.
     */
    function flush(): Promise<void> {
      if (timer === undefined) return inFlight ?? Promise.resolve()
      window.clearTimeout(timer)
      timer = undefined
      return report()
    }
    function cancel() {
      if (timer !== undefined) window.clearTimeout(timer)
      timer = undefined
    }
    return { onDocUpdate, flush, cancel }
  }
  type ContentReporter = ReturnType<typeof createContentReporter>

  /** The reporter of the live session, for code outside the session watch. */
  let activeReporter: ContentReporter | null = null

  /** The user-facing side of a refused handshake. */
  function deniedMessage(reason: string): string {
    switch (reason) {
      case YjsDeniedReason.TokenInvalid:
        return $gettext(
          'Your session expired and collaborative editing stopped. Reload the page to collaborate again.'
        )
      case YjsDeniedReason.AccessDenied:
        return $gettext('Collaborative editing is not available for this file.')
      default:
        return $gettext(
          'The collaboration server refused the connection. Editing continues without collaboration.'
        )
    }
  }

  /** Connects a Hocuspocus provider and arms the connect timeout. */
  function connectRemote(doc: Y.Doc, name: string, serverUrl: string) {
    let connectTimer: number | undefined
    function clearConnectTimer() {
      if (connectTimer !== undefined) window.clearTimeout(connectTimer)
      connectTimer = undefined
    }

    const prov: HocuspocusProvider = new HocuspocusProvider({
      url: serverUrl,
      name,
      document: doc,
      token: () => authStore.accessToken,
      onStatus({ status: s }) {
        status.value = s as YjsStatus
      },
      onAuthenticationFailed({ reason }) {
        console.error('[yjs] auth failed:', reason)
        clearConnectTimer()
        error.value = new Error(deniedMessage(reason))

        // Stop retrying: `permissionDeniedHandler` leaves `shouldConnect`
        // true, so the socket layer keeps reconnecting - and a later attempt
        // that authenticates would merge our locally seeded copy into a room
        // already holding the same content.
        stopProvider(prov)

        // Hydrate and release the loading gate, but only for a failed
        // *opening* connect. Mid-session the document is already live and
        // populated; re-running the hydration checks there could plant a
        // stale flag against a room this client has just left.
        if (unref(isReady)) return
        void onProviderSynced(doc, null)
      },
      onStateless({ payload }) {
        const identity = decodeIdentityMessage(payload)
        if (identity) {
          // The server never echoes our own awareness back to us, so we receive
          // it via a stateless identity message instead.
          prov.setAwarenessField('user', identity)
          return
        }
        onGrantMessage(doc, prov, payload)
      },
      onSynced() {
        clearConnectTimer()
        // Answers to the old socket are lost, so ask again on this one.
        for (const key of pendingGrants.keys()) prov.sendStateless(grantRequest(key))
        // Reconnected while a hydration or recovery waits on the server:
        // don't start a second one next to it.
        if (pendingGrants.size > 0) return
        void onProviderSynced(doc, prov)
      }
    })

    // A server that never answers produces neither `onSynced` nor
    // `onAuthenticationFailed` - the provider just keeps retrying, and the
    // loading screen would stay up forever. Give up after a bounded wait and
    // carry on locally: the file stays editable and saveable, it just does
    // not sync.
    connectTimer = window.setTimeout(() => {
      connectTimer = undefined
      if (doc.isDestroyed || unref(ydoc) !== doc || unref(isReady)) return

      console.error(`[yjs] server unreachable, continuing without it: ${name}`)
      error.value = new Error(
        $gettext(
          'The collaboration server could not be reached. Editing continues without collaboration; others will not see your changes until you reload.'
        )
      )
      // Stop retrying: a later connect would merge our locally hydrated copy
      // into a room that may already hold the same content.
      stopProvider(prov)
      // `runInitialHydration` bails if content synced in after all.
      void onProviderSynced(doc, null)
    }, CONNECT_TIMEOUT_MS)

    // Announce ourselves before the editor binding emits its first cursor
    // update. The server's beforeHandleAwareness hook overwrites `user` with
    // the authenticated identity.
    prov.setAwarenessField('user', {})

    return { prov, clearConnectTimer }
  }

  /**
   * A recovery may have deleted our unsaved work if it ran while we were offline.
   * Leave the room and re-seed the doc from the last content we reported.
   */
  function undoResyncWipe(doc: Y.Doc, prov: HocuspocusProvider | null, reporter: ContentReporter) {
    const content = lastReportedContent
    const current = toValue(adapter)

    // The doc holds the rewritten body from here on, and it must never reach
    // the caller as our own content - the next save would put it on disk.
    isRewritingDoc = true
    reporter.cancel()

    if (content === null || typeof current.reset !== 'function') {
      // No conflict toast, there are no changes to be copied - they're gone.
      markConflicted(false)
      console.error('[yjs] the room discarded unsaved work that cannot be restored')
      lockForReload(
        prov,
        $gettext(
          'This file was changed externally and your unsaved changes could not be restored. Please reload.'
        )
      )
      return
    }

    markConflicted()

    // Deferred: Yjs is still cleaning up the transaction this reacts to.
    // `markConflicted` stopped the provider, so nothing else touches the doc
    // in between.
    queueMicrotask(() => {
      if (doc.isDestroyed) return
      try {
        doc.transact(() => {
          current.reset?.(doc)
          current.hydrate(doc, content)
        })
        isRewritingDoc = false
      } catch (e) {
        // `reset` already committed, so the doc may be empty. Keep the rewrite
        // flag up and lock: nothing may report or autosave what is left.
        console.error('[yjs] restoring unsaved work after a resync failed:', e)
        lockForReload(
          prov,
          $gettext(
            'This file was changed externally and restoring your unsaved changes failed. Please reload.'
          )
        )
      }
    })
  }

  /**
   * `_oc_meta` is the side channel for save/stale/version coordination.
   * Adapters bind to their own shared types and never see it.
   */
  function createMetaObserver(
    doc: Y.Doc,
    prov: HocuspocusProvider | null,
    reporter: ContentReporter
  ) {
    const meta = sessionMeta(doc)
    return function metaObserver(event: Y.YMapEvent<unknown>, transaction: Y.Transaction) {
      // "A peer is acting right now". Our own writes are acted on where they
      // are made. The initial sync replays the room's whole meta map through
      // this observer; everything in it belongs to `runInitialHydration`,
      // which reads the same keys with the context to act on them.
      const isRemoteMetaWrite = unref(isReady) && !transaction.local
      // Handled further down, but needed here to keep the fan-out out of it.
      const resyncWouldDropOurWork =
        event.keysChanged.has('recoveryEpoch') && isRemoteMetaWrite && toValue(hasUnsavedChanges)

      // Peer-save fan-out. The fresh etag keeps our next If-Match correct.
      // The content only follows when the peer's snapshot covers everything
      // we hold; otherwise our dirty flag would drop over edits that never
      // reached the peer's PUT and they could leave with the tab. Re-checked
      // after serializing because a keystroke can land while that runs.
      // Not on a recovery that costs us our work: the rewriting peer's etag
      // would make our next If-Match match, so a manual save would overwrite
      // the body they just put on disk.
      if (isRemoteMetaWrite && !resyncWouldDropOurWork) {
        if (event.keysChanged.has('etag')) {
          const newEtag = meta.get('etag')
          if (newEtag) onEtagChange(newEtag)
        }
        // A peer's recovery commit: the flag goes down with the etag it
        // settled on. Only now does this doc show the external write.
        if (
          event.keysChanged.has('isStale') &&
          meta.get('isStale') !== true &&
          event.keysChanged.has('etag') &&
          !unref(isConflicted)
        ) {
          onExternalUpdate?.()
        }
        if (event.keysChanged.has('lastSavedAt')) {
          const theirState = meta.get('savedStateVector')
          if (theirState instanceof Uint8Array) {
            serializeDoc(doc)
              .then((value) => {
                if (value === null || doc.isDestroyed) return
                if (!peerSaveCoversUs(doc, theirState)) return
                onServerContentChange(value)
              })
              .catch((e) => console.error('[yjs] serialize for peer-save sync failed:', e))
          }
        }
      }

      // A peer is seeding while we hold a private read-only copy; merging
      // would duplicate the document, so rebuild the session from the room's
      // state. Nothing is lost: a read-only client has no edits.
      if (
        event.keysChanged.has('hydrated') &&
        meta.get('hydrated') === true &&
        hasLocalOnlyContent
      ) {
        sessionNonce.value++
        return
      }

      // A peer wipes and re-seeds the room. Following that would silently
      // drop our unsaved edits, so leave the room and keep our own doc.
      if (resyncWouldDropOurWork) {
        if (meta.get('isStale') === true) {
          // The flag came ahead of the rewrite, our doc is untouched.
          markConflicted()
        } else {
          // Recovery already ran, our unsaved edits are gone. Attempt to restore them.
          undoResyncWipe(doc, prov, reporter)
        }
        return
      }

      if (isRemoteMetaWrite && event.keysChanged.has('isStale') && meta.get('isStale') === true) {
        void onRemoteStaleFlag(doc, meta, reporter)
      }
    }
  }

  /**
   * A peer raised `isStale` mid-session. Either a keystroke inside the
   * debounce window made us dirty after all, so we conflict like the dirty
   * peers did at flag time, or we are clean and follow the rewrite
   * (`onExternalUpdate` fires when it lands).
   */
  async function onRemoteStaleFlag(doc: Y.Doc, meta: SessionMetaMap, reporter: ContentReporter) {
    await reporter.flush()
    if (doc.isDestroyed || unref(ydoc) !== doc) return
    if (meta.get('isStale') !== true) return
    if (unref(isConflicted) || unref(isLockedForReload)) return
    if (toValue(hasUnsavedChanges)) markConflicted()
  }

  /** See {@link YjsSession.isRoomWrite}. */
  function isRoomWrite(etag: string) {
    const doc = unref(ydoc)
    if (!doc || doc.isDestroyed || !unref(provider)) return false
    return Boolean(etag) && sessionMeta(doc).get('etag') === etag
  }

  /** See {@link YjsSession.adoptEtag}. */
  function adoptEtag(etag: string) {
    const doc = unref(ydoc)
    if (doc && !doc.isDestroyed) {
      const meta = sessionMeta(doc)
      // No `lastSavedAt`: this is not a save, peers must keep their dirty
      // state. The caller's etag mirror then finds the stamp in place and
      // does not claim one either.
      if (meta.get('etag') !== etag) {
        doc.transact(() => meta.set('etag', etag))
      }
    }
    onEtagChange(etag)
  }

  /**
   * The rewrite suppressed the content reporter and the meta observer ignores
   * our own writes, so nothing else tells the caller that its content, server
   * content and etag all moved. Reports the serialized form: the next
   * debounced report produces the same string, so the file stays clean.
   */
  async function reportRecovered(doc: Y.Doc, etag: string) {
    const value = await serializeDoc(doc)
    if (value === null || doc.isDestroyed || unref(ydoc) !== doc) return
    lastReportedStateVector = Y.encodeStateVector(doc)
    lastReportedContent = value
    onContentChange(value)
    onServerContentChange(value)
    onEtagChange(etag)
  }

  /** See {@link YjsSession.applyExternalUpdate}. */
  async function applyExternalUpdate({
    content,
    etag
  }: {
    content: string
    etag: string
  }): Promise<ExternalUpdateResult> {
    const doc = unref(ydoc)
    const prov = unref(provider)
    if (!doc || doc.isDestroyed || !unref(isReady) || !etag) return 'skipped'
    if (unref(effectiveReadOnly) || unref(isConflicted) || unref(isLockedForReload)) {
      return 'skipped'
    }
    const meta = sessionMeta(doc)
    if (meta.get('etag') === etag) return 'skipped'

    await activeReporter?.flush()
    if (doc.isDestroyed || unref(ydoc) !== doc) return 'skipped'

    if (toValue(hasUnsavedChanges)) {
      if (!prov) {
        // Local mode keeps autosaving through `markConflicted` on purpose, but
        // here the autosave would only hit 412 over the same write every
        // interval, so stop it.
        isConflicted.value = true
        onConflict()
        return 'conflicted'
      }
      // Flag only, our doc is nothing safe to re-seed with: dirty peers
      // conflict on the flag, clean peers recover from their own fetch, late
      // joiners from theirs.
      flagStale(doc, meta, etag)
      markConflicted()
      return 'conflicted'
    }

    // Every clean writer that got the event gets here, the server lets one
    // of them through.
    const recovered = await recoverFromStaleState(doc, prov, { content, etag })
    if (!recovered) return unref(isConflicted) ? 'conflicted' : 'skipped'
    await reportRecovered(doc, etag)
    onExternalUpdate?.()
    return 'recovered'
  }

  /**
   * Y.Doc + (optional) provider lifecycle, rebuilt whenever the session key
   * changes. Remote mode connects a Hocuspocus provider and hydrates on
   * `onSynced`; local mode uses a standalone Awareness, no network, and
   * hydrates immediately. The editor sees the same interface either way.
   */
  watch(
    sessionKey,
    (key, _oldKey, onCleanup) => {
      // Reset per-session state before the bail-outs: a leftover `isReady`
      // would drop the loading screen while `ydoc` is already null.
      error.value = null
      isLockedForReload.value = false
      isConflicted.value = false
      isReady.value = false
      hasLocalOnlyContent = false
      // `undoResyncWipe` leaves this up for good when it cannot restore.
      isRewritingDoc = false
      lastReportedStateVector = null
      lastReportedContent = null
      pendingSaveStateVector = null

      if (!key) {
        status.value = YjsStatus.Connecting
        return
      }
      // Non-null whenever `key` is: the key embeds it.
      const name = unref(documentName)!

      const doc = new Y.Doc()
      const reporter = createContentReporter(doc)
      activeReporter = reporter
      doc.on('update', reporter.onDocUpdate)

      let prov: HocuspocusProvider | null = null
      let aw: Awareness
      let clearConnectTimer = () => {}

      const resolvedYjsUrl = unref(yjsServerUrl)
      if (resolvedYjsUrl) {
        const remote = connectRemote(doc, name, resolvedYjsUrl)
        prov = remote.prov
        aw = remote.prov.awareness!
        clearConnectTimer = remote.clearConnectTimer
      } else {
        // Local mode: standalone Awareness so editor bindings still see a
        // non-null instance; nobody else will ever join, which is the point.
        aw = new Awareness(doc)
        status.value = YjsStatus.Local
        void onProviderSynced(doc, null)
      }

      const meta = sessionMeta(doc)
      const metaObserver = createMetaObserver(doc, prov, reporter)
      meta.map.observe(metaObserver)

      ydoc.value = doc
      provider.value = prov
      awareness.value = aw

      onCleanup(() => {
        reporter.cancel()
        if (activeReporter === reporter) activeReporter = null
        clearConnectTimer()
        abandonGrants()
        meta.map.unobserve(metaObserver)
        doc.off('update', reporter.onDocUpdate)
        if (prov) {
          // Destroys its own awareness (`aw` in remote mode), so no separate
          // aw.destroy() here.
          prov.destroy()
        } else {
          aw.destroy()
        }
        doc.destroy()
        if (unref(provider) === prov) provider.value = null
        if (unref(awareness) === aw) awareness.value = null
        if (unref(ydoc) === doc) ydoc.value = null
      })
    },
    { immediate: true }
  )

  // The caller updates `resource` after each of its own saves. Mirror the new
  // etag into `_oc_meta.etag` so peers learn that the file on disk moved.
  watch(
    () => toValue(resource)?.etag,
    (newEtag) => {
      const doc = unref(ydoc)
      if (!doc || doc.isDestroyed || !newEtag) return
      const meta = sessionMeta(doc)
      if (meta.get('etag') === newEtag) return
      doc.transact(() => {
        meta.set('etag', newEtag)
        // What our doc contained when the file was written; peers use it to
        // tell "this save covers me" from "this save predates my edits". See
        // `lastReportedStateVector` for why it is not encoded here.
        meta.set(
          'savedStateVector',
          pendingSaveStateVector ?? lastReportedStateVector ?? Y.encodeStateVector(doc)
        )
        meta.set('lastSavedAt', Date.now())
      })
      // Consumed. An etag change the caller did not announce falls back to
      // the last reported state again.
      pendingSaveStateVector = null
    }
  )

  return {
    ydoc,
    awareness,
    provider,
    status,
    isReady,
    isLockedForReload,
    isConflicted,
    markConflicted,
    error,
    wasWrittenByRoom,
    beginSave,
    serializeMerged,
    isRoomWrite,
    adoptEtag,
    applyExternalUpdate
  }
}
