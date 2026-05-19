// Unit coverage for the wrapper that lives in web-pkg and is shared by
// the codemirror / tiptap / text-editor apps. The wrapper carries the
// non-trivial branching (collab vs local) and a handful of side effects
// (debounced emit, etag mirror, lifecycle teardown) that aren't exercised
// by the cucumber e2e suites unless we run them through the whole OC +
// sidecar stack.
//
// We mock HocuspocusProvider so the tests stay hermetic (no network),
// and useAuthStore / useConfigStore so we don't have to bring in pinia.
// A tiny inline adapter mimics the Y.Text-on-'content' shape that
// web-app-codemirror's real adapter uses; the wrapper only sees the
// CollaborativeAdapter interface and doesn't care which app produced it.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import type { Resource } from '@opencloud-eu/web-client'

import CollaborativeWrapper from '../../../../src/components/Collaborative/CollaborativeWrapper.vue'
import type { CollaborativeAdapter } from '../../../../src/components/Collaborative/types'

// vi.hoisted is required so providerInstances is reachable from the
// hoisted vi.mock factory; defining the class outside the factory hits
// "Cannot access before initialization".
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

vi.mock('../../../../src/composables', () => ({
  useAuthStore: () => ({ accessToken: 'test-token' }),
  useConfigStore: () => ({ serverUrl: 'https://oc.test' })
}))

// Match the codemirror adapter's shape (Y.Text on 'content'). The wrapper
// is adapter-agnostic, so any concrete adapter exercising hydrate /
// serialize / hasContent / reset works for these tests.
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
    ydoc.transact(() => {
      yText.delete(0, yText.length)
    }, 'reset')
  }
}

const DummyEditor = defineComponent({
  name: 'DummyEditor',
  props: ['ydoc', 'awareness', 'provider', 'isReadOnly'],
  setup() {
    return () => h('div', { class: 'dummy-editor' })
  }
})

function makeResource(overrides: Partial<Resource> = {}): Resource {
  return {
    id: 'storage$space!item-1',
    etag: 'etag-initial',
    ...overrides
  } as Resource
}

function mountWrapper(overrides: Record<string, unknown> = {}) {
  return mount(CollaborativeWrapper, {
    props: {
      resource: makeResource(),
      currentContent: '',
      adapter: testAdapter,
      editor: DummyEditor,
      appVersion: '1.2.3',
      realtimeUrl: null,
      ...overrides
    }
  })
}

beforeEach(() => {
  providerInstances.length = 0
})

afterEach(() => {
  vi.useRealTimers()
})

describe('CollaborativeWrapper — local mode (no realtimeUrl)', () => {
  it('reports status "local" and does not construct a HocuspocusProvider', async () => {
    const wrapper = mountWrapper({ currentContent: 'hello' })
    await flushPromises()
    expect(wrapper.text()).toContain('local')
    expect(providerInstances).toHaveLength(0)
  })

  it('hydrates the Y.Doc from currentContent (election degenerates to "we win")', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const wrapper = mountWrapper({ currentContent: 'hello local' })
    await flushPromises()
    // Hydration is gated by a 150ms awareness-settle wait.
    vi.advanceTimersByTime(200)
    await flushPromises()

    const ydocAny = (wrapper.vm as unknown as { ydoc: Y.Doc | null }).ydoc
    expect(ydocAny).toBeTruthy()
    expect(ydocAny!.getText('content').toString()).toBe('hello local')
  })

  it('mounts the editor component with a real Awareness instance', async () => {
    const wrapper = mountWrapper({ currentContent: 'x' })
    await flushPromises()
    const editor = wrapper.findComponent(DummyEditor)
    expect(editor.exists()).toBe(true)
    expect(editor.props('awareness')).toBeInstanceOf(Awareness)
    expect(editor.props('provider')).toBeNull()
  })
})

describe('CollaborativeWrapper — collab mode (realtimeUrl set)', () => {
  it('constructs a HocuspocusProvider with the appVersion query param appended', async () => {
    mountWrapper({
      realtimeUrl: 'wss://example.test/realtime',
      appVersion: '2.3.4'
    })
    await flushPromises()
    expect(providerInstances).toHaveLength(1)
    expect(providerInstances[0].url).toBe('wss://example.test/realtime?appVersion=2.3.4')
    expect(providerInstances[0].setAwarenessField).toHaveBeenCalledWith('user', {})
  })

  it('does not hydrate until onSynced fires (collab waits for the server)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const wrapper = mountWrapper({
      realtimeUrl: 'wss://example.test/realtime',
      currentContent: 'should-only-land-after-sync'
    })
    await flushPromises()
    vi.advanceTimersByTime(500)
    await flushPromises()

    const ydocAny = (wrapper.vm as unknown as { ydoc: Y.Doc }).ydoc
    expect(ydocAny.getText('content').toString()).toBe('')

    providerInstances[0].triggerSynced()
    vi.advanceTimersByTime(200)
    await flushPromises()
    expect(ydocAny.getText('content').toString()).toBe('should-only-land-after-sync')
  })

  it('surfaces an auth failure as a lifecycle error and locks the editor read-only', async () => {
    const wrapper = mountWrapper({ realtimeUrl: 'wss://example.test/realtime' })
    await flushPromises()
    providerInstances[0].triggerAuthFailed('token expired')
    await nextTick()
    expect(wrapper.text()).toContain('token expired')
    const editor = wrapper.findComponent(DummyEditor)
    expect(editor.props('isReadOnly')).toBe(true)
  })
})

describe('CollaborativeWrapper — update:currentContent emission', () => {
  it('emits debounced after a user-origin Y.Doc update', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const wrapper = mountWrapper({ currentContent: 'seed' })
    await flushPromises()
    vi.advanceTimersByTime(200)
    await flushPromises()

    const ydoc = (wrapper.vm as unknown as { ydoc: Y.Doc }).ydoc
    // Clear any emit produced by hydration (hydration uses an internal
    // origin so this should be a no-op, but we're isolating the
    // post-hydrate signal explicitly).
    ;(wrapper.emitted()['update:currentContent'] ?? []).length = 0

    ydoc.getText('content').insert(4, ' edit') // no origin = user-typed

    // Nothing emitted within the debounce window yet.
    vi.advanceTimersByTime(100)
    await flushPromises()
    expect(wrapper.emitted('update:currentContent') ?? []).toHaveLength(0)

    // 300ms after the last edit, the debounced serialize fires.
    vi.advanceTimersByTime(300)
    await flushPromises()
    const emits = wrapper.emitted('update:currentContent') ?? []
    expect(emits.length).toBeGreaterThanOrEqual(1)
    expect(emits[emits.length - 1][0]).toBe('seed edit')
  })

  it('does NOT emit for internal-origin transactions (hydrate / reset / recovery)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const wrapper = mountWrapper({ currentContent: 'seed' })
    await flushPromises()
    vi.advanceTimersByTime(200) // let hydration run
    await flushPromises()
    vi.advanceTimersByTime(400) // past the debounce window
    await flushPromises()

    // After hydration the wrapper may have emitted once with the
    // post-hydrate serialization — that's a debounce artefact, not the
    // internal-origin transaction itself. The contract we're verifying:
    // a fresh internal-origin transact() does NOT schedule a NEW emit.
    const before = (wrapper.emitted('update:currentContent') ?? []).length

    const ydoc = (wrapper.vm as unknown as { ydoc: Y.Doc }).ydoc
    ydoc.transact(() => {
      ydoc.getText('content').insert(0, 'internal-')
    }, 'hydrate')

    vi.advanceTimersByTime(400)
    await flushPromises()
    const after = (wrapper.emitted('update:currentContent') ?? []).length
    expect(after).toBe(before)
  })
})

describe('CollaborativeWrapper — etag mirror', () => {
  it('writes a new resource.etag into _oc_meta.etag', async () => {
    const wrapper = mountWrapper({ currentContent: 'x', resource: makeResource({ etag: 'a' }) })
    await flushPromises()
    const ydoc = (wrapper.vm as unknown as { ydoc: Y.Doc }).ydoc
    const meta = ydoc.getMap('_oc_meta')

    await wrapper.setProps({ resource: makeResource({ etag: 'b' }) })
    await flushPromises()
    expect(meta.get('etag')).toBe('b')
    expect(meta.get('lastSavedAt')).toBeTypeOf('number')
  })

  // Regression: `setProps({ resource })` with a new resource OBJECT whose
  // `id` is unchanged must NOT tear down and rebuild the Y.Doc. The earlier
  // implementation used `watchEffect((onCleanup) => { unref(documentName); ... })`,
  // which Vue re-ran on every tracked prop access — including `props.resource`
  // mutations from AppWrapper's post-save `resourcesStore.upsertResource`.
  // Every save would have rebuilt the Y.Doc, losing in-flight peer edits.
  // The current implementation gates rebuilds on a `sessionKey` computed
  // (documentName + realtimeUrl), so an identity-preserving resource update
  // is a no-op for the watch.
  it('regression: does not rebuild Y.Doc when resource prop changes without identity change', async () => {
    const wrapper = mountWrapper({ currentContent: 'x', resource: makeResource({ etag: 'a' }) })
    await flushPromises()
    const ydocBefore = (wrapper.vm as unknown as { ydoc: Y.Doc }).ydoc
    expect(ydocBefore).toBeTruthy()
    expect(ydocBefore.isDestroyed).toBe(false)

    // Same id, different etag — simulates AppWrapper bouncing `resource` after
    // a successful save.
    await wrapper.setProps({ resource: makeResource({ etag: 'b' }) })
    await flushPromises()
    const ydocAfter = (wrapper.vm as unknown as { ydoc: Y.Doc }).ydoc
    expect(ydocAfter).toBe(ydocBefore)
    expect(ydocBefore.isDestroyed).toBe(false)
  })

  it('does nothing when the etag is unchanged', async () => {
    const wrapper = mountWrapper({ currentContent: 'x', resource: makeResource({ etag: 'a' }) })
    await flushPromises()
    const ydoc = (wrapper.vm as unknown as { ydoc: Y.Doc }).ydoc
    const meta = ydoc.getMap('_oc_meta')
    // Initial etag may have been seeded by onProviderSynced.
    const initialMeta = meta.get('etag')

    await wrapper.setProps({ resource: makeResource({ etag: 'a' }) })
    await flushPromises()
    expect(meta.get('etag')).toBe(initialMeta)
  })
})

describe('CollaborativeWrapper — cleanup', () => {
  it('destroys provider, awareness, and doc on unmount (collab mode)', async () => {
    const wrapper = mountWrapper({ realtimeUrl: 'wss://example.test/realtime' })
    await flushPromises()
    const prov = providerInstances[0]
    const ydoc = (wrapper.vm as unknown as { ydoc: Y.Doc }).ydoc
    expect(ydoc.isDestroyed).toBe(false)

    wrapper.unmount()
    expect(prov.destroy).toHaveBeenCalledOnce()
    expect(ydoc.isDestroyed).toBe(true)
  })

  it('destroys awareness and doc on unmount (local mode)', async () => {
    const wrapper = mountWrapper({ currentContent: 'x' })
    await flushPromises()
    const ydoc = (wrapper.vm as unknown as { ydoc: Y.Doc }).ydoc
    expect(ydoc.isDestroyed).toBe(false)

    wrapper.unmount()
    expect(ydoc.isDestroyed).toBe(true)
    expect(providerInstances).toHaveLength(0)
  })
})
