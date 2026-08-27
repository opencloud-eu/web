import { computed, ref, shallowRef, toValue, unref, watch } from 'vue'
import type { MaybeRefOrGetter, Ref, ShallowRef } from 'vue'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import { HocuspocusProvider } from '@hocuspocus/provider'
import type { Resource } from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'
import { useAuthStore, useConfigStore } from '../piniaStores'
import type { YjsAdapter } from './types'

export const YjsStatus = {
  Connecting: 'connecting',
  Connected: 'connected',
  Disconnected: 'disconnected',
  Local: 'local'
} as const

export type YjsStatus = (typeof YjsStatus)[keyof typeof YjsStatus]

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
}

export interface YjsSession {
  ydoc: ShallowRef<Y.Doc | null>
  awareness: ShallowRef<Awareness | null>
  provider: ShallowRef<HocuspocusProvider | null>
  status: ShallowRef<YjsStatus>
  /**
   * False until initial sync and the hydration decision have settled.
   * Consumers gate the editor mount on this to avoid a brief empty-editor
   * flash while hydration runs.
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
}

const META_KEY = '_oc_meta'
const SERIALIZE_DEBOUNCE_MS = 300
/** How long to wait for the Yjs server before running the session locally. */
const CONNECT_TIMEOUT_MS = 10_000
/**
 * Transaction origins this session puts on its own meta writes. The meta
 * observer uses them to tell a peer save (remote update, no string origin)
 * apart from writes the caller already knows about or must not be told about.
 */
const LOCAL_SAVE_ORIGIN = 'local-save'
const STALE_RECOVERY_RESET_ORIGIN = 'stale-recovery-reset'
const STALE_RECOVERY_COMMIT_ORIGIN = 'stale-recovery-commit'
const OWN_META_ORIGINS: unknown[] = [
  LOCAL_SAVE_ORIGIN,
  STALE_RECOVERY_RESET_ORIGIN,
  STALE_RECOVERY_COMMIT_ORIGIN
]
/**
 * Awareness field: whether this client is able to seed an empty room.
 * Read-only clients set it false, so the hydration election can skip them -
 * the Yjs server rejects their writes, so their "win" would leave the room
 * empty for everyone.
 */
const SEED_CAPABLE_KEY = '_oc_canSeed'
/**
 * How long `wasWrittenByRoom` waits for a peer's etag stamp that may still be
 * in flight at conflict time. Only ever paid in full for a genuine external
 * write while peers are present.
 */
const ROOM_ETAG_GRACE_MS = 1_000
const FALLBACK_WEB_VERSION = '0.0.0'

/** The awareness fields this composable sets or reads. */
type AwarenessState = Record<string, unknown> & { [SEED_CAPABLE_KEY]?: boolean }

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
  /** The client elected to run the stale-state recovery. */
  recoveryClientId: number
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
    onEtagChange
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

  /**
   * The native file body captured at the moment etag drift was detected.
   * Recovery must publish exactly this body; reading `currentContent` at
   * recovery time would return the room's own (older) state, which the
   * debounced serialize has reported back by then.
   */
  let staleRecoveryContent: string | null = null

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
   * Claim the stale-state recovery: capture the body it must publish (before
   * the room's own state syncs in and gets reported back into
   * `currentContent`) and name ourselves. Last write wins, so concurrent
   * claims elect exactly one client.
   */
  function claimRecovery(doc: Y.Doc, meta: SessionMetaMap) {
    staleRecoveryContent = toValue(currentContent)
    doc.transact(() => meta.set('recoveryClientId', doc.clientID))
  }

  /**
   * Raise the staleness flag and, unless read-only, claim the recovery. The
   * flag alone would strand the room - later joiners take the `isStale` early
   * return in `runInitialHydration`, and without a claim and a `nativeEtag`
   * to claim against, nothing ever clears it. A read-only client flags
   * without claiming; the `nativeEtag` it leaves lets the first writer
   * holding the same body pick the claim up.
   */
  function flagStale(doc: Y.Doc, meta: SessionMetaMap) {
    const nativeEtag = toValue(resource)?.etag
    // The claim must be complete before `isStale` goes up: raising the flag
    // fires our own meta observer, whose recovery run needs the claim.
    if (!unref(effectiveReadOnly)) claimRecovery(doc, meta)
    doc.transact(() => {
      if (nativeEtag) meta.set('nativeEtag', nativeEtag)
      meta.set('isStale', true)
    })
  }

  /** Whether our freshly fetched etag is the one recovery must settle on. */
  function canSupplyRecoveryContent(meta: SessionMetaMap): boolean {
    const target = meta.get('nativeEtag')
    const ours = toValue(resource)?.etag
    return Boolean(target && ours && target === ours)
  }

  /**
   * Takes a provider out of service for the rest of the session.
   * `disconnect()` alone is not enough: it leaves the provider attached, and
   * the doc's update handler keeps calling `send()`.
   */
  function stopProvider(prov: HocuspocusProvider | null) {
    status.value = YjsStatus.Disconnected
    if (!prov) return
    try {
      prov.disconnect()
      prov.detach()
    } catch {
      // can throw if already torn down; ignore.
    }
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

  // True while recovery rewrites the doc. See `canReportContent`.
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
   * Hydration: the elected client seeds the Y.Doc from native content, lowest
   * awareness clientId wins. In local mode there are no peers, so the
   * election degenerates to "we win unconditionally".
   */
  async function runInitialHydration(
    doc: Y.Doc,
    prov: HocuspocusProvider | null,
    awarenessInstance: Awareness
  ) {
    const current = toValue(adapter)
    const meta = sessionMeta(doc)

    // Already flagged stale: let the meta observer run the recovery, and skip
    // the checks below so we don't race-lock a doc that is about to be
    // rehydrated. The observer only fires on change, so a joiner that finds
    // the flag already up offers itself as claimant - the elected peer may
    // have navigated away before finishing.
    if (meta.get('isStale') === true) {
      if (!unref(effectiveReadOnly) && canSupplyRecoveryContent(meta)) {
        claimRecovery(doc, meta)
        void recoverFromStaleState(doc, prov)
      }
      return
    }

    // Etag drift check. The Yjs server is relay-only and persists nothing, so
    // the room's own `_oc_meta.etag` (seeded by whichever peer entered first)
    // is compared against the etag the caller just fetched: the first peer
    // seeds the baseline, a mismatch means the file on disk moved and flags
    // recovery. `nativeEtag` lets recovery settle the final value without an
    // extra fetch.
    const docEtag = meta.get('etag')
    const nativeEtag = toValue(resource)?.etag
    if (docEtag && nativeEtag && docEtag !== nativeEtag) {
      flagStale(doc, meta)
      return
    }
    if (!docEtag && nativeEtag) {
      doc.transact(() => {
        if (!meta.get('etag')) meta.set('etag', nativeEtag)
      })
    }

    if (current.hasContent(doc)) return

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

    // Election to avoid double-hydration: let peers announce themselves via
    // awareness, then the lowest seed-capable clientId wins. Skipped in local
    // mode, where the announce wait would only delay first paint.
    if (prov) {
      await new Promise<void>((resolve) => setTimeout(resolve, 150))

      if (current.hasContent(doc)) return // someone beat us

      // A peer announced its seeding but its content has not landed yet.
      // `hasContent` is still false at that point.
      if (meta.get('hydrated') === true) return

      // A missing flag counts as seed-capable.
      const myId = doc.clientID
      const peers = Array.from(awarenessInstance.getStates().entries())
        .filter(([, state]) => (state as AwarenessState)?.[SEED_CAPABLE_KEY] !== false)
        .map(([clientId]) => clientId)
      const lowest = peers.length ? Math.min(myId, ...peers) : myId
      if (myId !== lowest) return
    }

    // Announce before seeding, so read-only peers drop their private copy
    // before our content lands rather than merge with it.
    doc.transact(() => meta.set('hydrated', true))
    try {
      current.hydrate(doc, toValue(currentContent))
    } catch (e) {
      // Withdraw the announce so the next joiner can seed for real.
      doc.transact(() => meta.delete('hydrated'))
      throw e
    }
  }

  /**
   * Stale-state recovery, fired when `_oc_meta.isStale` goes up: the claimed
   * client wipes the adapter content, clears the flags and re-hydrates from
   * the body it captured at detection; peers receive the rewrite as ordinary
   * CRDT updates.
   *
   * Only the peer holding the fresh body may run this. Re-seeding from
   * anything else would publish a pre-drift body and stamp the fresh etag
   * onto it, so the next save would overwrite the external writer with a
   * matching `If-Match` and no warning. Unreachable in local mode, but coded
   * provider-tolerant so the two modes share one path.
   */
  async function recoverFromStaleState(doc: Y.Doc, prov: HocuspocusProvider | null) {
    const current = toValue(adapter)
    const meta = sessionMeta(doc)
    if (unref(effectiveReadOnly)) return
    if (staleRecoveryContent === null) return
    if (typeof current.reset !== 'function') {
      lockForReload(
        prov,
        $gettext(
          'This file was changed externally and your editor cannot recover in-place. Please reload.'
        )
      )
      return
    }

    // Let concurrent claims converge, then check we came out on top.
    await new Promise<void>((resolve) => setTimeout(resolve, 150))
    if (meta.get('isStale') !== true) return // someone else handled it
    if (meta.get('recoveryClientId') !== doc.clientID) return

    const content = staleRecoveryContent
    const freshEtag = meta.get('nativeEtag') ?? toValue(resource)?.etag ?? ''

    // Three phases, so a crash between reset and hydrate leaves `isStale` set
    // and the next joiner retries instead of inheriting an empty doc. None of
    // it is a user edit, so none of it is reported as content.
    isRewritingDoc = true
    try {
      doc.transact(() => {
        current.reset?.(doc)
      }, STALE_RECOVERY_RESET_ORIGIN)

      current.hydrate(doc, content)

      doc.transact(() => {
        meta.delete('isStale')
        meta.delete('nativeEtag')
        meta.delete('recoveryClientId')
        if (freshEtag) meta.set('etag', freshEtag)
      }, STALE_RECOVERY_COMMIT_ORIGIN)

      staleRecoveryContent = null
    } catch (e) {
      // The reset already emptied the shared doc for every peer; `isStale`
      // stays up so a later joiner holding the fresh body retries. Lock so
      // nothing autosaves the empty document in the meantime.
      console.error('[yjs] stale-state recovery failed:', e)
      lockForReload(
        prov,
        $gettext('This file was changed externally and recovering it failed. Please reload.')
      )
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
  async function onProviderSynced(
    doc: Y.Doc,
    prov: HocuspocusProvider | null,
    awarenessInstance: Awareness
  ) {
    try {
      await runInitialHydration(doc, prov, awarenessInstance)
    } catch (e) {
      // Call sites fire this without awaiting, so an escaping rejection would
      // leave a half-hydrated document with no explanation.
      console.error('[yjs] hydration failed:', e)
      lockForReload(
        prov,
        $gettext('Preparing this file for collaborative editing failed. Please reload.')
      )
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
    function onDocUpdate() {
      if (!canReportContent()) return
      if (timer !== undefined) window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        timer = undefined
        // Re-checked: the debounce window can outlive the change that opened it.
        if (!canReportContent()) return
        // Vector taken before serializing: adapters may serialize
        // asynchronously, and a peer update landing in between must not be
        // counted as part of what we reported.
        const vectorAtSerialize = Y.encodeStateVector(doc)
        serializeDoc(doc)
          .then((value) => {
            if (value === null) return
            lastReportedStateVector = vectorAtSerialize
            onContentChange(value)
          })
          .catch((e) => console.error('[yjs] serialize for content update failed:', e))
      }, SERIALIZE_DEBOUNCE_MS)
    }
    function cancel() {
      if (timer !== undefined) window.clearTimeout(timer)
    }
    return { onDocUpdate, cancel }
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
        // Surfaced as an error so the user sees the reason rather than a
        // silent disconnect.
        error.value = new Error(reason || $gettext('authentication failed'))
        isLockedForReload.value = true
        clearConnectTimer()

        // Stop retrying: `permissionDeniedHandler` leaves `shouldConnect`
        // true, so the socket layer keeps reconnecting - and a later attempt
        // that authenticates would merge our locally seeded copy into a room
        // already holding the same content.
        stopProvider(prov)

        // Hydrate and release the loading gate, but only for a failed
        // *opening* connect. A token expiring mid-session leaves a live,
        // populated document; re-running the hydration checks there could
        // plant a stale flag with a claim this now read-only client will
        // never act on.
        if (unref(isReady)) return
        void onProviderSynced(doc, null, prov.awareness!)
      },
      onSynced() {
        clearConnectTimer()
        void onProviderSynced(doc, prov, prov.awareness!)
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
      void onProviderSynced(doc, null, prov.awareness!)
    }, CONNECT_TIMEOUT_MS)

    // Announce ourselves before the editor binding emits its first cursor
    // update. The server's beforeHandleAwareness hook overwrites `user` with
    // the authenticated identity.
    prov.setAwarenessField('user', {})
    prov.setAwarenessField(SEED_CAPABLE_KEY, !unref(effectiveReadOnly))

    return { prov, clearConnectTimer }
  }

  /**
   * `_oc_meta` is the side channel for save/stale coordination.
   * Adapters bind to their own shared types and never see it.
   */
  function createMetaObserver(doc: Y.Doc, prov: HocuspocusProvider | null) {
    const meta = sessionMeta(doc)
    return function metaObserver(event: Y.YMapEvent<unknown>, transaction: Y.Transaction) {
      // The initial sync replays the room's whole meta map through this
      // observer; everything in it belongs to `runInitialHydration`, which
      // reads the same keys with the context to act on them.
      const isMidSession = unref(isReady)
      // Remote ops carry no string origin, so this means "a peer is saving
      // right now" - not the initial sync, not one of our own writes.
      const isPeerSave = isMidSession && !OWN_META_ORIGINS.includes(transaction.origin)

      // Peer-save fan-out. The fresh etag keeps our next If-Match correct.
      // The content only follows when the peer's snapshot covers everything
      // we hold; otherwise our dirty flag would drop over edits that never
      // reached the peer's PUT and they could leave with the tab. Re-checked
      // after serializing because a keystroke can land while that runs.
      if (isPeerSave) {
        if (event.keysChanged.has('etag')) {
          const newEtag = meta.get('etag')
          if (newEtag) onEtagChange(newEtag)
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

      // Stale-state signal: every peer sees it, only the claimed one gets
      // past the guards in `recoverFromStaleState`.
      if (event.keysChanged.has('isStale') && meta.get('isStale') === true) {
        void recoverFromStaleState(doc, prov)
      }
    }
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
      isReady.value = false
      hasLocalOnlyContent = false
      staleRecoveryContent = null
      lastReportedStateVector = null
      pendingSaveStateVector = null

      if (!key) {
        status.value = YjsStatus.Connecting
        return
      }
      // Non-null whenever `key` is: the key embeds it.
      const name = unref(documentName)!

      const doc = new Y.Doc()
      const reporter = createContentReporter(doc)
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
        void onProviderSynced(doc, null, aw)
      }

      const meta = sessionMeta(doc)
      const metaObserver = createMetaObserver(doc, prov)
      meta.map.observe(metaObserver)

      ydoc.value = doc
      provider.value = prov
      awareness.value = aw

      onCleanup(() => {
        reporter.cancel()
        clearConnectTimer()
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
      }, LOCAL_SAVE_ORIGIN)
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
    error,
    wasWrittenByRoom,
    beginSave,
    serializeMerged
  }
}
