import { mock } from 'vitest-mock-extended'
import { defineComponent, h, nextTick, ref, unref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import type { Resource } from '@opencloud-eu/web-client'
import type { GetFileContentsResponse } from '@opencloud-eu/web-client/webdav'
import { createMemoryHistory, createRouter } from 'vue-router'
import {
  defaultPlugins,
  defaultComponentMocks,
  mount,
  useAppDefaultsMock,
  type RouteLocation
} from '@opencloud-eu/web-test-helpers'

import AppWrapper from '../../../../src/components/AppTemplates/AppWrapper.vue'
import type { YjsSession, YjsStatus } from '../../../../src/composables/yjs'
import type { FileContext } from '../../../../src/composables/appDefaults'
import { useMessages } from '../../../../src/composables/piniaStores'

const { useAppDefaultsSpy, useYjsSessionSpy } = vi.hoisted(() => ({
  useAppDefaultsSpy: vi.fn(),
  useYjsSessionSpy: vi.fn()
}))

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  onBeforeRouteLeave: vi.fn()
}))

vi.mock('../../../../src/composables/appDefaults/useAppDefaults', () => ({
  useAppDefaults: (...args: unknown[]) => useAppDefaultsSpy(...args)
}))

// Spread the original: `YjsStatus` is a real const the wrapper compares
// against, not just a type.
vi.mock('../../../../src/composables/yjs/useYjsSession', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../src/composables/yjs/useYjsSession')>()),
  useYjsSession: (...args: unknown[]) => useYjsSessionSpy(...args)
}))

// Several tests drive the save into its conflict branch on purpose, and
// `errorPopup` logs every conflict it reports. Keep that out of the test
// output; the tests that care assert on the spy instead. File-level because
// the logs land asynchronously and would otherwise surface under whichever
// test happens to be running.
let consoleErrorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  consoleErrorSpy.mockRestore()
  vi.useRealTimers()
})

const FILE_A = mock<Resource>({
  id: 'storage$space!file-a',
  fileId: 'storage$space!file-a',
  name: 'a.md',
  etag: 'etag-a',
  permissions: 'RDNVW'
})
const FILE_B = mock<Resource>({ id: 'storage$space!file-b', name: 'b.md', permissions: 'RDNVW' })

const wrappedComponent = defineComponent({
  props: {
    resource: { type: Object, default: null },
    currentContent: { type: String, default: '' }
  },
  template: '<div />'
})

function setup({
  yjsEnabled = true,
  status = 'connected' as YjsStatus,
  // Whether the room can account for the write that caused a save conflict.
  writtenByRoom = true,
  // What the Y.Doc serializes to at conflict-retry time. Null stands for a
  // session that cannot produce one, which falls back to the pre-conflict
  // snapshot.
  mergedContent = null as string | null,
  putFileContents = vi.fn().mockResolvedValue(mock<Resource>({ etag: 'etag-saved' })),
  // Whether the room recognises an announced write as one of its own.
  roomWrite = false,
  // Whether the runtime has an authenticated SSE stream for this user.
  sse = true
} = {}) {
  const wasWrittenByRoom = vi.fn().mockResolvedValue(writtenByRoom)
  const beginSave = vi.fn()
  const serializeMerged = vi.fn().mockResolvedValue(mergedContent)
  const isRoomWrite = vi.fn().mockReturnValue(roomWrite)
  const adoptEtag = vi.fn()
  const applyExternalUpdate = vi.fn().mockResolvedValue('recovered')
  const isLockedForReload = ref(false)
  const isConflicted = ref(false)
  const markConflicted = vi.fn(() => {
    isConflicted.value = true
  })
  const statusRef = ref(status)
  const currentFileContext = ref(mock<FileContext>({ space: mock<any>(), path: '/a.md' }))
  // Deferred so the test controls when each half of the load completes.
  let resolveInfo: (r: Resource) => void
  let resolveContents: (c: GetFileContentsResponse) => void
  let rejectContents: (e: Error) => void

  const getFileInfo = vi.fn().mockImplementation(() => new Promise((r) => (resolveInfo = r)))
  const getFileContents = vi.fn().mockImplementation(
    () =>
      new Promise((resolve, reject) => {
        resolveContents = resolve
        rejectContents = reject
      })
  )
  const closeApp = vi.fn()

  useAppDefaultsSpy.mockReturnValue(
    useAppDefaultsMock({
      currentFileContext,
      getFileInfo,
      getFileContents,
      putFileContents,
      closeApp
    })
  )

  let sessionOptions: any
  useYjsSessionSpy.mockImplementation((options: any) => {
    sessionOptions = options
    return mock<YjsSession>({
      isReady: ref(true) as any,
      status: statusRef as any,
      // Auto-mocked refs are truthy, which would fold into `effectiveReadOnly`
      // and hard-wire `isDirty` to false.
      isLockedForReload: isLockedForReload as any,
      isConflicted: isConflicted as any,
      markConflicted,
      error: ref<Error | null>(null) as any,
      wasWrittenByRoom,
      beginSave,
      serializeMerged,
      isRoomWrite,
      adoptEtag,
      applyExternalUpdate
    })
  })

  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({
      query: {},
      params: { driveAliasAndItem: 'personal/alan/a.md' }
    })
  })
  // A deep mock hands back a function for every property; the wrapper
  // compares this one against the initiator in SSE events.
  ;(mocks.$clientService as any).initiatorId = 'tab-own'
  const sseListeners = new Map<string, (msg: MessageEvent) => void>()
  vi.mocked(mocks.$clientService.sseAuthenticated.addEventListener).mockImplementation(((
    topic: string,
    listener: (msg: MessageEvent) => void
  ) => {
    sseListeners.set(topic, listener)
  }) as any)

  let slotProps: any
  const wrapper = mount(AppWrapper, {
    slots: {
      default: (props: any) => {
        slotProps = props
        return h('div', { class: 'slot-content' })
      }
    },
    props: {
      applicationId: 'test-app',
      wrappedComponent,
      ...(yjsEnabled ? { yjs: { makeAdapter: () => mock<any>() } } : {})
    },
    global: {
      plugins: [
        ...defaultPlugins({
          piniaOptions: {
            appsState: { apps: { 'test-app': { id: 'test-app', name: 'Test App' } } },
            authState: { accessToken: sse ? 'token' : undefined },
            capabilityState: { capabilities: { core: { 'support-sse': sse } as any } }
          }
        }),
        createRouter({
          history: createMemoryHistory(),
          routes: [{ path: '/:all(.*)', component: wrappedComponent }]
        })
      ],
      mocks,
      provide: mocks,
      stubs: { 'file-side-bar': true }
    }
  })

  return {
    wrapper,
    currentFileContext,
    isEnabled: () => sessionOptions?.enabled(),
    isLockedForReload,
    isConflicted,
    markConflicted,
    putFileContents,
    closeApp,
    getFileContents,
    wasWrittenByRoom,
    beginSave,
    serializeMerged,
    isRoomWrite,
    adoptEtag,
    applyExternalUpdate,
    sseListeners,
    /** The server announces a write to the open file by another tab. */
    async emitFileEvent(data: Record<string, unknown> = {}) {
      const payload = {
        itemid: FILE_A.id,
        initiatorid: 'tab-other',
        etag: 'etag-external',
        ...data
      }
      sseListeners.get('postprocessing-finished')?.({
        data: JSON.stringify(payload)
      } as MessageEvent)
      await flushPromises()
    },
    currentContent: () => slotProps?.currentContent,
    yjsStatus: () => slotProps?.yjsStatus,
    statusRef,
    registerSaveCallback(callback: (content: unknown) => void | Promise<void>) {
      slotProps['onRegister:onSaveCallback'](callback)
    },
    async edit(content: string) {
      slotProps['onUpdate:currentContent'](content)
      await nextTick()
    },
    async pressCtrlS() {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }))
      await flushPromises()
    },
    session: () => sessionOptions,
    async resolveResource(resource: Resource) {
      resolveInfo(resource)
      await flushPromises()
    },
    async resolveContent(body: string) {
      resolveContents(
        mock<GetFileContentsResponse>({ body, headers: { 'OC-ETag': 'etag' } as any })
      )
      await flushPromises()
    },
    resolveContentWith(body: string, etag: string) {
      resolveContents(mock<GetFileContentsResponse>({ body, headers: { 'OC-ETag': etag } as any }))
    },
    rejectContent(error: Error) {
      rejectContents(error)
    }
  }
}

describe('AppWrapper — ESC close behavior', () => {
  it('stops Escape propagation while closing the app', async () => {
    const s = setup({ yjsEnabled: false })
    const documentKeydownSpy = vi.fn()
    document.addEventListener('keydown', documentKeydownSpy)
    try {
      await s.wrapper.find('main').trigger('keydown', { key: 'Escape' })

      expect(s.closeApp).toHaveBeenCalledTimes(1)
      expect(documentKeydownSpy).not.toHaveBeenCalled()
    } finally {
      document.removeEventListener('keydown', documentKeydownSpy)
    }
  })
})

describe('AppWrapper — save callback', () => {
  it('runs the registered callback after the file was saved', async () => {
    const callback = vi.fn()
    const s = setup({ yjsEnabled: false })
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')
    await s.edit('edited content')
    s.registerSaveCallback(callback)

    await s.pressCtrlS()

    expect(callback).toHaveBeenCalledOnce()
  })

  it('hands the persisted content to the callback, not content edited while saving', async () => {
    const callback = vi.fn()
    let resolvePut!: (response: unknown) => void
    const s = setup({
      yjsEnabled: false,
      putFileContents: vi.fn().mockReturnValue(
        new Promise((resolve) => {
          resolvePut = resolve
        })
      )
    })
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')
    await s.edit('saved content')
    s.registerSaveCallback(callback)

    const saving = s.pressCtrlS()
    // an edit lands while the PUT is still in flight - it is not on disk yet
    await s.edit('content added while saving')
    resolvePut({ etag: 'new-etag' })
    await saving
    await flushPromises()

    expect(callback).toHaveBeenCalledWith('saved content')
  })

  it('does not run the registered callback when saving failed', async () => {
    const callback = vi.fn()
    const s = setup({
      yjsEnabled: false,
      putFileContents: vi.fn().mockRejectedValue({ statusCode: 500, response: {} })
    })
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')
    await s.edit('edited content')
    s.registerSaveCallback(callback)

    await s.pressCtrlS()

    expect(callback).not.toHaveBeenCalled()
  })

  it('runs the registered callback when a peer saved our edits', async () => {
    const callback = vi.fn()
    const s = setup()
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')
    await s.edit('edited content')
    s.registerSaveCallback(callback)

    s.session().onServerContentChange('content a peer saved')
    await flushPromises()

    expect(callback).toHaveBeenCalledWith('content a peer saved')
  })

  it('logs an error when the registered save callback fails', async () => {
    const callback = vi.fn().mockRejectedValue(new Error('nope'))
    const s = setup({ yjsEnabled: false })
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')
    await s.edit('edited content')
    s.registerSaveCallback(callback)

    await expect(s.pressCtrlS()).resolves.toBeUndefined()

    expect(consoleErrorSpy).toHaveBeenCalled()
  })
})

describe('AppWrapper — Yjs session gate', () => {
  it('stays disabled until the body for the current resource has arrived', async () => {
    const s = setup()
    await nextTick()

    expect(s.isEnabled()).toBe(false)

    await s.resolveResource(FILE_A)
    // resource is set, body is not — hydrating here would seed an empty doc.
    expect(s.isEnabled()).toBe(false)

    await s.resolveContent('content of a')
    expect(s.isEnabled()).toBe(true)
  })

  // Regression: `loading` was only ever set to false, so on an in-app file
  // switch the gate stayed open while `resource` already pointed at the new
  // file and `currentContent` still held the old body.
  it('closes again while switching to another file, and does not reopen on a stale body', async () => {
    const s = setup()
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')
    expect(s.isEnabled()).toBe(true)

    s.currentFileContext.value = mock<FileContext>({ space: mock<any>(), path: '/b.md' })
    await nextTick()
    expect(s.isEnabled()).toBe(false)

    // `resource` is already b.md while `currentContent` still holds a.md's
    // body. The gate must stay shut for this whole window.
    await s.resolveResource(FILE_B)
    expect(s.isEnabled()).toBe(false)

    await s.resolveContent('content of b')
    expect(s.isEnabled()).toBe(true)
  })

  it('passes the current yjs status to the wrapped component slot props', async () => {
    const s = setup({ status: 'connected' })
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')

    expect(s.yjsStatus()).toBe('connected')
  })

  it('passes null yjs status when the wrapped app did not opt into yjs', async () => {
    const s = setup({ yjsEnabled: false })
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')

    expect(s.yjsStatus()).toBeNull()
  })

  it('updates slot yjs status when the session status changes', async () => {
    const s = setup({ status: 'connecting' })
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')
    expect(s.yjsStatus()).toBe('connecting')

    s.statusRef.value = 'connected'
    await nextTick()
    expect(s.yjsStatus()).toBe('connected')
  })
})

describe('AppWrapper — resource identity across a save', () => {
  // Regression: the post-save update spread the whole PUT response over the
  // local resource. `putFileContents` answers with a PROPFIND result, where
  // `id === fileId === oc:fileid` - but a directly shared file carries the
  // share id in `id` and the real file id in `fileId`. Flattening the two moved
  // `resource.id` off `contentResourceId`, which shut the session's `enabled`
  // gate for good: the Yjs session ended at the first save and never
  // came back, with nothing shown to the user.
  it('keeps id and fileId across a save on a directly shared file', async () => {
    // What `buildIncomingShareResource` produces for a share-space root.
    const sharedFile = {
      id: 'share-mount-id',
      fileId: 'storage$space!real-file-id',
      name: 'shared.md',
      path: '/',
      etag: 'etag-open',
      size: 10,
      permissions: 'RDNVW'
    } as unknown as Resource
    // What a PROPFIND after the PUT answers with: one id for both fields.
    const savedFile = {
      id: 'storage$space!real-file-id',
      fileId: 'storage$space!real-file-id',
      name: 'shared.md',
      path: '/shared.md',
      etag: 'etag-saved',
      size: 42,
      mdate: 'Tue, 10 Feb 2026 10:00:00 GMT'
    } as unknown as Resource

    const s = setup({ putFileContents: vi.fn().mockResolvedValue(savedFile) })
    await nextTick()
    await s.resolveResource(sharedFile)
    await s.resolveContent('content of the shared file')
    await s.edit('edited content')
    await s.pressCtrlS()

    expect(s.putFileContents).toHaveBeenCalledTimes(1)

    const session = s.session()
    // Identity is load-time and must survive the write: `fileId` keys the
    // Yjs room, `id` keys the enabled gate.
    expect(unref(session.resource).id).toBe('share-mount-id')
    expect(unref(session.resource).fileId).toBe('storage$space!real-file-id')
    expect(s.isEnabled()).toBe(true)

    // What the write did establish still lands.
    expect(unref(session.resource).etag).toBe('etag-saved')
    expect(unref(session.resource).size).toBe(42)
  })
})

describe('AppWrapper — peer save fan-out', () => {
  // Regression: a peer save only moved `currentETag`, so `resource.etag` kept
  // the value this client opened with. The session compares that against the
  // room's etag to spot an external write, so the next reconnect read an
  // ordinary peer save as one and wiped the room to "recover" it, destroying
  // whatever the other peers had typed since.
  it('moves resource.etag onto the etag a peer published', async () => {
    const s = setup()
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')

    const session = s.session()
    expect(unref(session.resource).etag).toBe(FILE_A.etag)

    session.onEtagChange('etag-from-peer-save')
    await nextTick()

    expect(unref(session.resource).etag).toBe('etag-from-peer-save')
    // Same file, so the session must not be torn down and rebuilt over it.
    expect(unref(session.resource).id).toBe(FILE_A.id)
    expect(s.isEnabled()).toBe(true)
  })
})

describe('AppWrapper — save conflict handling', () => {
  function conflict() {
    return Object.assign(new Error('precondition failed'), { statusCode: 412, response: {} })
  }

  // Regression: the refetch-and-retry path was unconditional, so it also ran
  // for plain editors and for deployments with no Yjs server. There is
  // nothing to merge in that case - the divergence is someone else's write,
  // and retrying over it destroyed their work with no dialog and no toast.
  it('shows the conflict dialog instead of retrying when there is no session', async () => {
    const putFileContents = vi.fn().mockRejectedValue(conflict())
    const s = setup({ yjsEnabled: false, putFileContents })
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')
    await s.edit('edited content')
    await s.pressCtrlS()

    // One attempt only, and crucially no refetch: the retry path never starts,
    // so nothing can be written over the other writer.
    expect(putFileContents).toHaveBeenCalledTimes(1)
    expect(s.getFileContents).toHaveBeenCalledTimes(1) // the initial load only
    expect(useMessages().showErrorMessage).toHaveBeenCalledTimes(1)
  })

  // `disconnected` and `connecting` are transient - the provider reconnects on
  // its own - so the conflict must not take the room down with it.
  it.each(['local', 'disconnected', 'connecting'] as const)(
    'shows the conflict dialog without giving up the room when the status is %s',
    async (status) => {
      const putFileContents = vi.fn().mockRejectedValue(conflict())
      const s = setup({ status, putFileContents })
      await nextTick()
      await s.resolveResource(FILE_A)
      await s.resolveContent('content of a')
      await s.edit('edited content')
      await s.pressCtrlS()

      expect(putFileContents).toHaveBeenCalledTimes(1)
      expect(s.getFileContents).toHaveBeenCalledTimes(1) // the initial load only
      expect(useMessages().showErrorMessage).toHaveBeenCalledTimes(1)
      expect(s.markConflicted).not.toHaveBeenCalled()
    }
  )

  // A failed refetch or a failed retry is just as likely a network blip as an
  // external write, so the user gets the popup but keeps the session.
  it('keeps the room when the reconciliation itself fails', async () => {
    const putFileContents = vi.fn().mockRejectedValue(conflict())
    const s = setup({ status: 'connected', putFileContents })
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')
    await s.edit('edited content')

    const pressed = s.pressCtrlS()
    await flushPromises()
    s.rejectContent(new Error('network down'))
    await pressed

    expect(useMessages().showErrorMessage).toHaveBeenCalledTimes(1)
    expect(s.markConflicted).not.toHaveBeenCalled()
  })

  // Regression: the retry ran for any conflict inside a connected session, so
  // an external write — another browser, a desktop client syncing the file —
  // was refetched, found to differ, and then overwritten with our content. The
  // room never saw that content, so nothing merged it and nothing warned. Only
  // a write this room produced may be republished over.
  it('prompts instead of retrying when the room cannot account for the write', async () => {
    const putFileContents = vi.fn().mockRejectedValue(conflict())
    const s = setup({ status: 'connected', writtenByRoom: false, putFileContents })
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')
    await s.edit('edited content')

    const pressed = s.pressCtrlS()
    await flushPromises()
    // The conflict path refetches before deciding.
    await s.resolveContent('content written by a desktop client')
    await pressed

    expect(s.wasWrittenByRoom).toHaveBeenCalledWith('etag')
    // One attempt only: no second PUT, so the external content survives.
    expect(putFileContents).toHaveBeenCalledTimes(1)
    expect(useMessages().showErrorMessage).toHaveBeenCalledTimes(1)
  })

  // A lock is invisible to both authorization paths - WebDAV permissions carry
  // no lock letter and Graph actions have no lock facet - so the 423 on save is
  // the first thing that can tell the user. It used to land in the catch-all
  // branch and surface as an error popup with an empty message.
  it('explains a 423 instead of showing an empty error', async () => {
    const locked = Object.assign(new Error('locked'), { statusCode: 423, response: {} })
    const putFileContents = vi.fn().mockRejectedValue(locked)
    const s = setup({ yjsEnabled: false, putFileContents })
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')
    await s.edit('edited content')
    await s.pressCtrlS()

    const { showErrorMessage } = useMessages()
    expect(showErrorMessage).toHaveBeenCalledTimes(1)
    expect(vi.mocked(showErrorMessage).mock.calls[0][0].desc).toContain('locked by another')
    // No refetch and no retry: a lock is not something to reconcile against.
    expect(putFileContents).toHaveBeenCalledTimes(1)
    expect(s.getFileContents).toHaveBeenCalledTimes(1)
  })

  it('refetches and retries once when a connected session can merge', async () => {
    const putFileContents = vi
      .fn()
      .mockRejectedValueOnce(conflict())
      .mockResolvedValue(mock<Resource>({ etag: 'etag-retry' }))
    const s = setup({ status: 'connected', putFileContents })
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')
    await s.edit('edited content')

    const pressed = s.pressCtrlS()
    await flushPromises()
    // The retry path refetches the file first.
    await s.resolveContent('content written by the peer')
    await pressed

    expect(s.getFileContents).toHaveBeenCalledTimes(2)
    expect(putFileContents).toHaveBeenCalledTimes(2)
    expect(putFileContents.mock.calls[1][1]).toMatchObject({ previousEntityTag: 'etag' })
  })

  // Regression: the retry republished the snapshot taken when the save began.
  // That snapshot predates the peer save that caused the conflict, so the retry
  // wrote the peer's just-committed edits straight back out of the file - with
  // a matching If-Match, so no second conflict and no warning.
  it('retries with the merged room state, not the pre-conflict snapshot', async () => {
    const putFileContents = vi
      .fn()
      .mockRejectedValueOnce(conflict())
      .mockResolvedValue(mock<Resource>({ etag: 'etag-retry' }))
    const s = setup({ status: 'connected', mergedContent: 'ours plus theirs', putFileContents })
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')
    await s.edit('edited content')

    const pressed = s.pressCtrlS()
    await flushPromises()
    await s.resolveContent('content written by the peer')
    await pressed

    expect(putFileContents.mock.calls[0][1]).toMatchObject({ content: 'edited content' })
    expect(putFileContents.mock.calls[1][1]).toMatchObject({ content: 'ours plus theirs' })
  })

  // The retry's content is now on disk, so it has to be the baseline on both
  // sides. Leaving `currentContent` on the pre-conflict snapshot reads as an
  // unsaved change and puts the older body back on the next autosave.
  it('clears the dirty state against the content the retry actually wrote', async () => {
    const putFileContents = vi
      .fn()
      .mockRejectedValueOnce(conflict())
      .mockResolvedValue(mock<Resource>({ etag: 'etag-retry' }))
    const s = setup({ status: 'connected', mergedContent: 'ours plus theirs', putFileContents })
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')
    await s.edit('edited content')

    const pressed = s.pressCtrlS()
    await flushPromises()
    await s.resolveContent('content written by the peer')
    await pressed
    await nextTick()

    expect(s.currentContent()).toBe('ours plus theirs')
    // Not dirty: another save attempt does not reach the server.
    expect(putFileContents).toHaveBeenCalledTimes(2)
    await s.pressCtrlS()
    expect(putFileContents).toHaveBeenCalledTimes(2)
  })

  // The stamp peers read to decide whether a save covered them has to describe
  // the doc behind the content being written, and by the time the PUT answers
  // the doc has usually moved on.
  it('pins the doc state behind the content it is about to write', async () => {
    const s = setup({ status: 'connected' })
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')
    await s.edit('edited content')
    await s.pressCtrlS()

    expect(s.beginSave).toHaveBeenCalled()
  })

  // The 412 path already tells the user; the session has to give up the room
  // too, or the toolbar keeps claiming everything is fine while the doc is
  // detached from what is on disk.
  it('marks the session conflicted when an external write caused the conflict', async () => {
    const putFileContents = vi.fn().mockRejectedValue(conflict())
    const s = setup({ status: 'connected', writtenByRoom: false, putFileContents })
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')
    await s.edit('edited content')

    const pressed = s.pressCtrlS()
    await flushPromises()
    await s.resolveContent('content written by a desktop client')
    await pressed

    // Silently: `saveFileTask` shows the popup itself, so a second toast from
    // the session would only duplicate it.
    expect(s.markConflicted).toHaveBeenCalledWith(false)
    expect(useMessages().showErrorMessage).toHaveBeenCalledTimes(1)
  })

  // The other direction: the session noticed the external change first (a peer
  // is re-seeding the room) and asks the wrapper to explain it.
  it('shows the conflict message when the session reports an external change', async () => {
    const s = setup({ status: 'connected' })
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')

    s.session().onConflict()
    await nextTick()

    const { showErrorMessage } = useMessages()
    expect(showErrorMessage).toHaveBeenCalledTimes(1)
    expect(vi.mocked(showErrorMessage).mock.calls[0][0].desc).toContain(
      'updated outside this window'
    )
  })

  it('keeps autosaving while the session is healthy', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const s = setup({ status: 'connected' })
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')
    await s.edit('edited content')

    await vi.advanceTimersByTimeAsync(130_000)

    expect(s.putFileContents).toHaveBeenCalledTimes(1)
  })

  // Every attempt would fail the same way, so the popup would come back every
  // interval until the user closes the tab.
  it('skips the autosave while the session is conflicted', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const s = setup({ status: 'connected' })
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')
    await s.edit('edited content')

    s.isConflicted.value = true
    await nextTick()
    await vi.advanceTimersByTimeAsync(130_000)

    expect(s.putFileContents).not.toHaveBeenCalled()
  })
})

describe('AppWrapper — locked session', () => {
  // Regression: `isDirty` short-circuited on `effectiveReadOnly`, which folds
  // in `isLockedForReload`. A session locking mid-edit therefore dropped the
  // dirty flag, which hides the save action, unregisters `beforeunload` and
  // lets the route-leave guard through - ten minutes of unsaved work gone with
  // the tab, silently.
  it('keeps unsaved work armed when the session locks mid-edit', async () => {
    const s = setup()
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')
    await s.edit('edited content')

    s.isLockedForReload.value = true
    await nextTick()

    // Still dirty, so the guards stay armed and the user can still persist.
    await s.pressCtrlS()
    expect(s.putFileContents).toHaveBeenCalledTimes(1)
  })

  it('never arms them for a genuinely read-only file', async () => {
    const s = setup()
    await nextTick()
    await s.resolveResource(
      mock<Resource>({ id: 'storage$space!ro', name: 'ro.md', etag: 'e', permissions: 'R' })
    )
    await s.resolveContent('content of a')
    await s.edit('edited content')

    await s.pressCtrlS()
    expect(s.putFileContents).not.toHaveBeenCalled()
  })
})

describe('AppWrapper — external file updates via SSE', () => {
  async function openFile(options: Parameters<typeof setup>[0] = {}) {
    const s = setup(options)
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')
    return s
  }

  it('listens for content events once the user has an SSE stream', async () => {
    const s = await openFile()

    expect(s.sseListeners.has('postprocessing-finished')).toBe(true)
    expect(s.sseListeners.has('file-touched')).toBe(true)
  })

  it('does not listen without an SSE stream', async () => {
    const s = await openFile({ sse: false })

    expect(s.sseListeners.size).toBe(0)
  })

  it('ignores a write the room can account for without fetching', async () => {
    const s = await openFile({ writtenByRoom: true })
    s.getFileContents.mockClear()

    await s.emitFileEvent()

    expect(s.wasWrittenByRoom).toHaveBeenCalledWith('etag-external', expect.any(Number))
    expect(s.getFileContents).not.toHaveBeenCalled()
    expect(s.applyExternalUpdate).not.toHaveBeenCalled()
  })

  it('waits for a late peer stamp before fetching', async () => {
    let settle: (v: boolean) => void
    const s = await openFile({ writtenByRoom: false })
    s.wasWrittenByRoom.mockReturnValueOnce(new Promise<boolean>((r) => (settle = r)))
    s.getFileContents.mockClear()

    const pending = s.emitFileEvent()
    await flushPromises()
    expect(s.getFileContents).not.toHaveBeenCalled()

    settle(true)
    await pending
    expect(s.getFileContents).not.toHaveBeenCalled()
    expect(s.applyExternalUpdate).not.toHaveBeenCalled()
  })

  it('adopts the etag when the body on disk is the one we know', async () => {
    const s = await openFile({ writtenByRoom: false })

    await s.emitFileEvent()
    s.resolveContentWith('content of a', 'etag-external')
    await flushPromises()

    expect(s.adoptEtag).toHaveBeenCalledWith('etag-external')
    expect(s.applyExternalUpdate).not.toHaveBeenCalled()
    expect(s.putFileContents).not.toHaveBeenCalled()
  })

  // A peer saved and left before its stamp reached us: what is on disk is the
  // room's own state, so it lands as a save.
  it('records the room state as saved when that is what landed', async () => {
    const callback = vi.fn()
    const s = await openFile({ mergedContent: 'merged room state', writtenByRoom: false })
    await s.edit('merged room state')
    s.registerSaveCallback(callback)

    await s.emitFileEvent()
    s.resolveContentWith('merged room state', 'etag-external')
    await flushPromises()

    expect(s.applyExternalUpdate).not.toHaveBeenCalled()
    expect(unref(s.session().resource).etag).toBe('etag-external')
    // The wrapped app never saves this body itself, so it hears about it here.
    expect(callback).toHaveBeenCalledWith('merged room state')
    // Nothing left to save.
    await s.pressCtrlS()
    expect(s.putFileContents).not.toHaveBeenCalled()
  })

  it('hands a foreign body to the session with the etag it was read under', async () => {
    const s = await openFile({ writtenByRoom: false })

    await s.emitFileEvent({ etag: 'etag-announced' })
    // The file moved again between the event and our GET.
    s.resolveContentWith('desktop client wrote this', 'etag-fetched')
    await flushPromises()

    expect(s.applyExternalUpdate).toHaveBeenCalledWith({
      content: 'desktop client wrote this',
      etag: 'etag-fetched'
    })
  })

  it('shows the update message when the session reports an applied update', async () => {
    const s = await openFile()

    s.session().onExternalUpdate()
    await nextTick()

    const { showMessage } = useMessages()
    expect(showMessage).toHaveBeenCalledTimes(1)
    expect(vi.mocked(showMessage).mock.calls[0][0].desc).toContain('updated outside this window')
  })

  it('leaves the session alone when the fetch fails', async () => {
    const s = await openFile({ writtenByRoom: false })

    await s.emitFileEvent()
    s.rejectContent(new Error('network'))
    await flushPromises()

    expect(s.applyExternalUpdate).not.toHaveBeenCalled()
    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  // The PUT's `If-Match` catches that write as a 412.
  it('ignores an event while a save is in flight', async () => {
    let resolvePut: (r: Resource) => void
    const putFileContents = vi.fn(() => new Promise<Resource>((r) => (resolvePut = r)))
    const s = await openFile({ putFileContents })
    await s.edit('edited content')
    s.getFileContents.mockClear()

    const pressed = s.pressCtrlS()
    await s.emitFileEvent()
    resolvePut!(mock<Resource>({ etag: 'etag-saved' }))
    await pressed
    await flushPromises()

    expect(s.getFileContents).not.toHaveBeenCalled()
  })

  it('ignores an event while the session is disconnected', async () => {
    const s = await openFile({ status: 'disconnected' })
    s.getFileContents.mockClear()

    await s.emitFileEvent()

    expect(s.getFileContents).not.toHaveBeenCalled()
  })

  it('never fetches for a conflicted session', async () => {
    const s = await openFile()
    s.isConflicted.value = true
    await nextTick()
    s.getFileContents.mockClear()

    await s.emitFileEvent()

    expect(s.getFileContents).not.toHaveBeenCalled()
  })
})
