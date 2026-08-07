import { computed, ref, shallowRef, toValue, unref, watch } from 'vue'
import type { MaybeRefOrGetter, Ref, ShallowRef } from 'vue'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import { HocuspocusProvider } from '@hocuspocus/provider'
import semverCompare from 'semver/functions/compare'
import semverValid from 'semver/functions/valid'
import type { Resource } from '@opencloud-eu/web-client'
import { useAuthStore, useConfigStore } from '../piniaStores'
import type { CollaborativeAdapter } from './types'

export type CollaborativeStatus = 'connecting' | 'connected' | 'disconnected' | 'local'

export interface CollaborativeDocumentOptions {
  /** The file the session is bound to. Its id forms the room name, its etag drives staleness detection. */
  resource: MaybeRefOrGetter<Resource>
  /** Native file content, used to seed an empty Y.Doc. */
  currentContent: MaybeRefOrGetter<string>
  /**
   * Holds the session back until the caller is ready. Hydration seeds the doc
   * from `currentContent`, so starting before that has been fetched would
   * publish an empty document to every peer.
   */
  enabled: MaybeRefOrGetter<boolean>
  /**
   * Read-only clients never seed the shared room and never recover a stale
   * doc. They do hydrate a private copy while the room is empty, see
   * `runInitialHydration`.
   */
  isReadOnly: MaybeRefOrGetter<boolean>
  /** Translates between the native file format and the doc's shared types. */
  adapter: MaybeRefOrGetter<CollaborativeAdapter>
  /**
   * App version owned by the consuming app; typically `pkg.version` from its
   * own package.json, baked in at build time by Vite. Used to detect schema
   * mismatch between peers in the same Y.Doc room.
   */
  appVersion: MaybeRefOrGetter<string>
  /**
   * Namespace for the collab room. Different editor apps that can open the
   * same file have incompatible Y.Doc schemas (Y.Text vs Y.XmlFragment with
   * different extensions), so they MUST land in separate rooms.
   */
  documentPrefix: MaybeRefOrGetter<string>
  /** The Y.Doc changed through a real edit (local or remote). */
  onContentChange: (content: string) => void
  /** A peer saved: the given content is now what's on disk. */
  onServerContentChange: (content: string) => void
  /** A peer save propagated a fresh etag through the room. */
  onEtagChange: (etag: string) => void
}

export interface CollaborativeDocument {
  ydoc: ShallowRef<Y.Doc | null>
  awareness: ShallowRef<Awareness | null>
  provider: ShallowRef<HocuspocusProvider | null>
  status: ShallowRef<CollaborativeStatus>
  /**
   * False until the Y.Doc is ready to be shown: initial sync completed and
   * the hydration decision has settled. Consumers gate the editor mount on
   * this to avoid a brief empty-editor flash while hydration runs.
   */
  isReady: ShallowRef<boolean>
  /**
   * True after a forced disconnect because of an app-version mismatch. The
   * editor should stay mounted with the last-known content but flip
   * read-only, and the user should be asked to reload.
   */
  isLockedForReload: Ref<boolean>
  /** Set when the persisted state was stale or realtime auth failed. */
  error: ShallowRef<Error | null>
}

const META_KEY = '_oc_meta'
const SERIALIZE_DEBOUNCE_MS = 300
/**
 * How long to wait for the realtime server before giving up on it and running
 * the session locally. Generous enough to ride out a slow connect, short
 * enough that a misconfigured or down sidecar does not read as a hung editor.
 */
const CONNECT_TIMEOUT_MS = 10_000
/**
 * Tag we put on our own meta-write so the meta observer can tell a local save
 * (the etag mirror firing) apart from a peer save (a CRDT update from another
 * client). Peer saves get the `onServerContentChange` fan-out; local saves
 * don't need it because the caller already knows it saved.
 */
const LOCAL_SAVE_ORIGIN = 'local-save'

/**
 * Semver comparison via the official `semver` package: handles pre-release
 * ordering (`1.0.0-rc.1 < 1.0.0`), multi-digit segments (`0.20.0 > 0.3.0`),
 * build metadata, etc. Returns negative when `a < b`, positive when `a > b`,
 * zero on equal. Non-semver strings (e.g. raw git SHAs in dev builds) fall
 * back to strict equality and produce `0` for equal / `NaN` otherwise; the
 * callers treat `NaN` as "incomparable, force reload".
 */
function compareVersion(a: string, b: string): number {
  if (semverValid(a) && semverValid(b)) return semverCompare(a, b)
  return a === b ? 0 : Number.NaN
}

/**
 * Owns a realtime collaborative session for a single file: the Y.Doc, the
 * optional Hocuspocus provider, hydration, stale-state recovery and the
 * app-version gate.
 *
 * It knows nothing about editors. The caller mounts whatever editor it likes
 * against the returned `ydoc` / `awareness`, and supplies a
 * {@link CollaborativeAdapter} that translates between the native file format
 * and the doc's shared types.
 */
export function useCollaborativeDocument(
  options: CollaborativeDocumentOptions
): CollaborativeDocument {
  const {
    resource,
    currentContent,
    enabled,
    isReadOnly,
    adapter,
    appVersion,
    documentPrefix,
    onContentChange,
    onServerContentChange,
    onEtagChange
  } = options

  const authStore = useAuthStore()
  const configStore = useConfigStore()

  const sessionNonce = ref(0)
  const ydoc = shallowRef<Y.Doc | null>(null)
  const provider = shallowRef<HocuspocusProvider | null>(null)
  const awareness = shallowRef<Awareness | null>(null)
  const status = shallowRef<CollaborativeStatus>('connecting')
  const isReady = shallowRef(false)
  const isLockedForReload = ref(false)
  const error = shallowRef<Error | null>(null)

  const effectiveReadOnly = computed(() => toValue(isReadOnly) || unref(isLockedForReload))

  // Single, deployment-wide switch. Leaving `yjsServerUrl` unset runs every
  // session in local mode: a Y.Doc and Awareness still spin up so the editor
  // binding stays on one codepath, but nothing connects and no peer appears.
  const yjsServerUrl = computed<string | null>(() => configStore.options.yjsServerUrl || null)

  const documentName = computed(() => {
    // OC's canonical composite id, identical for all peers. It serves as the
    // Y.Doc match key and the ACL probe target the yjs server passes to Graph.
    const fileId = toValue(resource)?.id
    if (!fileId) return null
    const prefix = toValue(documentPrefix)
    return prefix ? `${prefix}::${fileId}` : `${fileId}`
  })

  // Use an explicit session key instead of letting `watchEffect` track every
  // reactive read inside the body. watchEffect re-runs whenever any of its
  // deps fire, including unrelated `resource` mutations from the caller's
  // post-save `upsertResource`, which would tear down the Y.Doc on every save
  // and lose peer edits.
  const sessionKey = computed(() => {
    const name = unref(documentName)
    if (!name || !toValue(enabled)) return null
    return `${name}::${unref(yjsServerUrl) ?? 'local'}::${unref(sessionNonce)}`
  })

  /**
   * True while this client holds content that only exists in its own browser:
   * a read-only client hydrated an empty room (see `runInitialHydration`).
   * Merging that private copy with a peer's later seeding would duplicate the
   * whole document, so the session is rebuilt instead.
   */
  let hasLocalOnlyContent = false

  /**
   * The native file body this client fetched, captured at the moment it
   * noticed etag drift. Non-null only on a peer that may re-seed the room.
   *
   * Recovery has to publish the content behind `_oc_meta.nativeEtag`, and the
   * only peer holding it is the one that just fetched the file. Reading the
   * caller's `currentContent` at recovery time would not do: by then the room
   * has synced its own (older) state into our Y.Doc and the debounced serialize
   * has reported it straight back into `currentContent`.
   */
  let staleRecoveryContent: string | null = null

  /**
   * Whether the peer that published this state vector already held every
   * operation *we* contributed, so the file it wrote contains our work too.
   *
   * Only our own client id is compared. What `serverContent` answers is "is my
   * work on disk"; operations from a third peer are tracked by that peer's own
   * dirty state. Comparing every client would also never hold, because the
   * saver encodes its vector inside the transaction that stamps the rest of
   * `_oc_meta` and so cannot include its own trailing writes.
   */
  function peerSaveCoversUs(doc: Y.Doc, theirs: Uint8Array): boolean {
    const ourClock = Y.decodeStateVector(Y.encodeStateVector(doc)).get(doc.clientID) ?? 0
    const theirView = Y.decodeStateVector(theirs).get(doc.clientID) ?? 0
    return theirView >= ourClock
  }

  /**
   * Whether the body we hold is the one recovery is supposed to settle on,
   * i.e. our freshly fetched etag is the room's `nativeEtag`.
   */
  function canSupplyRecoveryContent(meta: Y.Map<unknown>): boolean {
    const target = meta.get('nativeEtag') as string | undefined
    const ours = toValue(resource)?.etag
    return Boolean(target && ours && target === ours)
  }

  function lockForReload(prov: HocuspocusProvider | null, message: string) {
    if (unref(isLockedForReload)) return
    isLockedForReload.value = true
    error.value = new Error(message)
    try {
      prov?.disconnect()
    } catch {
      // disconnect can throw if already torn down; ignore.
    }
  }

  async function serializeDoc(doc: Y.Doc): Promise<string | null> {
    const current = toValue(adapter)
    if (doc.isDestroyed || !current.hasContent(doc)) return null
    const value = await Promise.resolve(current.serialize(doc))
    if (doc.isDestroyed) return null
    return value
  }

  // Depth counter for session-internal mutations. See `canReportContent`.
  let suppressionDepth = 0
  async function withoutReportingContent<T>(fn: () => T | Promise<T>): Promise<T> {
    suppressionDepth++
    try {
      return await fn()
    } finally {
      suppressionDepth--
    }
  }

  /**
   * Whether a Y.Doc change should be reported to the caller as new content.
   *
   * Only changes that represent a real edit qualify. Everything the session
   * does to make the doc match the file - the initial sync, hydration, the
   * meta handshake, stale recovery - must not, because the caller derives its
   * dirty state by string-comparing what we report against the file it
   * fetched. Serialization is not byte-identical to the original (Tiptap
   * normalises markdown, for one), so reporting the post-hydration state would
   * mark an untouched file dirty the moment it opens.
   *
   * Deliberately not based on Y.Doc transaction origins: an adapter would have
   * to remember to tag its writes, and the ones that matter most (a remote
   * sync applying another peer's hydration) carry no origin we control.
   * Gating on session state instead means adapters need to know nothing.
   */
  function canReportContent(): boolean {
    return unref(isReady) && suppressionDepth === 0
  }

  /**
   * Hydration: elected client seeds the Y.Doc from native content. Lowest
   * awareness clientId wins to avoid double-hydration when two peers see an
   * empty doc simultaneously. In local mode there are no peers, so the
   * election degenerates to "we win unconditionally".
   */
  async function runInitialHydration(
    doc: Y.Doc,
    prov: HocuspocusProvider | null,
    awarenessInstance: Awareness
  ) {
    const current = toValue(adapter)
    const meta = doc.getMap(META_KEY)
    const version = toValue(appVersion)

    // If the doc is already flagged as stale (etag or app-version drift
    // between persisted state and this connect), let the meta-observer fire
    // `recoverFromStaleState`. Skip the version check below so we don't
    // race-lock the user out of a doc we're about to rehydrate cleanly.
    //
    // The observer only fires on change, so a peer that joins while the flag is
    // already up never hears about it. Offer ourselves instead if we hold the
    // body recovery needs - the peer that was elected for it may well have
    // navigated away before finishing.
    if (meta.get('isStale') === true) {
      if (!unref(effectiveReadOnly) && canSupplyRecoveryContent(meta)) {
        staleRecoveryContent = toValue(currentContent)
        doc.transact(() => meta.set('recoveryClientId', doc.clientID))
        void recoverFromStaleState(doc, prov)
      }
      return
    }

    // App-version handshake.
    // - empty: first client into the room, seed our version
    // - equal: no-op
    // - doc is OLDER than us: persisted state pre-dates our schema; treat as
    //   stale and trigger the recovery flow
    // - doc is NEWER than us OR incomparable: we are out of date, force
    //   reload — the user must refresh to a current bundle
    const docVersion = meta.get('appVersion') as string | undefined
    if (!docVersion) {
      doc.transact(() => {
        if (!meta.get('appVersion')) meta.set('appVersion', version)
      })
    } else {
      const cmp = compareVersion(version, docVersion)
      if (Number.isNaN(cmp) || cmp < 0) {
        lockForReload(
          prov,
          `This file is being edited with app version ${docVersion} ` +
            `(yours is ${version}). Please reload.`
        )
        return
      }
      if (cmp > 0) {
        doc.transact(() => meta.set('isStale', true))
        return
      }
    }

    // Etag drift check. Relay-only yjs servers do not persist Y.Docs, so the
    // server cannot compare a persisted etag against the native file. Instead,
    // after sync we look at what the synced room thinks the etag is
    // (`_oc_meta.etag`, seeded by whichever peer entered first) and compare it
    // against the etag the caller just refetched:
    //   - no doc etag yet → we are the first peer, seed our baseline
    //   - doc == native   → no-op
    //   - doc != native   → the room's view is older than the file on disk;
    //                       flag isStale so the meta observer fires
    //                       `recoverFromStaleState`
    // Stamping the native etag into a side field lets the recovery path settle
    // the final value into `_oc_meta.etag` without an extra fetch.
    const docEtag = meta.get('etag') as string | undefined
    const nativeEtag = toValue(resource)?.etag
    if (docEtag && nativeEtag && docEtag !== nativeEtag) {
      // We are the peer that just fetched the file, so our `currentContent` is
      // the body behind `nativeEtag`. Capture it before the room syncs its own
      // state over it, and claim the recovery: `recoveryClientId` is
      // last-write-wins, so if several peers detect the same drift at once
      // exactly one of them ends up elected.
      staleRecoveryContent = toValue(currentContent)
      doc.transact(() => {
        meta.set('nativeEtag', nativeEtag)
        meta.set('recoveryClientId', doc.clientID)
        meta.set('isStale', true)
      })
      return
    }
    if (!docEtag && nativeEtag) {
      doc.transact(() => {
        if (!meta.get('etag')) meta.set('etag', nativeEtag)
      })
    }

    if (current.hasContent(doc)) return

    // Read-only client in an empty room: nobody has seeded the doc, so leaving
    // it empty would show a blank file. Hydrate a private copy instead. The
    // realtime server rejects writes from read-only connections, so it never
    // reaches the room, and `hasLocalOnlyContent` marks it so the meta observer
    // can drop it again the moment a peer starts seeding for real.
    if (unref(effectiveReadOnly)) {
      // A peer already announced its seeding; its content is on the way.
      if (meta.get('hydrated') === true) return
      // Set before awaiting: a peer announcing mid-hydration must still find
      // the flag set, otherwise the two copies merge into duplicated content.
      hasLocalOnlyContent = true
      await Promise.resolve(current.hydrate(doc, toValue(currentContent)))
      hasLocalOnlyContent = current.hasContent(doc)
      return
    }

    // Peer election to avoid double-hydration: let other clients announce
    // themselves via awareness, then the lowest awareness clientId wins. This
    // only matters in collab mode. In local mode there are no peers, and the
    // 150ms announce wait would just delay first paint, so hydrate immediately.
    if (prov) {
      await new Promise<void>((resolve) => setTimeout(resolve, 150))

      if (current.hasContent(doc)) return // someone beat us

      const myId = doc.clientID
      const peers = Array.from(awarenessInstance.getStates().keys())
      const lowest = peers.length ? Math.min(myId, ...peers) : myId
      if (myId !== lowest) return
    }

    // Announce before seeding, so read-only peers can drop their private copy
    // before our content lands rather than merge with it.
    doc.transact(() => meta.set('hydrated', true))
    await Promise.resolve(current.hydrate(doc, toValue(currentContent)))
  }

  /**
   * Stale-state recovery: fired when `_oc_meta.isStale` goes up because the
   * room's etag no longer matches the native file. The elected client wipes
   * adapter content, clears the staleness flag, and re-hydrates from the body
   * it captured when it noticed the drift. Other peers see the wipe + hydrate
   * as ordinary CRDT updates. Unreachable in local mode (nobody ever sets
   * isStale), but coded provider-tolerant so the two modes share one path.
   *
   * Only a peer that holds the fresh body may run this. Letting an arbitrary
   * peer win would re-seed the room from whatever it happens to be holding -
   * the pre-drift body it opened with, or its own last serialization - and then
   * stamp the fresh etag onto it. The next save would carry a matching
   * `If-Match` and overwrite the external writer with no 412 and no warning.
   */
  async function recoverFromStaleState(doc: Y.Doc, prov: HocuspocusProvider | null) {
    const current = toValue(adapter)
    const meta = doc.getMap(META_KEY)
    if (unref(effectiveReadOnly)) return
    if (staleRecoveryContent === null) return
    if (typeof current.reset !== 'function') {
      lockForReload(
        prov,
        'This file was changed externally and your editor cannot recover in-place. Please reload.'
      )
      return
    }

    // Let concurrent claims converge, then check whether we are the one that
    // came out on top.
    await new Promise<void>((resolve) => setTimeout(resolve, 150))
    if (meta.get('isStale') !== true) return // someone else handled it
    if (meta.get('recoveryClientId') !== doc.clientID) return

    const content = staleRecoveryContent
    const freshEtag =
      (meta.get('nativeEtag') as string | undefined) ?? toValue(resource)?.etag ?? ''

    // Split into three phases so a crash between reset and hydrate leaves
    // `isStale` set: the next peer entering the room then re-runs recovery
    // instead of inheriting an empty doc with cleared flags.
    //
    // None of it is a user edit, so none of it is reported as content. The
    // caller's server content still describes the file it fetched; letting the
    // rewrite through would flip its dirty state back and forth between
    // recovery and the next real keystroke.
    try {
      await withoutReportingContent(async () => {
        doc.transact(() => {
          current.reset?.(doc)
        }, 'stale-recovery-reset')

        await Promise.resolve(current.hydrate(doc, content))

        doc.transact(() => {
          meta.delete('isStale')
          meta.delete('nativeEtag')
          meta.delete('recoveryClientId')
          if (freshEtag) meta.set('etag', freshEtag)
          // Bump the version stamp too: the prior state may have been tied to an
          // older `appVersion`, and the recovered content is now in our current
          // layout. Late joiners with the same version pass the handshake; older
          // clients still bounce on their own version check.
          meta.set('appVersion', toValue(appVersion))
        }, 'stale-recovery-commit')
      })
      staleRecoveryContent = null
    } catch (e) {
      // The reset already emptied the shared doc for every peer. `isStale` is
      // still set, so a later joiner holding the fresh body retries. Lock this
      // session so nothing autosaves the empty document over the file in the
      // meantime.
      console.error('[collab] stale-state recovery failed:', e)
      lockForReload(
        prov,
        'This file was changed externally and recovering it failed. Please reload.'
      )
    }
  }

  /**
   * Single entry point for both modes (collab `onSynced` and the immediate
   * local-mode call). Flips `isReady` once the hydration decision has settled
   * so the editor mount is gated on one signal and never spins forever. The
   * `ydoc.value === doc` guard keeps a stale invocation (resolving after
   * navigation tore this session down) from clearing the loading state of
   * the next session.
   */
  async function onProviderSynced(
    doc: Y.Doc,
    prov: HocuspocusProvider | null,
    awarenessInstance: Awareness
  ) {
    try {
      await runInitialHydration(doc, prov, awarenessInstance)
    } catch (e) {
      // Both call sites fire this without awaiting, so an escaping rejection
      // would be swallowed and the user would face a half-hydrated document
      // with no explanation.
      console.error('[collab] hydration failed:', e)
      error.value = e instanceof Error ? e : new Error(String(e))
    } finally {
      if (!doc.isDestroyed && unref(ydoc) === doc) isReady.value = true
    }
  }

  /**
   * Y.Doc + (optional) provider lifecycle — rebuilt whenever the session key
   * changes. Two modes, gated by `yjsServerUrl`:
   *   - collab : Hocuspocus provider connects, awareness comes from the
   *              provider, hydration waits for onSynced.
   *   - local  : standalone Awareness instance, no network, hydration runs
   *              immediately. The downstream editor sees an awareness object
   *              just like in collab-mode — the only behavioural difference is
   *              that no peers will ever appear.
   */
  watch(
    sessionKey,
    (key, _oldKey, onCleanup) => {
      if (!key) return
      const name = unref(documentName)
      if (!name) return

      // Reset per-file state.
      error.value = null
      isLockedForReload.value = false
      isReady.value = false
      hasLocalOnlyContent = false

      const doc = new Y.Doc()

      // Debounced serialize → report. We hand the caller the same string an
      // out-of-band PUT would write; it diffs that against its own server
      // content to derive a dirty state.
      let serializeTimer: number | undefined
      const scheduleEmit = () => {
        if (serializeTimer !== undefined) window.clearTimeout(serializeTimer)
        serializeTimer = window.setTimeout(() => {
          serializeTimer = undefined
          // Re-checked here, not just at schedule time: the debounce window
          // can outlive the change that opened it.
          if (!canReportContent()) return
          serializeDoc(doc)
            .then((value) => {
              if (value !== null) onContentChange(value)
            })
            .catch((e) => console.error('[collab] serialize for content update failed:', e))
        }, SERIALIZE_DEBOUNCE_MS)
      }

      const onDocUpdate = () => {
        if (!canReportContent()) return
        scheduleEmit()
      }
      doc.on('update', onDocUpdate)

      let prov: HocuspocusProvider | null = null
      let aw: Awareness
      let connectTimer: number | undefined

      const resolvedRealtimeUrl = unref(yjsServerUrl)
      if (resolvedRealtimeUrl) {
        // ---------- Collab mode ----------
        // HocuspocusProvider has no `parameters` option; we get query params to
        // the sidecar's requestParameters by appending them to the URL.
        const version = toValue(appVersion)
        const wsUrlWithParams = `${resolvedRealtimeUrl}?appVersion=${encodeURIComponent(version)}`
        prov = new HocuspocusProvider({
          url: wsUrlWithParams,
          name,
          document: doc,
          token: () => authStore.accessToken,
          onStatus({ status: s }) {
            status.value = s as CollaborativeStatus
          },
          onAuthenticationFailed({ reason }) {
            console.error('[collab] realtime auth failed:', reason)
            // Surface as a lifecycle error so the user sees the reason rather
            // than a silent disconnect. The server uses this for app-version
            // rejection too.
            error.value = new Error(reason || 'authentication failed')
            isLockedForReload.value = true
            if (connectTimer !== undefined) window.clearTimeout(connectTimer)
            // A failed connect never produces an `onSynced`, so hand off to the
            // same entry point to hydrate and release the loading gate - the
            // editor would spin forever otherwise.
            void onProviderSynced(doc, null, aw)
          },
          onSynced() {
            if (connectTimer !== undefined) window.clearTimeout(connectTimer)
            void onProviderSynced(doc, prov, prov!.awareness!)
          }
        })

        // A server that never answers produces neither `onSynced` nor
        // `onAuthenticationFailed`: HocuspocusProvider just keeps retrying, and
        // `onStatus` only moves a ref nobody gates on. The loading screen would
        // stay up forever, so one typo in `yjsServerUrl` - or a sidecar that is
        // simply down - would take every editor in the deployment offline.
        //
        // Give up after a bounded wait and carry on locally: the file is still
        // editable and still saveable, it just does not sync.
        connectTimer = window.setTimeout(() => {
          connectTimer = undefined
          if (doc.isDestroyed || unref(ydoc) !== doc || unref(isReady)) return

          console.error(`[collab] realtime server unreachable, continuing without it: ${name}`)
          status.value = 'disconnected'
          error.value = new Error(
            'The realtime server could not be reached. Editing continues without collaboration; ' +
              'others will not see your changes until you reload.'
          )
          // Stop retrying. A later connect would merge our locally hydrated
          // copy into a room that may already hold the same content,
          // duplicating the document for every peer. `disconnect` rather than
          // `destroy` because the editor binds to the provider's awareness and
          // `destroy` takes that down with it.
          try {
            prov?.disconnect()
          } catch {
            // already torn down
          }
          // `runInitialHydration` returns early if the doc turned out to have
          // content after all, so a sync that landed just as we gave up cannot
          // be hydrated on top of.
          void onProviderSynced(doc, null, aw)
        }, CONNECT_TIMEOUT_MS)

        // Empty-user bootstrap: creates an awareness entry under our
        // Y.Doc.clientID as soon as the provider connects, so peers see us
        // before the editor binding emits its first cursor update. The
        // server's beforeHandleAwareness hook overwrites this with the
        // authenticated identity. Lurkers that never touch `user` stay
        // invisible (matches the hook's "only stamp when present" rule).
        prov.setAwarenessField('user', {})
        aw = prov.awareness!
      } else {
        // ---------- Local mode ----------
        // Standalone Awareness so the editor bindings still see a non-null
        // awareness instance. Nobody else will ever join, which is the point.
        aw = new Awareness(doc)
        status.value = 'local'
        // No `onSynced` to wait for - hand off to the same hydration entry
        // point immediately. Without a yjs server, the app-version handshake and
        // stale-state probe are no-ops, but we still run through the function
        // so future shared-handler additions keep both modes aligned.
        void onProviderSynced(doc, null, aw)
      }

      // _oc_meta is the parallel channel for stale/version coordination. The
      // editor binding never sees it because adapters bind to their own shared
      // types. In local mode nobody ever sets isStale / bumps appVersion, so
      // the observer is dormant but harmless.
      const meta = doc.getMap(META_KEY)
      const metaObserver = (event: Y.YMapEvent<unknown>, transaction: Y.Transaction) => {
        // Peer-save fan-out. Another client just saved (its etag-mirror watch
        // fired LOCAL_SAVE_ORIGIN on its side, then Yjs synced the meta-map
        // change to us with `transaction.origin === undefined` - remote ops
        // have no string origin). Our Y.Doc already reflects every edit that
        // save covered, so serialize it now and tell the caller "this is what's
        // on disk": its dirty state falls to false.
        if (event.keysChanged.has('etag') && transaction.origin !== LOCAL_SAVE_ORIGIN) {
          const newEtag = meta.get('etag') as string | undefined
          if (newEtag) onEtagChange(newEtag)
        }

        if (event.keysChanged.has('lastSavedAt') && transaction.origin !== LOCAL_SAVE_ORIGIN) {
          // The peer PUT what *its* doc serialized to, not what ours does. If
          // we hold edits that never reached it before the write, reporting our
          // own serialization as "this is on disk" would drop our dirty flag,
          // disarm the unsaved-changes guard and lose those edits with the tab.
          // So only follow the peer clean when its snapshot covers everything
          // we have. The check is repeated after serializing because a
          // keystroke can land while that runs.
          const theirState = meta.get('savedStateVector')
          if (theirState instanceof Uint8Array) {
            serializeDoc(doc)
              .then((value) => {
                if (value === null || doc.isDestroyed) return
                if (!peerSaveCoversUs(doc, theirState)) return
                onServerContentChange(value)
              })
              .catch((e) => console.error('[collab] serialize for peer-save sync failed:', e))
          }
        }

        // App version mismatch surfaced after the fact (e.g. a newer peer
        // joined and bumped `appVersion`). Any non-zero diff at this point
        // means the room moved past or ahead of us mid-session - Lock and
        // prompt reload. Stale-recovery is intentionally NOT triggered here;
        // that path only applies when the doc state itself was already older
        // than the current client at first load.
        if (event.keysChanged.has('appVersion')) {
          const docVersion = meta.get('appVersion') as string | undefined
          const version = toValue(appVersion)
          if (docVersion) {
            const cmp = compareVersion(version, docVersion)
            if (Number.isNaN(cmp) || cmp !== 0) {
              lockForReload(
                prov,
                `This file is now being edited with app version ${docVersion} ` +
                  `(yours is ${version}). Please reload.`
              )
            }
          }
        }

        // A peer is seeding the room while we hold a private read-only copy.
        // Letting the two merge would duplicate the whole document, so throw
        // our session away and rebuild it from the room's state. Nothing is
        // lost: a read-only client never has edits of its own.
        if (
          event.keysChanged.has('hydrated') &&
          meta.get('hydrated') === true &&
          hasLocalOnlyContent
        ) {
          sessionNonce.value++
          return
        }

        // Stale-state signal: the room's Y.Doc was tied to an etag that no
        // longer matches the native file. Every peer runs this, but only the
        // one elected to supply the fresh body gets past its guards.
        if (event.keysChanged.has('isStale') && meta.get('isStale') === true) {
          void recoverFromStaleState(doc, prov)
        }
      }
      meta.observe(metaObserver)

      ydoc.value = doc
      provider.value = prov
      awareness.value = aw

      onCleanup(() => {
        if (serializeTimer !== undefined) window.clearTimeout(serializeTimer)
        if (connectTimer !== undefined) window.clearTimeout(connectTimer)
        meta.unobserve(metaObserver)
        doc.off('update', onDocUpdate)
        prov?.destroy()
        aw.destroy()
        doc.destroy()
        if (unref(provider) === prov) provider.value = null
        if (unref(awareness) === aw) awareness.value = null
        if (unref(ydoc) === doc) ydoc.value = null
      })
    },
    { immediate: true }
  )

  // The caller updates `resource` after each of its own saves, which bubbles
  // the new etag in here. Mirror it into `_oc_meta.etag` so peers learn that
  // the file on disk moved. In local mode nobody reads `_oc_meta`, but the
  // mirror is cheap and keeps the two modes symmetrical.
  watch(
    () => toValue(resource)?.etag,
    (newEtag) => {
      const doc = unref(ydoc)
      if (!doc || doc.isDestroyed || !newEtag) return
      const meta = doc.getMap(META_KEY)
      if (meta.get('etag') === newEtag) return
      doc.transact(() => {
        meta.set('etag', newEtag)
        // Snapshot of what our doc contained when we wrote the file. Peers use
        // it to tell "this save covers me too" from "this save predates my
        // edits", instead of assuming the former.
        meta.set('savedStateVector', Y.encodeStateVector(doc))
        meta.set('lastSavedAt', Date.now())
      }, LOCAL_SAVE_ORIGIN)
    }
  )

  return {
    ydoc,
    awareness,
    provider,
    status,
    isReady,
    isLockedForReload,
    error
  }
}
