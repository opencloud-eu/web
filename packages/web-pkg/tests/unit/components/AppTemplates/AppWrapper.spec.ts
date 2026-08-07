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
import type {
  CollaborativeDocument,
  CollaborativeStatus
} from '../../../../src/composables/collaborative'
import type { FileContext } from '../../../../src/composables/appDefaults'

const { useAppDefaultsSpy, useCollaborativeDocumentSpy } = vi.hoisted(() => ({
  useAppDefaultsSpy: vi.fn(),
  useCollaborativeDocumentSpy: vi.fn()
}))

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  onBeforeRouteLeave: vi.fn()
}))

vi.mock('../../../../src/composables/appDefaults/useAppDefaults', () => ({
  useAppDefaults: (...args: unknown[]) => useAppDefaultsSpy(...args)
}))

vi.mock('../../../../src/composables/collaborative/useCollaborativeDocument', () => ({
  useCollaborativeDocument: (...args: unknown[]) => useCollaborativeDocumentSpy(...args)
}))

const FILE_A = mock<Resource>({
  id: 'storage$space!file-a',
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
  collaborative = true,
  status = 'connected' as CollaborativeStatus,
  putFileContents = vi.fn().mockResolvedValue(mock<Resource>({ etag: 'etag-saved' }))
} = {}) {
  const currentFileContext = ref(mock<FileContext>({ space: mock<any>(), path: '/a.md' }))
  // Deferred so the test controls when each half of the load completes.
  let resolveInfo: (r: Resource) => void
  let resolveContents: (c: GetFileContentsResponse) => void

  const getFileInfo = vi.fn().mockImplementation(() => new Promise((r) => (resolveInfo = r)))
  const getFileContents = vi
    .fn()
    .mockImplementation(() => new Promise((r) => (resolveContents = r)))

  useAppDefaultsSpy.mockReturnValue(
    useAppDefaultsMock({ currentFileContext, getFileInfo, getFileContents, putFileContents })
  )

  let sessionOptions: any
  useCollaborativeDocumentSpy.mockImplementation((options: any) => {
    sessionOptions = options
    return mock<CollaborativeDocument>({
      isReady: ref(true) as any,
      status: ref(status) as any,
      // Auto-mocked refs are truthy, which would fold into `effectiveReadOnly`
      // and hard-wire `isDirty` to false.
      isLockedForReload: ref(false) as any,
      error: ref<Error | null>(null) as any
    })
  })

  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({
      query: {},
      params: { driveAliasAndItem: 'personal/alan/a.md' }
    })
  })

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
      ...(collaborative
        ? { collaborative: { appVersion: '1.0.0', makeAdapter: () => mock<any>() } }
        : {})
    },
    global: {
      plugins: [
        ...defaultPlugins({
          piniaOptions: {
            appsState: { apps: { 'test-app': { id: 'test-app', name: 'Test App' } } }
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
    putFileContents,
    getFileContents,
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
    }
  }
}

describe('AppWrapper — collaborative session gate', () => {
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
  // for plain editors and for deployments with no realtime server. There is
  // nothing to merge in that case - the divergence is someone else's write,
  // and retrying over it destroyed their work with no dialog and no toast.
  it('shows the conflict dialog instead of retrying when there is no session', async () => {
    const putFileContents = vi.fn().mockRejectedValue(conflict())
    const s = setup({ collaborative: false, putFileContents })
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')
    await s.edit('edited content')
    await s.pressCtrlS()

    // One attempt only, and crucially no refetch: the retry path never starts,
    // so nothing can be written over the other writer.
    expect(putFileContents).toHaveBeenCalledTimes(1)
    expect(s.getFileContents).toHaveBeenCalledTimes(1) // the initial load only
  })

  it('shows the conflict dialog when the session is not connected', async () => {
    const putFileContents = vi.fn().mockRejectedValue(conflict())
    const s = setup({ status: 'local', putFileContents })
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')
    await s.edit('edited content')
    await s.pressCtrlS()

    expect(putFileContents).toHaveBeenCalledTimes(1)
    expect(s.getFileContents).toHaveBeenCalledTimes(1) // the initial load only
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
})
