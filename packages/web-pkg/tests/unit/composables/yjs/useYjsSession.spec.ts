// Unit coverage for the Yjs session composable that AppWrapper owns
// on behalf of collaborative apps. It carries the non-trivial branching
// (remote vs local) and a handful of side effects (debounced content reports,
// etag mirror, lifecycle teardown) that aren't exercised by the cucumber e2e
// suites unless we run them through the whole OC + yjs server stack.
//
// We mock HocuspocusProvider so the tests stay hermetic (no network). A tiny
// inline adapter mimics a Y.Text-on-'content' layout; the composable only sees
// the YjsAdapter interface and doesn't care which app produced it.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { ref, shallowRef, unref } from 'vue'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import type { Resource } from '@opencloud-eu/web-client'

import { useYjsSession, type YjsAdapter, type YjsSession } from '../../../../src/composables/yjs'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'

// vi.hoisted is required so providerInstances is reachable from the hoisted
// vi.mock factory; defining the class outside the factory hits "Cannot access
// before initialization".
interface MockProvider {
  url: string
  name: string
  document: Y.Doc
  awareness: Awareness
  destroy: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
  detach: ReturnType<typeof vi.fn>
  setAwarenessField: ReturnType<typeof vi.fn>
  triggerSynced(): void
  triggerAuthFailed(reason: string): void
}

const { providerInstances } = vi.hoisted(() => {
  return { providerInstances: [] as MockProvider[] }
})

vi.mock('@hocuspocus/provider', async () => {
  const { Awareness: AwarenessImpl } = await import('y-protocols/awareness')
  class MockHocuspocusProvider {
    url: string
    name: string
    document: Y.Doc
    awareness: Awareness
    // Mirrors the real provider, which destroys its own awareness. A bare spy
    // would hide a double-destroy in the session's cleanup.
    destroy = vi.fn(() => {
      this.awareness.destroy()
    })
    disconnect = vi.fn()
    // Present on the real provider and load-bearing: without it, doc updates
    // after a disconnect keep queueing in the websocket's `messageQueue`.
    detach = vi.fn()
    setAwarenessField = vi.fn()
    private _opts: any
    constructor(opts: any) {
      this.url = opts.url
      this.name = opts.name
      this.document = opts.document
      this.awareness = new AwarenessImpl(opts.document)
      this._opts = opts
      providerInstances.push(this as MockProvider & MockHocuspocusProvider)
    }
    triggerSynced() {
      this._opts.onSynced?.({ state: true })
    }
    triggerAuthFailed(reason: string) {
      this._opts.onAuthenticationFailed?.({ reason })
    }
  }
  return { HocuspocusProvider: MockHocuspocusProvider }
})

const SHARED_TEXT_KEY = 'content'
const testAdapter: YjsAdapter = {
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
    yText.delete(0, yText.length)
  }
}

// Mirrors the real Tiptap adapter's defining property: serialize(hydrate(x))
// is not x. Here a trailing newline stands in for Tiptap's markdown
// renormalisation (`* a` becoming `- a`, and so on).
const normalizingAdapter: YjsAdapter = {
  ...testAdapter,
  serialize(ydoc: Y.Doc): string {
    return `${ydoc.getText(SHARED_TEXT_KEY).toString()}\n`
  }
}

function makeResource(overrides: Partial<Resource> = {}): Resource {
  return {
    id: 'storage$space!item-1',
    etag: 'etag-initial',
    ...overrides
  } as Resource
}

function setupSession({
  currentContent = '',
  yjsServerUrl = undefined as string | undefined,
  appVersion = '1.2.3',
  resource = makeResource(),
  adapter = testAdapter as YjsAdapter,
  enabled = true,
  isReadOnly = false
} = {}) {
  const resourceRef = ref(resource)
  const adapterRef = shallowRef(adapter)
  const enabledRef = ref(enabled)
  const isReadOnlyRef = ref(isReadOnly)
  const contentRef = ref(currentContent)
  const onContentChange = vi.fn()
  const onServerContentChange = vi.fn()
  const onEtagChange = vi.fn()
  let session: YjsSession

  const wrapper = getComposableWrapper(
    () => {
      session = useYjsSession({
        resource: resourceRef,
        currentContent: contentRef,
        enabled: enabledRef,
        isReadOnly: isReadOnlyRef,
        adapter: adapterRef,
        appVersion,
        documentPrefix: 'test-app',
        onContentChange,
        onServerContentChange,
        onEtagChange
      })
    },
    {
      pluginOptions: {
        piniaOptions: {
          configState: { options: { yjsServerUrl } },
          // The session only goes to the Yjs server for a signed-in user;
          // without a token it deliberately stays in local mode.
          authState: { accessToken: 'access-token' }
        }
      }
    }
  )

  return {
    wrapper,
    resourceRef,
    adapterRef,
    enabledRef,
    isReadOnlyRef,
    contentRef,
    onContentChange,
    onServerContentChange,
    onEtagChange,
    get session() {
      return session
    },
    get ydoc() {
      return unref(session.ydoc)
    }
  }
}

beforeEach(() => {
  providerInstances.length = 0
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useYjsSession — enabled gate', () => {
  // Regression: hydration seeds the Y.Doc from `currentContent`. The caller
  // knows the file id (and therefore the room name) before it has fetched the
  // file body, so starting the session eagerly would hydrate — and publish to
  // every peer — an empty document.
  it('does not start, and does not hydrate from empty content, until enabled', async () => {
    const s = setupSession({ currentContent: '', enabled: false })
    await flushPromises()
    expect(s.ydoc).toBeNull()

    s.contentRef.value = 'content fetched later'
    s.enabledRef.value = true
    await flushPromises()

    expect(s.ydoc).toBeTruthy()
    expect(s.ydoc!.getText(SHARED_TEXT_KEY).toString()).toBe('content fetched later')
  })
})

describe('useYjsSession — room name', () => {
  const yjsServerUrl = 'wss://example.test/yjs'

  it('keys the room on the prefix and the resource id', async () => {
    setupSession({ yjsServerUrl, resource: makeResource({ id: 'storage$space!item-1' }) })
    await flushPromises()
    expect(providerInstances[0].name).toBe('test-app::storage$space!item-1')
  })

  // `fileId` is the real composite id for everyone: plain WebDAV resources set
  // it to `id`, and a share recipient gets it from `remoteItem.id`.
  it('puts owner and share recipient in the same room', async () => {
    setupSession({
      yjsServerUrl,
      resource: makeResource({ id: 'storage$space!item-1', fileId: 'storage$space!item-1' })
    })
    setupSession({
      yjsServerUrl,
      resource: makeResource({ id: 'storage$space!item-1', fileId: 'storage$space!item-1' })
    })
    await flushPromises()

    expect(providerInstances[0].name).toBe(providerInstances[1].name)
  })

  // Regression: for the recipient of a *directly* shared file the resource is
  // the share root, so `buildIncomingShareResource` puts the per-recipient
  // share-jail mount id in `id` and the real file id in `fileId`. Keying on `id`
  // gave every recipient a private room - and because both sides still reported
  // `connected`, a 409 was silently retried over the other side's write instead
  // of raising a conflict.
  it('keys a directly shared file on the real file id, not the share mount', async () => {
    // The owner, straight from WebDAV.
    setupSession({
      yjsServerUrl,
      resource: makeResource({ id: 'storage$space!item-1', fileId: 'storage$space!item-1' })
    })
    // The recipient: share-jail mount as `id`, real file id as `fileId`.
    setupSession({
      yjsServerUrl,
      resource: makeResource({
        id: 'sharejail$sharejail!share-abc',
        fileId: 'storage$space!item-1',
        remoteItemId: 'storage$space!item-1'
      })
    })
    await flushPromises()

    expect(providerInstances[1].name).toBe('test-app::storage$space!item-1')
    expect(providerInstances[0].name).toBe(providerInstances[1].name)
  })
})

describe('useYjsSession — local mode (no yjsServerUrl)', () => {
  it('reports status "local" and does not construct a HocuspocusProvider', async () => {
    const s = setupSession({ currentContent: 'hello' })
    await flushPromises()
    expect(providerInstances).toHaveLength(0)
    expect(unref(s.session.status)).toBe('local')
  })

  it('hydrates the Y.Doc from currentContent (election degenerates to "we win")', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const s = setupSession({ currentContent: 'hello local' })
    await flushPromises()
    // Local mode skips the remote-only 150ms awareness-settle wait and
    // hydrates immediately; advancing timers here is just belt-and-braces.
    vi.advanceTimersByTime(200)
    await flushPromises()

    expect(s.ydoc).toBeTruthy()
    expect(s.ydoc!.getText(SHARED_TEXT_KEY).toString()).toBe('hello local')
  })

  it('exposes a real Awareness instance and no provider', async () => {
    const s = setupSession({ currentContent: 'x' })
    await flushPromises()
    expect(unref(s.session.awareness)).toBeInstanceOf(Awareness)
    expect(unref(s.session.provider)).toBeNull()
    expect(unref(s.session.isReady)).toBe(true)
  })
})

describe('useYjsSession — failed hydration', () => {
  const META_KEY = '_oc_meta'
  const throwingAdapter: YjsAdapter = {
    ...testAdapter,
    hydrate() {
      throw new Error('adapter blew up')
    }
  }

  // The doc stays empty but the file on disk does not, and the etag we hold
  // still matches it. An editable empty editor would let the first keystroke
  // autosave over the real content with a valid If-Match and no conflict, so
  // the session locks instead of only surfacing an error.
  it('locks the session read-only instead of mounting an editable empty doc', async () => {
    const s = setupSession({ currentContent: 'the real file body', adapter: throwingAdapter })
    await flushPromises()

    expect(s.ydoc!.getText(SHARED_TEXT_KEY).toString()).toBe('')
    expect(unref(s.session.isLockedForReload)).toBe(true)
    expect(unref(s.session.error)).toBeTruthy()
  })

  // Still releases the gate: AppWrapper keeps its loading screen up until
  // `isReady`, so leaving it false would replace the error with an eternal
  // spinner.
  it('still releases the loading gate', async () => {
    const s = setupSession({ currentContent: 'the real file body', adapter: throwingAdapter })
    await flushPromises()

    expect(unref(s.session.isReady)).toBe(true)
  })

  // The seeding announce goes out before the hydrate so read-only peers drop
  // their private copy in time. Left standing after a throw, it promises
  // content that never arrives and every viewer stares at a blank room.
  it('withdraws the seeding announce so another peer can seed', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const s = setupSession({
      yjsServerUrl: 'wss://example.test/yjs',
      currentContent: 'the real file body',
      adapter: throwingAdapter
    })
    await flushPromises()

    providerInstances[0].triggerSynced()
    vi.advanceTimersByTime(200)
    await flushPromises()

    expect(s.ydoc!.getMap(META_KEY).get('hydrated')).toBeUndefined()
  })
})

describe('useYjsSession — remote mode (yjsServerUrl set)', () => {
  it('constructs a HocuspocusProvider with the appVersion query param appended', async () => {
    setupSession({ yjsServerUrl: 'wss://example.test/yjs', appVersion: '2.3.4' })
    await flushPromises()
    expect(providerInstances).toHaveLength(1)
    expect(providerInstances[0].url).toBe('wss://example.test/yjs?appVersion=2.3.4')
    expect(providerInstances[0].setAwarenessField).toHaveBeenCalledWith('user', {})
  })

  // Regression: the election counted every awareness peer, but a read-only
  // client never seeds - the server rejects its writes, it only hydrates a
  // private copy. So whenever a viewer happened to hold the lower clientID, the
  // editor deferred to it and nobody seeded: a blank editor over a file that is
  // not blank, one keystroke away from being saved over the real content.
  it('ignores read-only peers in the hydration election', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const s = setupSession({
      yjsServerUrl: 'wss://example.test/yjs',
      currentContent: 'the real file body'
    })
    await flushPromises()

    // A read-only peer that won the election by holding the lower clientID.
    const readOnlyPeer = s.ydoc!.clientID - 1
    providerInstances[0].awareness.states.set(readOnlyPeer, {
      user: { id: 'viewer', name: 'Margaret Hamilton' },
      _oc_canSeed: false
    })

    providerInstances[0].triggerSynced()
    vi.advanceTimersByTime(200)
    await flushPromises()

    expect(s.ydoc!.getText(SHARED_TEXT_KEY).toString()).toBe('the real file body')
  })

  // The flip side: a peer that *can* seed still wins on the lower clientID, so
  // two editors entering together do not both hydrate and duplicate the body.
  it('still defers to a writable peer holding the lower clientID', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const s = setupSession({
      yjsServerUrl: 'wss://example.test/yjs',
      currentContent: 'the real file body'
    })
    await flushPromises()

    const writablePeer = s.ydoc!.clientID - 1
    providerInstances[0].awareness.states.set(writablePeer, {
      user: { id: 'editor', name: 'Mary Kenneth Keller' },
      _oc_canSeed: true
    })

    providerInstances[0].triggerSynced()
    vi.advanceTimersByTime(200)
    await flushPromises()

    expect(s.ydoc!.getText(SHARED_TEXT_KEY).toString()).toBe('')
  })

  it('announces whether it can seed the room', async () => {
    setupSession({ yjsServerUrl: 'wss://example.test/yjs', isReadOnly: true })
    await flushPromises()
    expect(providerInstances[0].setAwarenessField).toHaveBeenCalledWith('_oc_canSeed', false)

    providerInstances.length = 0
    setupSession({ yjsServerUrl: 'wss://example.test/yjs' })
    await flushPromises()
    expect(providerInstances[0].setAwarenessField).toHaveBeenCalledWith('_oc_canSeed', true)
  })

  it('does not hydrate until onSynced fires (remote waits for the server)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const s = setupSession({
      yjsServerUrl: 'wss://example.test/yjs',
      currentContent: 'should-only-land-after-sync'
    })
    await flushPromises()
    vi.advanceTimersByTime(500)
    await flushPromises()

    expect(s.ydoc!.getText(SHARED_TEXT_KEY).toString()).toBe('')
    expect(unref(s.session.isReady)).toBe(false)

    providerInstances[0].triggerSynced()
    vi.advanceTimersByTime(200)
    await flushPromises()
    expect(s.ydoc!.getText(SHARED_TEXT_KEY).toString()).toBe('should-only-land-after-sync')
    expect(unref(s.session.isReady)).toBe(true)
  })

  it('surfaces an auth failure as an error, locks read-only and releases the loading gate', async () => {
    const s = setupSession({ yjsServerUrl: 'wss://example.test/yjs' })
    await flushPromises()
    providerInstances[0].triggerAuthFailed('token expired')
    await flushPromises()

    expect(unref(s.session.error)?.message).toBe('token expired')
    expect(unref(s.session.isLockedForReload)).toBe(true)
    expect(unref(s.session.isReady)).toBe(true)
  })

  // Regression: the gate was released on an empty Y.Doc, so an expired token
  // rendered the user's document as a blank page next to a toast. They had
  // just fetched the file over WebDAV, so showing it is neither a leak nor a
  // guess - and a blank editor reads exactly like data loss.
  it('still shows the file after an auth failure', async () => {
    const s = setupSession({
      yjsServerUrl: 'wss://example.test/yjs',
      currentContent: 'my important notes'
    })
    await flushPromises()
    providerInstances[0].triggerAuthFailed('token expired')
    await flushPromises()

    expect(s.ydoc!.getText(SHARED_TEXT_KEY).toString()).toBe('my important notes')
  })

  // Regression: the local hydration above was added without stopping the
  // provider. `permissionDeniedHandler` leaves `shouldConnect` true, so the
  // socket keeps retrying - and an attempt that later succeeded would merge the
  // locally seeded copy into a room already holding the same content,
  // duplicating the document for every peer.
  it('stops retrying after an auth failure, so the local copy cannot merge back', async () => {
    const s = setupSession({
      yjsServerUrl: 'wss://example.test/yjs',
      currentContent: 'my important notes'
    })
    await flushPromises()
    providerInstances[0].triggerAuthFailed('token expired')
    await flushPromises()

    expect(providerInstances[0].disconnect).toHaveBeenCalled()
    // Detached as well as disconnected. A disconnected-but-attached provider
    // still takes every doc update through `send()` into the websocket's
    // `messageQueue`, where nothing ever drains it.
    expect(providerInstances[0].detach).toHaveBeenCalled()
    // The session is dead, so it must not keep claiming to be connected -
    // callers gate conflict reconciliation on that.
    expect(unref(s.session.status)).toBe('disconnected')
    expect(unref(s.session.isReady)).toBe(true)
  })

  // A token expiring mid-session leaves a live, populated document. Re-entering
  // the hydration path there would re-run the etag-drift check and could plant
  // `isStale` plus a `recoveryClientId` claim this now read-only client will
  // never act on - leaving the room flagged stale with a dead claim.
  it('does not re-run hydration when the token expires mid-session', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const s = setupSession({
      yjsServerUrl: 'wss://example.test/yjs',
      currentContent: 'seeded body',
      resource: makeResource({ etag: 'etag-new' })
    })
    await flushPromises()
    providerInstances[0].triggerSynced()
    // Past the 150ms hydration-election wait.
    vi.advanceTimersByTime(200)
    await flushPromises()
    expect(unref(s.session.isReady)).toBe(true)

    // The room's etag drifts away from ours, which the drift check would act on.
    s.ydoc!.getMap('_oc_meta').set('etag', 'etag-old')
    providerInstances[0].triggerAuthFailed('token expired')
    await flushPromises()

    const meta = s.ydoc!.getMap('_oc_meta')
    expect(meta.get('isStale')).toBeUndefined()
    expect(meta.get('recoveryClientId')).toBeUndefined()
  })
})

describe('useYjsSession — unreachable Yjs server', () => {
  const yjsServerUrl = 'wss://example.test/yjs'

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  // Regression: a server that never answers produces neither `onSynced` nor
  // `onAuthenticationFailed`. The provider just kept retrying, so `isReady`
  // never flipped and `AppWrapper` sat on its loading screen forever - one
  // typo in `yjsServerUrl` took every editor in the deployment offline.
  it('keeps the gate shut while the connect is still in flight', async () => {
    const s = setupSession({ yjsServerUrl, currentContent: 'the file body' })
    await flushPromises()
    vi.advanceTimersByTime(9_000)
    await flushPromises()

    expect(unref(s.session.isReady)).toBe(false)
  })

  it('falls back to a local session once the connect times out', async () => {
    const s = setupSession({ yjsServerUrl, currentContent: 'the file body' })
    await flushPromises()
    vi.advanceTimersByTime(11_000)
    await flushPromises()

    // Editable and hydrated rather than a blank page behind a spinner.
    expect(unref(s.session.isReady)).toBe(true)
    expect(s.ydoc!.getText(SHARED_TEXT_KEY).toString()).toBe('the file body')
    expect(unref(s.session.status)).toBe('disconnected')
    expect(unref(s.session.error)).toBeTruthy()
    // Read-only would be wrong here: there is nothing stopping the user from
    // saving, the file just does not sync.
    expect(unref(s.session.isLockedForReload)).toBe(false)
    // Stopped retrying, but not destroyed - the editor binds to its awareness.
    expect(providerInstances[0].disconnect).toHaveBeenCalled()
    // Detached too, so the updates the user keeps typing are dropped instead of
    // piling up in the websocket's `messageQueue`.
    expect(providerInstances[0].detach).toHaveBeenCalled()
    expect(providerInstances[0].destroy).not.toHaveBeenCalled()
  })

  it('does not fall back once the server answered in time', async () => {
    const s = setupSession({ yjsServerUrl, currentContent: 'the file body' })
    await flushPromises()
    providerInstances[0].triggerSynced()
    vi.advanceTimersByTime(20_000)
    await flushPromises()

    expect(unref(s.session.error)).toBeNull()
    expect(providerInstances[0].disconnect).not.toHaveBeenCalled()
  })

  it('does not fall back once authentication already failed', async () => {
    const s = setupSession({ yjsServerUrl })
    await flushPromises()
    providerInstances[0].triggerAuthFailed('token expired')
    vi.advanceTimersByTime(20_000)
    await flushPromises()

    // The auth reason survives: the timeout must not overwrite it with its own
    // "server could not be reached" message.
    expect(unref(s.session.error)?.message).toBe('token expired')
    // Auth failure disconnects too (see below), so exactly one disconnect - the
    // timeout did not add a second.
    expect(providerInstances[0].disconnect).toHaveBeenCalledOnce()
  })
})

describe('useYjsSession — read-only clients', () => {
  // Regression: read-only clients used to skip hydration entirely, so a viewer
  // that opened a file nobody else was editing got a blank document.
  it('hydrates a private copy in local mode', async () => {
    const s = setupSession({ currentContent: 'read me', isReadOnly: true })
    await flushPromises()

    expect(s.ydoc!.getText(SHARED_TEXT_KEY).toString()).toBe('read me')
  })

  it('hydrates a private copy when the room is empty, without claiming the seeding', async () => {
    const s = setupSession({
      yjsServerUrl: 'wss://example.test/yjs',
      currentContent: 'read me',
      isReadOnly: true
    })
    await flushPromises()
    providerInstances[0].triggerSynced()
    await flushPromises()

    expect(s.ydoc!.getText(SHARED_TEXT_KEY).toString()).toBe('read me')
    // The seeding announcement is what makes peers drop their private copy.
    // Only a client that writes to the room may raise it.
    expect(s.ydoc!.getMap('_oc_meta').get('hydrated')).toBeUndefined()
  })

  it('does not hydrate when the room already has content', async () => {
    const s = setupSession({
      yjsServerUrl: 'wss://example.test/yjs',
      currentContent: 'stale local copy',
      isReadOnly: true
    })
    await flushPromises()

    const peer = new Y.Doc()
    peer.getText(SHARED_TEXT_KEY).insert(0, 'from a peer')
    Y.applyUpdate(s.ydoc!, Y.encodeStateAsUpdate(peer))

    providerInstances[0].triggerSynced()
    await flushPromises()

    expect(s.ydoc!.getText(SHARED_TEXT_KEY).toString()).toBe('from a peer')
  })

  // A private copy merging with a peer's seeding would duplicate the whole
  // document, so the session is thrown away and rebuilt from the room instead.
  it('rebuilds the session when a peer announces its seeding', async () => {
    const s = setupSession({
      yjsServerUrl: 'wss://example.test/yjs',
      currentContent: 'read me',
      isReadOnly: true
    })
    await flushPromises()
    providerInstances[0].triggerSynced()
    await flushPromises()
    const privateDoc = s.ydoc
    expect(privateDoc!.getText(SHARED_TEXT_KEY).toString()).toBe('read me')

    // A remote transaction has no string origin, which is what tells the
    // observer this came from a peer.
    privateDoc!.transact(() => privateDoc!.getMap('_oc_meta').set('hydrated', true))
    await flushPromises()

    expect(s.ydoc).not.toBe(privateDoc)
    expect(privateDoc!.isDestroyed).toBe(true)
    expect(providerInstances).toHaveLength(2)
    expect(s.ydoc!.getText(SHARED_TEXT_KEY).toString()).toBe('')
  })

  it('does not rebuild for a writer that seeds the room itself', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const s = setupSession({
      yjsServerUrl: 'wss://example.test/yjs',
      currentContent: 'write me'
    })
    await flushPromises()
    providerInstances[0].triggerSynced()
    vi.advanceTimersByTime(200)
    await flushPromises()

    expect(s.ydoc!.getMap('_oc_meta').get('hydrated')).toBe(true)
    expect(s.ydoc!.getText(SHARED_TEXT_KEY).toString()).toBe('write me')
    expect(providerInstances).toHaveLength(1)
  })
})

describe('useYjsSession — content reporting', () => {
  it('reports debounced after a user-origin Y.Doc update', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const s = setupSession({ currentContent: 'seed' })
    await flushPromises()
    vi.advanceTimersByTime(200)
    await flushPromises()
    s.onContentChange.mockClear()

    s.ydoc!.getText(SHARED_TEXT_KEY).insert(4, ' edit') // no origin = user-typed

    // Nothing reported within the debounce window yet.
    vi.advanceTimersByTime(100)
    await flushPromises()
    expect(s.onContentChange).not.toHaveBeenCalled()

    // 300ms after the last edit, the debounced serialize fires.
    vi.advanceTimersByTime(300)
    await flushPromises()
    expect(s.onContentChange).toHaveBeenLastCalledWith('seed edit')
  })

  // Regression: serialization is not byte-identical to the file it came from
  // (Tiptap renormalises markdown, for one). Reporting the post-hydration
  // state would leave AppWrapper with currentContent !== serverContent, so an
  // untouched file would open dirty: save enabled, unsaved-changes modal on
  // navigate, and an autosave that silently reformats the file.
  it('does NOT report content produced by its own hydration', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const s = setupSession({ currentContent: 'seed', adapter: normalizingAdapter })
    await flushPromises()
    vi.advanceTimersByTime(1000)
    await flushPromises()

    // The doc really did get hydrated, and serializing it really would differ
    // from the file — so the absence of a report is the behaviour under test,
    // not a no-op.
    expect(s.ydoc!.getText(SHARED_TEXT_KEY).toString()).toBe('seed')
    expect(normalizingAdapter.serialize(s.ydoc!)).toBe('seed\n')
    expect(s.onContentChange).not.toHaveBeenCalled()
  })

  // Same failure for anyone who joins an already-hydrated room: the initial
  // sync lands a large update before onSynced, which must not read as an edit.
  it('does NOT report content arriving through the initial sync', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const s = setupSession({
      yjsServerUrl: 'wss://example.test/yjs',
      currentContent: 'seed',
      adapter: normalizingAdapter
    })
    await flushPromises()

    // A peer hydrated first; the server ships us its state before onSynced.
    const peer = new Y.Doc()
    peer.getText(SHARED_TEXT_KEY).insert(0, 'from a peer')
    Y.applyUpdate(s.ydoc!, Y.encodeStateAsUpdate(peer))

    providerInstances[0].triggerSynced()
    vi.advanceTimersByTime(1000)
    await flushPromises()

    expect(s.ydoc!.getText(SHARED_TEXT_KEY).toString()).toBe('from a peer')
    expect(s.onContentChange).not.toHaveBeenCalled()
  })

  it('reports again once a real edit follows hydration', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const s = setupSession({ currentContent: 'seed', adapter: normalizingAdapter })
    await flushPromises()
    vi.advanceTimersByTime(1000)
    await flushPromises()
    expect(s.onContentChange).not.toHaveBeenCalled()

    s.ydoc!.getText(SHARED_TEXT_KEY).insert(4, ' edit')
    vi.advanceTimersByTime(400)
    await flushPromises()
    expect(s.onContentChange).toHaveBeenLastCalledWith('seed edit\n')
  })
})

describe('useYjsSession — stale-state recovery', () => {
  const yjsServerUrl = 'wss://example.test/yjs'
  const META_KEY = '_oc_meta'

  /**
   * Brings a session up in remote mode against a room whose `_oc_meta.etag`
   * predates the file on disk, which is what makes the joining client detect
   * drift and claim the recovery.
   */
  async function syncIntoStaleRoom({
    currentContent = 'fresh body',
    roomEtag = 'etag-old',
    ourEtag = 'etag-new',
    adapter = testAdapter as YjsAdapter,
    roomContent = 'stale room content'
  } = {}) {
    const s = setupSession({
      yjsServerUrl,
      currentContent,
      adapter,
      resource: makeResource({ etag: ourEtag })
    })
    await flushPromises()

    // What the room already holds when we arrive.
    const doc = s.ydoc!
    doc.getText(SHARED_TEXT_KEY).insert(0, roomContent)
    doc.getMap(META_KEY).set('etag', roomEtag)

    providerInstances[0].triggerSynced()
    await flushPromises()
    return s
  }

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  it('flags the room stale and claims the recovery when the etag drifted', async () => {
    const s = await syncIntoStaleRoom()
    const meta = s.ydoc!.getMap(META_KEY)

    expect(meta.get('isStale')).toBe(true)
    expect(meta.get('nativeEtag')).toBe('etag-new')
    expect(meta.get('recoveryClientId')).toBe(s.ydoc!.clientID)
  })

  // Regression: recovery used to re-seed from whatever the elected peer held
  // at that moment. By then the room has synced its own state in and the
  // debounced serialize has reported it back into `currentContent`, so the
  // recovery published the *stale* body and stamped the fresh etag on it. The
  // next save then overwrote the external writer with a matching If-Match.
  it('re-seeds from the body captured at detection, not from later currentContent', async () => {
    const s = await syncIntoStaleRoom({ currentContent: 'fresh body' })

    // Stands in for the debounced serialize reporting the room's own content
    // back to the caller while recovery is still settling.
    s.contentRef.value = 'stale room content'

    vi.advanceTimersByTime(200)
    await flushPromises()

    const meta = s.ydoc!.getMap(META_KEY)
    expect(s.ydoc!.getText(SHARED_TEXT_KEY).toString()).toBe('fresh body')
    expect(meta.get('isStale')).toBeUndefined()
    expect(meta.get('nativeEtag')).toBeUndefined()
    expect(meta.get('recoveryClientId')).toBeUndefined()
    expect(meta.get('etag')).toBe('etag-new')
  })

  // Regression: the election was "lowest awareness clientId wins" over every
  // peer in the room, so a client that never saw the drift - and therefore
  // holds no fresh body - could win and publish its own older copy.
  it('does not re-seed on a peer that did not detect the drift', async () => {
    const s = setupSession({
      yjsServerUrl,
      currentContent: 'my own older copy',
      resource: makeResource({ etag: 'etag-old' })
    })
    await flushPromises()
    providerInstances[0].triggerSynced()
    vi.advanceTimersByTime(200)
    await flushPromises()
    expect(s.ydoc!.getText(SHARED_TEXT_KEY).toString()).toBe('my own older copy')

    // A peer elsewhere in the room notices the drift and flags it.
    const meta = s.ydoc!.getMap(META_KEY)
    s.ydoc!.transact(() => {
      meta.set('nativeEtag', 'etag-new')
      meta.set('recoveryClientId', s.ydoc!.clientID + 1)
      meta.set('isStale', true)
    })
    vi.advanceTimersByTime(200)
    await flushPromises()

    // Untouched: re-seeding here would publish content that predates the
    // external write and then stamp the fresh etag onto it.
    expect(s.ydoc!.getText(SHARED_TEXT_KEY).toString()).toBe('my own older copy')
    expect(meta.get('isStale')).toBe(true)
  })

  it('does not re-seed on a read-only client', async () => {
    const s = setupSession({
      yjsServerUrl,
      currentContent: 'viewer copy',
      isReadOnly: true,
      resource: makeResource({ etag: 'etag-new' })
    })
    await flushPromises()
    const doc = s.ydoc!
    doc.getText(SHARED_TEXT_KEY).insert(0, 'stale room content')
    doc.getMap(META_KEY).set('etag', 'etag-old')
    providerInstances[0].triggerSynced()
    vi.advanceTimersByTime(200)
    await flushPromises()

    expect(doc.getText(SHARED_TEXT_KEY).toString()).toBe('stale room content')
  })

  // The reset lands before the hydrate, so a throw in between leaves every peer
  // looking at an empty document. Locking stops the autosave from writing that
  // emptiness to disk, and `isStale` stays up so a later joiner retries.
  it('keeps the room flagged and locks the session when re-seeding throws', async () => {
    const failingAdapter: YjsAdapter = {
      ...testAdapter,
      hydrate(ydoc: Y.Doc, content: string) {
        if (ydoc.getMap(META_KEY).get('isStale') === true) {
          throw new Error('adapter blew up')
        }
        testAdapter.hydrate(ydoc, content)
      }
    }
    const s = await syncIntoStaleRoom({ adapter: failingAdapter })
    vi.advanceTimersByTime(200)
    await flushPromises()

    const meta = s.ydoc!.getMap(META_KEY)
    expect(meta.get('isStale')).toBe(true)
    expect(unref(s.session.isLockedForReload)).toBe(true)
    expect(unref(s.session.error)).toBeTruthy()
  })

  // The claim is deliberately stealable: whoever was elected may have navigated
  // away mid-recovery, and then nobody would finish. Safe because `hydrate` is
  // synchronous by contract - reset, hydrate and commit run in one go, so a
  // claim cannot move underneath a client that is already working.
  it('takes the claim over from a peer that has left', async () => {
    const s = setupSession({
      yjsServerUrl,
      currentContent: 'fresh body',
      resource: makeResource({ etag: 'etag-new' })
    })
    await flushPromises()

    const doc = s.ydoc!
    const meta = doc.getMap(META_KEY)
    // Claimed by a client that is no longer in awareness: nobody would finish.
    doc.transact(() => {
      meta.set('nativeEtag', 'etag-new')
      meta.set('recoveryClientId', doc.clientID + 99)
      meta.set('isStale', true)
    })

    providerInstances[0].triggerSynced()
    vi.advanceTimersByTime(200)
    await flushPromises()

    expect(doc.getText(SHARED_TEXT_KEY).toString()).toBe('fresh body')
    expect(meta.get('isStale')).toBeUndefined()
  })

  // Reset, hydrate and commit are one uninterrupted run, so a peer's update
  // cannot land in between and leave the document half-recovered.
  it('resets, re-seeds and clears the flags without yielding', async () => {
    const seen: string[] = []
    const observingAdapter: YjsAdapter = {
      ...testAdapter,
      hydrate(ydoc: Y.Doc, content: string) {
        const meta = ydoc.getMap(META_KEY)
        // Mid-recovery: the flags are still up, the doc is already wiped.
        seen.push(`isStale=${meta.get('isStale')} content="${testAdapter.serialize(ydoc)}"`)
        testAdapter.hydrate(ydoc, content)
      }
    }

    const s = await syncIntoStaleRoom({ adapter: observingAdapter })
    vi.advanceTimersByTime(200)
    await flushPromises()

    expect(seen).toEqual(['isStale=true content=""'])
    const meta = s.ydoc!.getMap(META_KEY)
    expect(s.ydoc!.getText(SHARED_TEXT_KEY).toString()).toBe('fresh body')
    expect(meta.get('isStale')).toBeUndefined()
  })
})

describe('useYjsSession — etag mirror', () => {
  it('writes a new resource etag into _oc_meta.etag', async () => {
    const s = setupSession({ currentContent: 'x', resource: makeResource({ etag: 'a' }) })
    await flushPromises()
    const meta = s.ydoc!.getMap('_oc_meta')

    s.resourceRef.value = makeResource({ etag: 'b' })
    await flushPromises()
    expect(meta.get('etag')).toBe('b')
    expect(meta.get('lastSavedAt')).toBeTypeOf('number')
  })

  // Regression: a new resource OBJECT whose `id` is unchanged must NOT tear
  // down and rebuild the Y.Doc. An earlier implementation used watchEffect,
  // which Vue re-ran on every tracked read — including the `resource` update
  // AppWrapper performs after each save. Every save would have rebuilt the
  // Y.Doc, losing in-flight peer edits. The current implementation gates
  // rebuilds on a `sessionKey` computed, so an identity-preserving resource
  // update is a no-op for the watch.
  it('regression: does not rebuild Y.Doc when the resource changes without identity change', async () => {
    const s = setupSession({ currentContent: 'x', resource: makeResource({ etag: 'a' }) })
    await flushPromises()
    const ydocBefore = s.ydoc
    expect(ydocBefore).toBeTruthy()
    expect(ydocBefore!.isDestroyed).toBe(false)

    s.resourceRef.value = makeResource({ etag: 'b' })
    await flushPromises()
    expect(s.ydoc).toBe(ydocBefore)
    expect(ydocBefore!.isDestroyed).toBe(false)
  })

  it('does nothing when the etag is unchanged', async () => {
    const s = setupSession({ currentContent: 'x', resource: makeResource({ etag: 'a' }) })
    await flushPromises()
    const meta = s.ydoc!.getMap('_oc_meta')
    // The initial etag may have been seeded during hydration.
    const initialMeta = meta.get('etag')

    s.resourceRef.value = makeResource({ etag: 'a' })
    await flushPromises()
    expect(meta.get('etag')).toBe(initialMeta)
  })
})

describe('useYjsSession — wasWrittenByRoom', () => {
  const yjsServerUrl = 'wss://example.test/yjs'

  // Adds a second client to awareness, so the room counts as populated.
  function addPeer(index = 0) {
    providerInstances[0].awareness.states.set(9_000 + index, { user: { id: 'peer' } })
  }

  it('confirms an etag the room has already published', async () => {
    const s = setupSession({ yjsServerUrl, currentContent: 'x' })
    await flushPromises()
    providerInstances[0].triggerSynced()
    await flushPromises()
    s.ydoc!.getMap('_oc_meta').set('etag', 'etag-from-a-peer')

    await expect(s.session.wasWrittenByRoom('etag-from-a-peer')).resolves.toBe(true)
  })

  // The case that matters: a desktop client syncs the file while the user has
  // it open. Nobody in the room wrote it, so republishing over it would destroy
  // content this document has never seen. Must not be mistaken for a peer save.
  it('rejects an etag no peer ever published, without waiting', async () => {
    const s = setupSession({ yjsServerUrl, currentContent: 'x' })
    await flushPromises()
    providerInstances[0].triggerSynced()
    await flushPromises()
    addPeer()

    await expect(s.session.wasWrittenByRoom('etag-from-a-desktop-client', 20)).resolves.toBe(false)
  })

  it('waits out the hop for a peer stamping its save a moment later', async () => {
    const s = setupSession({ yjsServerUrl, currentContent: 'x' })
    await flushPromises()
    providerInstances[0].triggerSynced()
    await flushPromises()
    addPeer()

    // The peer's PUT already landed on the server; its `_oc_meta` update is
    // still in flight when our own save conflicts.
    const pending = s.session.wasWrittenByRoom('etag-in-flight', 5_000)
    s.ydoc!.getMap('_oc_meta').set('etag', 'etag-in-flight')

    await expect(pending).resolves.toBe(true)
  })

  it('does not wait when there is nobody left to hear from', async () => {
    const s = setupSession({ yjsServerUrl, currentContent: 'x' })
    await flushPromises()
    providerInstances[0].triggerSynced()
    await flushPromises()

    // Alone in the room: the only client that could move the room's etag is us,
    // so a long timeout must still resolve immediately.
    await expect(s.session.wasWrittenByRoom('etag-nobody-published', 60_000)).resolves.toBe(false)
  })

  it('reports false in local mode, where there is no room to speak for', async () => {
    const s = setupSession({ currentContent: 'x' })
    await flushPromises()

    await expect(s.session.wasWrittenByRoom('any-etag', 20)).resolves.toBe(false)
  })
})

describe('useYjsSession — peer save fan-out', () => {
  const META_KEY = '_oc_meta'

  /**
   * A real second Y.Doc rather than a local transaction on our own: the whole
   * question here is what the saver had in its state vector, and writing
   * through our own doc would advance our own clock along with it.
   */
  function peerSaves(ourDoc: Y.Doc, etag = 'peer-etag') {
    const peer = new Y.Doc()
    Y.applyUpdate(peer, Y.encodeStateAsUpdate(ourDoc))
    peer.transact(() => {
      const meta = peer.getMap(META_KEY)
      meta.set('etag', etag)
      meta.set('savedStateVector', Y.encodeStateVector(peer))
      meta.set('lastSavedAt', 1)
    })
    Y.applyUpdate(ourDoc, Y.encodeStateAsUpdate(peer, Y.encodeStateVector(ourDoc)))
  }

  it('reports server content and etag when the save covers our edits', async () => {
    const s = setupSession({ currentContent: 'seed' })
    await flushPromises()

    peerSaves(s.ydoc!)
    await flushPromises()

    expect(s.onEtagChange).toHaveBeenCalledWith('peer-etag')
    expect(s.onServerContentChange).toHaveBeenCalledWith('seed')
  })

  // Regression: the fan-out used to serialize our own doc and report it as
  // "this is on disk" no matter what the peer actually wrote. An edit that had
  // not reached the peer before its PUT dropped our dirty flag, which also
  // unregisters `beforeunload` and waves the route-leave guard through, so the
  // edit was gone with the tab.
  it('stays dirty when we hold an edit the peer did not have', async () => {
    const s = setupSession({ currentContent: 'seed' })
    await flushPromises()

    const peer = new Y.Doc()
    Y.applyUpdate(peer, Y.encodeStateAsUpdate(s.ydoc!))
    const svBeforeOurEdit = Y.encodeStateVector(peer)

    // We type after the peer's snapshot but before its PUT lands.
    s.ydoc!.getText(SHARED_TEXT_KEY).insert(4, ' plus mine')

    peer.transact(() => {
      const meta = peer.getMap(META_KEY)
      meta.set('etag', 'peer-etag')
      meta.set('savedStateVector', svBeforeOurEdit)
      meta.set('lastSavedAt', 1)
    })
    Y.applyUpdate(s.ydoc!, Y.encodeStateAsUpdate(peer, Y.encodeStateVector(s.ydoc!)))
    await flushPromises()

    // The etag is factual and still worth mirroring - it keeps our next
    // If-Match correct - but our content is not on disk.
    expect(s.onEtagChange).toHaveBeenCalledWith('peer-etag')
    expect(s.onServerContentChange).not.toHaveBeenCalled()
  })

  it('stays dirty when the peer published no state vector', async () => {
    const s = setupSession({ currentContent: 'seed' })
    await flushPromises()

    const peer = new Y.Doc()
    Y.applyUpdate(peer, Y.encodeStateAsUpdate(s.ydoc!))
    peer.transact(() => {
      const meta = peer.getMap(META_KEY)
      meta.set('etag', 'peer-etag')
      meta.set('lastSavedAt', 1)
    })
    Y.applyUpdate(s.ydoc!, Y.encodeStateAsUpdate(peer, Y.encodeStateVector(s.ydoc!)))
    await flushPromises()

    expect(s.onServerContentChange).not.toHaveBeenCalled()
  })
})

describe('useYjsSession — cleanup', () => {
  it('destroys provider, awareness and doc on unmount (remote mode)', async () => {
    const s = setupSession({ yjsServerUrl: 'wss://example.test/yjs' })
    await flushPromises()
    const prov = providerInstances[0]
    const ydoc = s.ydoc
    const awarenessDestroy = vi.spyOn(prov.awareness, 'destroy')
    expect(ydoc!.isDestroyed).toBe(false)

    s.wrapper.unmount()
    expect(prov.destroy).toHaveBeenCalledOnce()
    // The provider owns the awareness in remote mode and takes it down itself.
    // Not asserting a call count: `Y.Doc.destroy()` cascades into the awareness
    // too (y-protocols registers `doc.on('destroy')`), so a count would pin
    // library behaviour rather than ours.
    expect(awarenessDestroy).toHaveBeenCalled()
    expect(ydoc!.isDestroyed).toBe(true)
  })

  it('destroys awareness and doc on unmount (local mode)', async () => {
    const s = setupSession({ currentContent: 'x' })
    await flushPromises()
    const ydoc = s.ydoc
    expect(ydoc!.isDestroyed).toBe(false)

    s.wrapper.unmount()
    expect(ydoc!.isDestroyed).toBe(true)
    expect(providerInstances).toHaveLength(0)
  })
})
