// Unit coverage for the collaborative session composable that AppWrapper owns
// on behalf of collaborative apps. It carries the non-trivial branching
// (collab vs local) and a handful of side effects (debounced content reports,
// etag mirror, lifecycle teardown) that aren't exercised by the cucumber e2e
// suites unless we run them through the whole OC + sidecar stack.
//
// We mock HocuspocusProvider so the tests stay hermetic (no network). A tiny
// inline adapter mimics a Y.Text-on-'content' layout; the composable only sees
// the CollaborativeAdapter interface and doesn't care which app produced it.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { nextTick, ref, shallowRef, unref } from 'vue'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import type { Resource } from '@opencloud-eu/web-client'

import {
  useCollaborativeDocument,
  type CollaborativeAdapter,
  type CollaborativeDocument
} from '../../../../src/composables/collaborative'
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
    destroy = vi.fn()
    disconnect = vi.fn()
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
const testAdapter: CollaborativeAdapter = {
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
const normalizingAdapter: CollaborativeAdapter = {
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
  adapter = testAdapter as CollaborativeAdapter,
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
  let session: CollaborativeDocument

  const wrapper = getComposableWrapper(
    () => {
      session = useCollaborativeDocument({
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
    { pluginOptions: { piniaOptions: { configState: { options: { yjsServerUrl } } } } }
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

describe('useCollaborativeDocument — enabled gate', () => {
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

describe('useCollaborativeDocument — local mode (no yjsServerUrl)', () => {
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
    // Local mode skips the collab-only 150ms awareness-settle wait and
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

describe('useCollaborativeDocument — collab mode (yjsServerUrl set)', () => {
  it('constructs a HocuspocusProvider with the appVersion query param appended', async () => {
    setupSession({ yjsServerUrl: 'wss://example.test/realtime', appVersion: '2.3.4' })
    await flushPromises()
    expect(providerInstances).toHaveLength(1)
    expect(providerInstances[0].url).toBe('wss://example.test/realtime?appVersion=2.3.4')
    expect(providerInstances[0].setAwarenessField).toHaveBeenCalledWith('user', {})
  })

  it('does not hydrate until onSynced fires (collab waits for the server)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const s = setupSession({
      yjsServerUrl: 'wss://example.test/realtime',
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
    const s = setupSession({ yjsServerUrl: 'wss://example.test/realtime' })
    await flushPromises()
    providerInstances[0].triggerAuthFailed('token expired')
    await nextTick()

    expect(unref(s.session.error)?.message).toBe('token expired')
    expect(unref(s.session.isLockedForReload)).toBe(true)
    expect(unref(s.session.isReady)).toBe(true)
  })
})

describe('useCollaborativeDocument — read-only clients', () => {
  // Regression: read-only clients used to skip hydration entirely, so a viewer
  // that opened a file nobody else was editing got a blank document.
  it('hydrates a private copy in local mode', async () => {
    const s = setupSession({ currentContent: 'read me', isReadOnly: true })
    await flushPromises()

    expect(s.ydoc!.getText(SHARED_TEXT_KEY).toString()).toBe('read me')
  })

  it('hydrates a private copy when the room is empty, without claiming the seeding', async () => {
    const s = setupSession({
      yjsServerUrl: 'wss://example.test/realtime',
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
      yjsServerUrl: 'wss://example.test/realtime',
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
      yjsServerUrl: 'wss://example.test/realtime',
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
      yjsServerUrl: 'wss://example.test/realtime',
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

describe('useCollaborativeDocument — content reporting', () => {
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
      yjsServerUrl: 'wss://example.test/realtime',
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

describe('useCollaborativeDocument — etag mirror', () => {
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

describe('useCollaborativeDocument — peer save fan-out', () => {
  it('reports server content and etag when a remote peer stamps _oc_meta', async () => {
    const s = setupSession({ currentContent: 'seed' })
    await flushPromises()
    const meta = s.ydoc!.getMap('_oc_meta')

    // A remote transaction has no string origin, which is how the observer
    // tells a peer save apart from our own etag mirror.
    s.ydoc!.transact(() => {
      meta.set('etag', 'peer-etag')
      meta.set('lastSavedAt', 1)
    })
    await flushPromises()

    expect(s.onEtagChange).toHaveBeenCalledWith('peer-etag')
    expect(s.onServerContentChange).toHaveBeenCalledWith('seed')
  })
})

describe('useCollaborativeDocument — cleanup', () => {
  it('destroys provider, awareness and doc on unmount (collab mode)', async () => {
    const s = setupSession({ yjsServerUrl: 'wss://example.test/realtime' })
    await flushPromises()
    const prov = providerInstances[0]
    const ydoc = s.ydoc
    expect(ydoc!.isDestroyed).toBe(false)

    s.wrapper.unmount()
    expect(prov.destroy).toHaveBeenCalledOnce()
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
