<script setup lang="ts">
import {
  computed,
  ref,
  shallowRef,
  unref,
  watch,
  type Component,
  type PropType
} from 'vue'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { Resource } from '@opencloud-eu/web-client'
import { useAuthStore, useConfigStore } from '../../composables'
import semverCompare from 'semver/functions/compare'
import semverValid from 'semver/functions/valid'
import type { CollaborativeAdapter } from './types'

const props = defineProps({
  resource: { type: Object as PropType<Resource>, required: true },
  currentContent: { type: String, required: true },
  isReadOnly: { type: Boolean, default: false },
  adapter: { type: Object as PropType<CollaborativeAdapter>, required: true },
  editor: { type: Object as PropType<Component>, required: true },
  // App version owned by the consuming app — typically `pkg.version` from
  // its own package.json, baked in at build time by Vite. Used to detect
  // schema mismatch between peers in the same Y.Doc room. The wrapper
  // itself stays agnostic of where the version comes from.
  appVersion: { type: String, required: true },
  // Realtime sync URL (wss://.../realtime). Three states:
  //   - `undefined` (the default): derive from `configStore.serverUrl` —
  //     convention is the sidecar lives at `/realtime` on the OC host.
  //     This is what most consumers want: collab on, zero config.
  //   - `null`: explicit local-only mode. Y.Doc + Awareness still spin up
  //     (so the editor binding stays on one codepath) but no Hocuspocus
  //     provider, no cross-peer sync, no stale-state probe. Hydration
  //     runs immediately from `currentContent`.
  //   - a string: use this exact URL. Lets a deployment override the
  //     convention (e.g. when the sidecar lives on a separate host).
  realtimeUrl: {
    type: String as PropType<string | null | undefined>,
    required: false,
    default: undefined
  }
})

// The hosting AppWrapper drives isEditor / isDirty / autoSave / Ctrl+S /
// the unsaved-changes modal off `update:currentContent` emissions. We push
// the latest serialized form of the Y.Doc into it after each user edit; the
// AppWrapper's save path then PUTs that string with its own etag tracking.
const emit = defineEmits<{
  (e: 'update:currentContent', value: string): void
}>()

const META_KEY = '_oc_meta'
const SERIALIZE_DEBOUNCE_MS = 300
const APP_VERSION = props.appVersion

// Semver comparison via the official `semver` package: handles pre-release
// ordering (`1.0.0-rc.1 < 1.0.0`), multi-digit segments (`0.20.0 > 0.3.0`),
// build metadata, etc. Returns negative when `a < b`, positive when `a > b`,
// zero on equal. Non-semver strings (e.g. raw git SHAs in dev builds) fall
// back to strict equality and produce `0` for equal / `NaN` otherwise; the
// callers treat `NaN` as "incomparable, force reload".
function compareVersion(a: string, b: string): number {
  if (semverValid(a) && semverValid(b)) return semverCompare(a, b)
  return a === b ? 0 : Number.NaN
}

const authStore = useAuthStore()
const configStore = useConfigStore()

// See the `realtimeUrl` prop docs for the three-state contract. We resolve
// `undefined` here so the watch / template see a stable string-or-null.
const effectiveRealtimeUrl = computed<string | null>(() => {
  if (props.realtimeUrl !== undefined) return props.realtimeUrl
  const base = configStore.serverUrl?.replace(/\/$/, '') ?? ''
  if (!base) return null
  return base.replace(/^http/, 'ws') + '/realtime'
})

const ydoc = shallowRef<Y.Doc | null>(null)
const provider = shallowRef<HocuspocusProvider | null>(null)
const awareness = shallowRef<Awareness | null>(null)
// Template ref to the bound editor component. We never poke at it directly;
// adapters reach the live editor through `getAdapterContext()` (see the
// `serialize` call below).
const editorRef = shallowRef<{ getAdapterContext?: () => unknown } | null>(null)
const status = shallowRef<'connecting' | 'connected' | 'disconnected' | 'local'>('connecting')
// Set when the sidecar told us the persisted state is stale and we either
// recovered locally or need the user to reload, or when realtime auth failed.
const lifecycleError = shallowRef<Error | null>(null)
// True after we've forcibly disconnected because of an app-version mismatch.
// The editor stays mounted with the last-known content but flips read-only
// and the user is asked to reload.
const isLockedForReload = ref(false)
// Y.Doc transaction origins we generate ourselves and that should NOT
// produce an `update:currentContent` emission — hydrate/reset/recovery just
// reshape the local CRDT after the parent's `currentContent` was loaded;
// re-emitting the same content right back would only burn cycles and, in
// the recovery case, racily flip AppWrapper's `isDirty` between recover
// and the next real edit.
const INTERNAL_ORIGINS = new Set<string>([
  'hydrate',
  'reset',
  'stale-recovery-reset',
  'stale-recovery-commit'
])

const documentName = computed(() => {
  const r = props.resource as Resource & { remoteItemId?: string }
  // OC's canonical composite id `<storageid>$<spaceid>!<opaqueid>`. The
  // owner reads it from `r.id`, a share recipient reads the same composite
  // from `r.remoteItemId` (which points at the owner's drive+item). Both
  // peers end up with the same value, so it doubles as the Y.Doc match key
  // and the ACL probe target the sidecar passes to Graph.
  return r.remoteItemId ?? r.id
})

const effectiveReadOnly = computed(() => props.isReadOnly || isLockedForReload.value)

// ---------------------------------------------------------------------------
// Y.Doc + (optional) provider lifecycle — rebuilt whenever the file identity
// changes. Two modes, gated by `effectiveRealtimeUrl` (prop + serverUrl convention):
//   - collab : Hocuspocus provider connects, awareness comes from the
//              provider, hydration waits for onSynced.
//   - local  : standalone Awareness instance, no network, hydration runs
//              immediately. The downstream editor sees an awareness object
//              just like in collab-mode — the only behavioural diff for
//              consumers is that no peers will ever appear.
// ---------------------------------------------------------------------------
// Use an explicit session key (name + realtime URL) instead of letting
// `watchEffect` track every prop access inside the body. Vue's watchEffect
// re-runs whenever any of its reactive deps fire — including unrelated
// `props.resource` mutations from AppWrapper's post-save `upsertResource`,
// which would tear down the Y.Doc on every save and lose peer edits.
const sessionKey = computed(() => {
  const name = documentName.value
  if (!name) return null
  return `${name}::${effectiveRealtimeUrl.value ?? 'local'}`
})

watch(
  sessionKey,
  (key, _oldKey, onCleanup) => {
    if (!key) return
    const name = unref(documentName)
    if (!name) return

    // Reset per-file state.
    lifecycleError.value = null
    isLockedForReload.value = false

    const doc = new Y.Doc()
    // (the body below was the original `watchEffect` callback; indentation
    // intentionally kept at the prior level to minimise diff churn.)

  // Debounced serialize → emit. We hand AppWrapper the same string an
  // out-of-band PUT would write; AppWrapper diffs it against its
  // serverContent to derive isDirty. Internal-origin transactions
  // (hydrate / reset / stale-recovery) are skipped to avoid round-tripping
  // the parent's freshly-loaded content back to it as a fake user edit.
  let serializeTimer: number | undefined
  const scheduleEmit = () => {
    if (serializeTimer !== undefined) window.clearTimeout(serializeTimer)
    serializeTimer = window.setTimeout(() => {
      serializeTimer = undefined
      if (doc.isDestroyed) return
      if (!props.adapter.hasContent(doc)) return
      try {
        // The bound editor component may expose a `getAdapterContext()` via
        // `defineExpose`. Tiptap-style adapters use it to reach the live
        // editor and skip a per-keystroke headless-editor spawn; CodeMirror-
        // style adapters return undefined and serialise from Y.Doc alone.
        const editorCtx =
          (editorRef.value as { getAdapterContext?: () => unknown } | null)?.getAdapterContext?.()
        const serialized = props.adapter.serialize(doc, editorCtx)
        if (typeof serialized === 'string') {
          emit('update:currentContent', serialized)
          return
        }
        void Promise.resolve(serialized).then((value) => {
          if (doc.isDestroyed) return
          emit('update:currentContent', value)
        })
      } catch (e) {
        console.error('[collab] serialize for emit failed:', e)
      }
    }, SERIALIZE_DEBOUNCE_MS)
  }

  const onDocUpdate = (_update: Uint8Array, origin: unknown) => {
    if (typeof origin === 'string' && INTERNAL_ORIGINS.has(origin)) return
    scheduleEmit()
  }
  doc.on('update', onDocUpdate)

  let prov: HocuspocusProvider | null = null
  let aw: Awareness

  const realtimeUrl = effectiveRealtimeUrl.value
  if (realtimeUrl) {
    // ---------- Collab mode ----------
    // HocuspocusProvider has no `parameters` option; we get query params to
    // the sidecar's requestParameters by appending them to the URL ourselves.
    const wsUrlWithParams = `${realtimeUrl}?appVersion=${encodeURIComponent(APP_VERSION)}`
    prov = new HocuspocusProvider({
      url: wsUrlWithParams,
      name,
      document: doc,
      token: () => authStore.accessToken,
      onStatus({ status: s }) {
        status.value = s as typeof status.value
      },
      onAuthenticationFailed({ reason }) {
        console.error('[collab] realtime auth failed:', reason)
        // Surface as lifecycle error so the user sees the reason rather than a
        // silent disconnect. Server uses this for app-version rejection too.
        lifecycleError.value = new Error(reason || 'authentication failed')
        isLockedForReload.value = true
      },
      onSynced() {
        void onProviderSynced(doc, prov, prov!.awareness!)
      }
    })

    // Empty-user bootstrap: creates an awareness entry under our Y.Doc.clientID
    // as soon as the provider connects, so peers see us before the editor
    // binding emits its first cursor update. The server's beforeHandleAwareness
    // hook overwrites this with the authenticated identity. Lurkers that never
    // touch `user` stay invisible (matches the hook's "only stamp when present"
    // rule).
    prov.setAwarenessField('user', {})
    aw = prov.awareness!
  } else {
    // ---------- Local mode ----------
    // Standalone Awareness so the editor bindings still see a non-null
    // awareness instance (CodeMirror's yCollab, Tiptap's cursor plugin
    // when registered). Nobody else will ever join, which is the point.
    aw = new Awareness(doc)
    status.value = 'local'
    // No `onSynced` to wait for — hand off to the same hydration entrypoint
    // immediately. Without a sidecar the app-version handshake and
    // stale-state probe are no-ops (the doc is freshly minted and there's
    // no persisted state to compare against), but we still run through the
    // function so future shared-handler additions keep both modes aligned.
    void onProviderSynced(doc, null, aw)
  }

  // _oc_meta is the parallel channel for stale/version coordination. The
  // editor binding never sees it because adapters bind to their own shared
  // types (e.g. Y.Text 'content' for CodeMirror). In local mode no one ever
  // sets isStale / bumps appVersion, so the observer is dormant but harmless.
  const meta = doc.getMap(META_KEY)
  const metaObserver = (event: Y.YMapEvent<unknown>) => {
    // App version mismatch surfaced after-the-fact (e.g. a newer peer joined
    // and bumped `appVersion`). Any non-zero diff at this point means the
    // room moved past or ahead of us mid-session — lock and prompt reload.
    // Stale-recovery is intentionally NOT triggered here; that path only
    // applies when the doc state itself was already older than the current
    // client at first load.
    if (event.keysChanged.has('appVersion')) {
      const docVersion = meta.get('appVersion') as string | undefined
      if (docVersion) {
        const cmp = compareVersion(APP_VERSION, docVersion)
        if (Number.isNaN(cmp) || cmp !== 0) {
          lockForReload(
            prov,
            `This file is now being edited with app version ${docVersion} ` +
              `(yours is ${APP_VERSION}). Please reload.`
          )
        }
      }
    }

    // Stale-state signal from the sidecar's onLoadDocument: the persisted
    // Y.Doc was tied to an etag that no longer matches the native file. We
    // run a client-side rehydrate (election prevents all peers from doing
    // it at once).
    if (event.keysChanged.has('isStale') && meta.get('isStale') === true) {
      void recoverFromStaleState(doc, prov, aw)
    }
  }
  meta.observe(metaObserver)

  ydoc.value = doc
  provider.value = prov
  awareness.value = aw

  onCleanup(() => {
    if (serializeTimer !== undefined) window.clearTimeout(serializeTimer)
    meta.unobserve(metaObserver)
    doc.off('update', onDocUpdate)
    prov?.destroy()
    aw.destroy()
    doc.destroy()
    if (provider.value === prov) provider.value = null
    if (awareness.value === aw) awareness.value = null
    if (ydoc.value === doc) ydoc.value = null
  })
  },
  { immediate: true }
)

// AppWrapper updates `props.resource` after each of its own saves via
// `resourcesStore.upsertResource(putFileContentsResponse)`, which bubbles
// the new etag back into this prop. Mirror it into `_oc_meta.etag` so the
// sidecar's stale-state probe (on the next room load after eviction) and
// any future peer-aware logic see the current authoritative tag. In local
// mode no sidecar reads `_oc_meta`, but the mirror is cheap and keeps the
// two modes symmetrical.
watch(
  () => props.resource.etag,
  (newEtag) => {
    const doc = unref(ydoc)
    if (!doc || doc.isDestroyed || !newEtag) return
    const meta = doc.getMap(META_KEY)
    if (meta.get('etag') === newEtag) return
    doc.transact(() => {
      meta.set('etag', newEtag)
      meta.set('lastSavedAt', Date.now())
    })
  }
)

function lockForReload(prov: HocuspocusProvider | null, message: string) {
  if (isLockedForReload.value) return
  isLockedForReload.value = true
  lifecycleError.value = new Error(message)
  try {
    prov?.disconnect()
  } catch {
    // disconnect can throw if already torn down; ignore.
  }
}

// ---------------------------------------------------------------------------
// Hydration — elected client seeds Y.Doc from native content. Lowest
// awareness clientId wins to avoid double-hydration when two peers see an
// empty doc simultaneously. In local mode there are no peers, so the
// election degenerates to "we win unconditionally" — which is what we want.
// ---------------------------------------------------------------------------
async function onProviderSynced(
  doc: Y.Doc,
  prov: HocuspocusProvider | null,
  awarenessInstance: Awareness
) {
  const meta = doc.getMap(META_KEY)

  // If the sidecar already flagged the doc as stale (etag or app-version
  // drift between persisted state and this connect), let the meta-observer
  // fire `recoverFromStaleState`. Skip the version check below so we don't
  // race-lock the user out of a doc we're about to rehydrate cleanly.
  if (meta.get('isStale') === true) return

  // App-version handshake.
  // - empty: first client into the room, seed our version
  // - equal: no-op
  // - doc is OLDER than us: persisted state pre-dates our schema; treat
  //   as stale and trigger the recovery flow (sidecar usually flags this
  //   in onLoadDocument; this branch is the fallback)
  // - doc is NEWER than us OR incomparable: we are out of date, force
  //   reload — the user must refresh to a current bundle
  const docVersion = meta.get('appVersion') as string | undefined
  if (!docVersion) {
    doc.transact(() => {
      if (!meta.get('appVersion')) meta.set('appVersion', APP_VERSION)
    })
  } else {
    const cmp = compareVersion(APP_VERSION, docVersion)
    if (Number.isNaN(cmp) || cmp < 0) {
      lockForReload(
        prov,
        `This file is being edited with app version ${docVersion} ` +
          `(yours is ${APP_VERSION}). Please reload.`
      )
      return
    }
    if (cmp > 0) {
      doc.transact(() => meta.set('isStale', true))
      return
    }
  }

  // Seed the etag immediately so future stale-state probes have a baseline.
  if (!meta.get('etag') && props.resource.etag) {
    doc.transact(() => {
      if (!meta.get('etag')) meta.set('etag', props.resource.etag)
    })
  }

  if (props.adapter.hasContent(doc)) return
  if (effectiveReadOnly.value) return // never seed from a read-only view

  // Let other clients announce themselves via awareness before electing.
  // In local mode nobody else exists, but the 150ms wait costs nothing
  // and keeps the codepath identical.
  await new Promise<void>((resolve) => setTimeout(resolve, 150))

  if (props.adapter.hasContent(doc)) return // someone beat us

  const myId = doc.clientID
  const peers = Array.from(awarenessInstance.getStates().keys())
  const lowest = peers.length ? Math.min(myId, ...peers) : myId
  if (myId !== lowest) return

  await Promise.resolve(props.adapter.hydrate(doc, props.currentContent))
}

// ---------------------------------------------------------------------------
// Stale-state recovery — fired when the sidecar flags `_oc_meta.isStale`
// because the persisted Y.Doc's etag no longer matches the native file. The
// elected client wipes adapter content, clears the staleness flag, and
// re-hydrates from `props.currentContent` (which the parent route component
// re-fetched at app-open time, so it reflects the new native content).
// Other peers see the wipe + hydrate as ordinary CRDT updates. Unreachable
// in local mode (no sidecar ever sets isStale), but coded provider-tolerant
// so the two modes share one implementation.
// ---------------------------------------------------------------------------
async function recoverFromStaleState(
  doc: Y.Doc,
  prov: HocuspocusProvider | null,
  awarenessInstance: Awareness
) {
  const meta = doc.getMap(META_KEY)
  if (effectiveReadOnly.value) return
  if (typeof props.adapter.reset !== 'function') {
    lockForReload(
      prov,
      'This file was changed externally and your editor cannot recover in-place. Please reload.'
    )
    return
  }

  // Election: lowest awareness clientId wins, same primitive as initial
  // hydrate. Peers without a reset-capable adapter never elect themselves.
  await new Promise<void>((resolve) => setTimeout(resolve, 150))
  if (meta.get('isStale') !== true) return // someone else handled it

  const myId = doc.clientID
  const peers = Array.from(awarenessInstance.getStates().keys())
  const lowest = peers.length ? Math.min(myId, ...peers) : myId
  if (myId !== lowest) return

  const freshEtag = (meta.get('nativeEtag') as string | undefined) ?? props.resource.etag ?? ''

  // Split into three phases so a crash between reset and hydrate leaves
  // `isStale` set: the next peer entering the room then re-runs recovery
  // instead of inheriting an empty doc with cleared flags.
  doc.transact(() => {
    props.adapter.reset?.(doc)
  }, 'stale-recovery-reset')

  await Promise.resolve(props.adapter.hydrate(doc, props.currentContent))

  doc.transact(() => {
    meta.delete('isStale')
    meta.delete('nativeEtag')
    if (freshEtag) meta.set('etag', freshEtag)
    // Bump the version stamp too: the prior persisted state may have been
    // tied to an older `appVersion`, and the recovered content is now in
    // our current layout. Late joiners with the same version pass the
    // handshake; older clients still bounce on their own version check.
    meta.set('appVersion', APP_VERSION)
  }, 'stale-recovery-commit')
}
</script>

<template>
  <div class="oc-width-1-1 oc-height-1-1 oc-flex oc-flex-column">
    <!-- Compact status strip — connection state + lifecycle errors only.
         Save / dirty / etag UX is owned by the hosting AppWrapper. -->
    <div class="oc-p-s oc-text-meta oc-flex oc-flex-middle">
      <span>— {{ status }}</span>
      <span v-if="lifecycleError" class="oc-ml-m oc-text-danger">— {{ lifecycleError.message }}</span>
      <span v-if="effectiveReadOnly" class="oc-ml-m">(read-only)</span>
    </div>
    <component
      :is="editor"
      v-if="ydoc && awareness"
      ref="editorRef"
      :ydoc="ydoc"
      :awareness="awareness"
      :provider="provider"
      :is-read-only="effectiveReadOnly"
      class="oc-width-1-1 oc-flex-1"
    />
  </div>
</template>
