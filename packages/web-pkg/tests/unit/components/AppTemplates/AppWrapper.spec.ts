import { mock } from 'vitest-mock-extended'
import { defineComponent, h, nextTick, type PropType, reactive, ref, toValue, unref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import type { Resource, ShareSpaceResource, SpaceResource } from '@opencloud-eu/web-client'
import { HttpError } from '@opencloud-eu/web-client'
import type { GetFileContentsResponse } from '@opencloud-eu/web-client/webdav'
import {
  createMemoryHistory,
  createRouter,
  onBeforeRouteLeave,
  onBeforeRouteUpdate
} from 'vue-router'
import {
  defaultPlugins,
  defaultComponentMocks,
  mount,
  useAppDefaultsMock,
  type RouteLocation
} from '@opencloud-eu/web-test-helpers'

import AppWrapper from '../../../../src/components/AppTemplates/AppWrapper.vue'
import type { YjsSession, YjsStatus } from '../../../../src/composables/yjs'
import type { FileContentOptions, FileContext } from '../../../../src/composables/appDefaults'
import type { FileAction } from '../../../../src/composables/actions'
import { eventBus } from '../../../../src/services'
import { ResourceNotFoundError } from '../../../../src/errors'
import {
  type CustomComponentExtension,
  useExtensionRegistry,
  useMessages,
  useModals,
  useResourcesStore
} from '../../../../src/composables/piniaStores'

const { useAppDefaultsSpy, useYjsSessionSpy, getResourceContextSpy } = vi.hoisted(() => ({
  useAppDefaultsSpy: vi.fn(),
  useYjsSessionSpy: vi.fn(),
  getResourceContextSpy: vi.fn()
}))

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  onBeforeRouteLeave: vi.fn(),
  onBeforeRouteUpdate: vi.fn()
}))

vi.mock('../../../../src/composables/appDefaults/useAppDefaults', () => ({
  useAppDefaults: (...args: unknown[]) => useAppDefaultsSpy(...args)
}))

vi.mock('../../../../src/composables/resources/useGetResourceContext', () => ({
  useGetResourceContext: () => ({ getResourceContext: getResourceContextSpy })
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

// The wrapper loads text as raw bytes to detect files that are not valid UTF-8. No `mock()`: it
// empties the ArrayBuffer.
function contentsResponse(body: string | Uint8Array, etag: string): GetFileContentsResponse {
  const bytes = typeof body === 'string' ? new TextEncoder().encode(body) : body
  return { body: bytes.buffer, headers: { 'OC-ETag': etag } }
}

// "Grüße" in Latin-1
const LATIN1_BYTES = new Uint8Array([0x47, 0x72, 0xfc, 0xdf, 0x65])

function deferred<T>() {
  let resolve: (value: T) => void
  let reject: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function leaveRoute() {
  const guard = vi.mocked(onBeforeRouteLeave).mock.calls.at(-1)[0]
  return (guard as any)({}, {}) as Promise<boolean>
}

function updateRoute() {
  const guard = vi.mocked(onBeforeRouteUpdate).mock.calls.at(-1)[0]
  return (guard as any)({}, {})
}

const wrappedComponentProps = {
  resource: { type: Object as PropType<Resource>, default: null as Resource },
  currentContent: { type: String, default: '' }
}

const wrappedComponent = defineComponent({
  props: wrappedComponentProps,
  template: '<div />'
})

// Without Yjs, apps edit by declaring `update:currentContent`.
const editorComponent = defineComponent({
  props: wrappedComponentProps,
  emits: ['update:currentContent'],
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
  sse = true,
  fileSizeLimit = undefined as number | undefined,
  folderLoadingError = undefined as HttpError,
  currentRoute = mock<RouteLocation>({
    path: '/test-app/personal/alan/a.md',
    query: {},
    params: { driveAliasAndItem: 'personal/alan/a.md' }
  }),
  isGuestContext = false,
  fileContext = mock<FileContext>({ space: mock<any>(), path: '/a.md' }),
  fileContentOptions = undefined as FileContentOptions,
  // Receives the errors Vue would otherwise report as unhandled.
  errorHandler = undefined as (err: unknown) => void,
  component = wrappedComponent as ReturnType<typeof defineComponent>
} = {}) {
  const wasWrittenByRoom = vi.fn().mockResolvedValue(writtenByRoom)
  const beginSave = vi.fn()
  const serializeMerged = vi.fn().mockReturnValue(mergedContent)
  const isRoomWrite = vi.fn().mockReturnValue(roomWrite)
  const adoptEtag = vi.fn()
  const applyExternalUpdate = vi.fn().mockResolvedValue('recovered')
  const hasPendingContent = ref(false)
  const flushContent = vi.fn()
  const isLockedForReload = ref(false)
  const isConflicted = ref(false)
  const markConflicted = vi.fn(() => {
    isConflicted.value = true
  })
  const statusRef = ref(status)
  const currentFileContext = ref(fileContext)
  // Deferred so the test controls when each half of the load completes.
  let resolveInfo: (r: Resource) => void
  let rejectInfo: (e: Error) => void
  let resolveContents: (c: GetFileContentsResponse) => void
  let rejectContents: (e: Error) => void

  const getFileInfo = vi.fn().mockImplementation(
    () =>
      new Promise((resolve, reject) => {
        resolveInfo = resolve
        rejectInfo = reject
      })
  )
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
      closeApp,
      folderLoadingError: ref(folderLoadingError)
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
      applyExternalUpdate,
      hasPendingContent: hasPendingContent as any,
      flushContent
    })
  })

  const mocks = defaultComponentMocks({ currentRoute })
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

  const piniaPlugins = defaultPlugins({
    piniaOptions: {
      appsState: {
        apps: { 'test-app': { id: 'test-app', name: 'Test App', meta: { fileSizeLimit } } }
      },
      authState: { accessToken: sse ? 'token' : undefined, guestContextReady: isGuestContext },
      capabilityState: { capabilities: { core: { 'support-sse': sse } as any } }
    }
  })
  const unregisterAppBarExtension = vi.fn()
  const { registerExtensions, requestExtensions } = useExtensionRegistry()
  vi.mocked(registerExtensions).mockReturnValue(unregisterAppBarExtension)

  // The real handlers download the file and move it to the trash.
  const deleteFile = vi.fn()
  const downloadFile = vi.fn()
  function contextAction(name: string, handler: () => void) {
    return { name, icon: 'file', label: () => name, handler, isVisible: () => true } as FileAction
  }
  vi.mocked(requestExtensions).mockImplementation((({ id }: { id: string }) =>
    id === 'global.files.context-actions'
      ? [
          { action: contextAction('delete', deleteFile) },
          { action: contextAction('download-file', downloadFile) }
        ]
      : []) as any)

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:all(.*)', component: wrappedComponent }]
  })
  const routerPush = vi.spyOn(router, 'push').mockResolvedValue(undefined)
  const routerReplace = vi.spyOn(router, 'replace').mockResolvedValue(undefined)

  // Wrappers of earlier tests stay subscribed to the global event bus, so a
  // deletion is handed to this wrapper's subscription only.
  const subscribeSpy = vi.spyOn(eventBus, 'subscribe')
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
      wrappedComponent: component,
      ...(yjsEnabled ? { yjs: { makeAdapter: () => mock<any>() } } : {}),
      ...(fileContentOptions ? { fileContentOptions } : {})
    },
    global: {
      plugins: [...piniaPlugins, router],
      mocks,
      provide: mocks,
      stubs: { 'file-side-bar': true },
      config: { errorHandler }
    }
  })
  const [, onResourcesDeleted] = subscribeSpy.mock.calls.find(
    ([topic]) => topic === 'runtime.resource.deleted'
  )
  subscribeSpy.mockRestore()

  return {
    wrapper,
    routerPush,
    routerReplace,
    currentFileContext,
    isEnabled: () => sessionOptions?.enabled(),
    isLockedForReload,
    isConflicted,
    markConflicted,
    putFileContents,
    closeApp,
    getFileInfo,
    getFileContents,
    unregisterAppBarExtension,
    wasWrittenByRoom,
    beginSave,
    serializeMerged,
    isRoomWrite,
    adoptEtag,
    applyExternalUpdate,
    hasPendingContent,
    flushContent,
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
    slotKey: () => slotProps?.key,
    isReadOnly: () => slotProps?.isReadOnly,
    yjsStatus: () => slotProps?.yjsStatus,
    statusRef,
    registerSaveCallback(callback: (content: unknown) => void | Promise<void>) {
      slotProps['onRegister:onSaveCallback'](callback)
    },
    registerDeleteCallback(callback: () => void) {
      slotProps['onRegister:onDeleteResourceCallback'](callback)
    },
    registerFlushContentCallback(callback: () => void | Promise<void>) {
      slotProps['onRegister:onFlushContentCallback'](callback)
    },
    deleteFile,
    downloadFile,
    /** Runs an action of the top bar menu, as a click on it does. */
    clickTopBarAction(name: string) {
      const [topBar] = unref(
        vi.mocked(registerExtensions).mock.calls.at(-1)[0]
      ) as CustomComponentExtension[]
      const { dropDownMenuSections, dropDownActionOptions } = topBar.componentProps() as any
      const action = dropDownMenuSections
        .flatMap(({ items }: { items: FileAction[] }) => items)
        .find((item: FileAction) => item.name === name)
      return action.handler(dropDownActionOptions) as Promise<void>
    },
    /** The wrapped app asks to delete the file, e.g. the preview on the Delete key. */
    async deleteFromApp() {
      slotProps['onDelete:resource']()
      await flushPromises()
    },
    /** The move to the trash went through. */
    resourcesDeleted(resources: Resource[]) {
      onResourcesDeleted(resources)
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
    async rejectResource(error: Error) {
      rejectInfo(error)
      await flushPromises()
    },
    async resolveContent(body: string | Uint8Array) {
      resolveContents(contentsResponse(body, 'etag'))
      await flushPromises()
    },
    resolveContentWith(body: string | Uint8Array, etag: string) {
      resolveContents(contentsResponse(body, etag))
    },
    rejectContent(error: Error) {
      rejectContents(error)
    }
  }
}

async function openFile(options: Parameters<typeof setup>[0] = {}) {
  const s = setup(options)
  await nextTick()
  await s.resolveResource(FILE_A)
  await s.resolveContent('content of a')
  return s
}

async function switchFile(s: ReturnType<typeof setup>, resource: Resource, content: string) {
  s.currentFileContext.value = mock<FileContext>({
    space: mock<any>(),
    path: `/${resource.name}`
  })
  await nextTick()
  await s.resolveResource(resource)
  await s.resolveContent(content)
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

describe('AppWrapper — missing drive alias', () => {
  const shareSpace = mock<ShareSpaceResource>({
    id: 'share-id',
    driveType: 'share',
    getDriveAliasAndItem: () => 'share/Invited/sub/a.md'
  })
  const currentRoute = mock<RouteLocation>({
    query: { fileId: 'file-id' },
    params: { driveAliasAndItem: '' }
  })

  it.each([
    { isGuestContext: false, path: '/sub/a.md', contextRouteName: 'files-spaces-generic' },
    { isGuestContext: false, path: '/', contextRouteName: 'files-shares-with-me' },
    { isGuestContext: true, path: '/sub/a.md', contextRouteName: 'files-guest-link' },
    { isGuestContext: true, path: '/', contextRouteName: 'files-guest-shares' }
  ])(
    'uses $contextRouteName as context route (guest: $isGuestContext, path: $path)',
    async ({ isGuestContext, path, contextRouteName }) => {
      getResourceContextSpy.mockResolvedValue({ space: shareSpace, path })
      const s = setup({ yjsEnabled: false, currentRoute, isGuestContext })
      await flushPromises()

      expect(s.routerPush).toHaveBeenCalledWith(
        expect.objectContaining({ query: expect.objectContaining({ contextRouteName }) })
      )
    }
  )

  it('loads the file after adding the drive alias restarted the loading', async () => {
    getResourceContextSpy.mockResolvedValue({ space: shareSpace, path: '/sub/a.md' })
    const route = reactive({
      path: '/test-app',
      query: { fileId: 'file-id' },
      params: { driveAliasAndItem: '' }
    })
    const errorHandler = vi.fn()
    const s = setup({
      yjsEnabled: false,
      currentRoute: route as unknown as RouteLocation,
      // the drive resolver only finds the space once the route has the drive alias
      fileContext: { space: undefined, path: '' } as FileContext,
      errorHandler
    })
    // Like the router: the new route changes the file context, which restarts
    // the loading while the first run is still waiting for the route change.
    s.routerPush.mockImplementationOnce(async (to: any) => {
      route.params.driveAliasAndItem = to.params.driveAliasAndItem
      s.currentFileContext.value = mock<FileContext>({ space: mock<any>(), path: '/sub/a.md' })
      await flushPromises()
      return undefined
    })
    await flushPromises()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')

    expect(s.routerPush).toHaveBeenCalledTimes(1)
    expect(s.currentContent()).toBe('content of a')
    expect(errorHandler).not.toHaveBeenCalled()
  })
})

describe('AppWrapper — space that cannot be resolved', () => {
  // e.g. the space of another user, whose alias the drive resolver doesn't know
  const unresolvedFileContext = { space: undefined, path: '' } as FileContext

  // no mock: it would hand out a file id for any query item
  function routeWithoutFileId(driveAliasAndItem: string) {
    return {
      path: '/test-app',
      query: {},
      params: { driveAliasAndItem }
    } as unknown as RouteLocation
  }

  function expectNotFoundMessage(s: ReturnType<typeof setup>) {
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(ResourceNotFoundError))
    expect(s.wrapper.find('#app-wrapper-not-found-message').exists()).toBe(true)
    expect(s.wrapper.findComponent({ name: 'ErrorScreen' }).exists()).toBe(false)
  }

  it('shows the not found message instead of loading the file without a space', async () => {
    const s = setup({
      yjsEnabled: false,
      fileContext: unresolvedFileContext,
      currentRoute: routeWithoutFileId('project/doesnotexist/x.md')
    })
    await flushPromises()

    expect(s.getFileInfo).not.toHaveBeenCalled()
    expect(getResourceContextSpy).not.toHaveBeenCalled()
    expectNotFoundMessage(s)
  })

  it('shows the not found message for the app route without a file', async () => {
    const errorHandler = vi.fn()
    const s = setup({
      yjsEnabled: false,
      fileContext: unresolvedFileContext,
      currentRoute: routeWithoutFileId(''),
      errorHandler
    })
    await flushPromises()

    expect(getResourceContextSpy).not.toHaveBeenCalled()
    expect(s.getFileInfo).not.toHaveBeenCalled()
    expect(errorHandler).not.toHaveBeenCalled()
    expectNotFoundMessage(s)
  })
})

describe('AppWrapper — closing the app while the file is loading', () => {
  it('stops loading without an error', async () => {
    const errorHandler = vi.fn()
    const s = setup({ yjsEnabled: false, errorHandler })
    await nextTick()

    s.wrapper.unmount()
    await flushPromises()

    expect(errorHandler).not.toHaveBeenCalled()
  })
})

describe('AppWrapper — top bar extension', () => {
  it('unregisters the top bar extension on unmount', async () => {
    const s = setup({ yjsEnabled: false })
    await nextTick()
    await s.resolveResource(FILE_A)

    s.wrapper.unmount()

    expect(s.unregisterAppBarExtension).toHaveBeenCalledTimes(1)
  })
})

describe('AppWrapper — loading a file that does not exist', () => {
  it('shows the error without checking the file size of the missing resource', async () => {
    const s = setup({ yjsEnabled: false, fileSizeLimit: 1000 })
    await nextTick()
    await s.rejectResource(new Error('not found'))

    expect(s.wrapper.findComponent({ name: 'ErrorScreen' }).exists()).toBe(true)
    expect(s.getFileContents).not.toHaveBeenCalled()
  })

  it('shows the not found message when the server answers with 404', async () => {
    const s = setup({ yjsEnabled: false })
    await nextTick()
    await s.rejectResource(new HttpError('Resource not found', undefined, 404))

    expect(s.wrapper.find('#app-wrapper-not-found-message').exists()).toBe(true)
    expect(s.wrapper.findComponent({ name: 'ErrorScreen' }).exists()).toBe(false)
  })
})

describe('AppWrapper — loading the file content', () => {
  it('loads text as raw bytes', async () => {
    const s = await openFile()

    expect(s.getFileContents).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ responseType: 'arraybuffer' })
    )
    expect(s.currentContent()).toBe('content of a')
  })

  it('passes other response types through without decoding', async () => {
    const s = await openFile({ yjsEnabled: false, fileContentOptions: { responseType: 'blob' } })

    expect(s.getFileContents).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ responseType: 'blob' })
    )
    expect(s.currentContent()).toBeInstanceOf(ArrayBuffer)
  })
})

describe('AppWrapper — remounting the wrapped app', () => {
  it('keys the app by the loaded file', async () => {
    const s = await openFile({ yjsEnabled: false })
    expect(s.slotKey()).toBe(FILE_A.id)
  })

  it('keeps the key on a save', async () => {
    const s = await openFile({ yjsEnabled: false })
    await s.edit('edited a')
    await s.pressCtrlS()

    expect(s.putFileContents).toHaveBeenCalled()
    expect(s.slotKey()).toBe(FILE_A.id)
  })

  it('changes the key once the next file is loaded', async () => {
    const s = await openFile({ yjsEnabled: false })
    await switchFile(s, FILE_B, 'content of b')
    expect(s.slotKey()).toBe(FILE_B.id)
  })
})

describe('AppWrapper - renaming the open file', () => {
  const space = mock<SpaceResource>({
    id: 'space-id',
    webDavPath: '/spaces/space-id',
    getDriveAliasAndItem: ({ path }: Resource) => `personal/alan${path}`
  })
  const currentRoute = mock<RouteLocation>({
    path: '/test-app/personal/alan/folder/a.md',
    query: { fileId: FILE_A.id },
    params: { driveAliasAndItem: 'personal/alan/folder/a.md' }
  })
  const fileA = mock<Resource>({
    id: FILE_A.id,
    fileId: FILE_A.id,
    name: 'a.md',
    path: '/folder/a.md',
    extension: 'md',
    etag: 'etag-a',
    permissions: 'RDNVW'
  })

  function fileContext(item: string) {
    return mock<FileContext>({ space, path: `/spaces/space-id${item}`, item, itemId: FILE_A.id })
  }

  async function openFileInFolder() {
    const s = setup({ yjsEnabled: false, currentRoute, fileContext: fileContext('/folder/a.md') })
    await nextTick()
    await s.resolveResource({ ...fileA })
    await s.resolveContent('content of a')
    const resourcesStore = useResourcesStore()
    resourcesStore.resources = vi
      .mocked(resourcesStore.initResourceList)
      .mock.calls.at(-1)[0].resources
    await nextTick()
    return s
  }

  /** Like the SSE rename handler and the rename action, which update the stored resource. */
  async function renameInStore(path: string) {
    const name = path.split('/').pop()
    const extension = name.split('.').pop()
    Object.assign(useResourcesStore().resources[0], { name, path, extension })
    await nextTick()
  }

  function topBarResource() {
    const [topBar] = unref(
      vi.mocked(useExtensionRegistry().registerExtensions).mock.calls.at(-1)[0]
    ) as CustomComponentExtension[]
    return (topBar.componentProps() as any).resource as Resource
  }

  function topBarActionResource() {
    const [topBar] = unref(
      vi.mocked(useExtensionRegistry().registerExtensions).mock.calls.at(-1)[0]
    ) as CustomComponentExtension[]
    return (topBar.componentProps() as any).dropDownActionOptions.resources[0] as Resource
  }

  it('passes store updates of the open file to the top bar actions', async () => {
    await openFileInFolder()
    Object.assign(useResourcesStore().resources[0], { starred: true })
    await nextTick()

    expect(topBarActionResource().starred).toBe(true)
  })

  it('replaces the route with the new path', async () => {
    const s = await openFileInFolder()
    await renameInStore('/folder/renamed.md')

    expect(s.routerReplace).toHaveBeenCalledWith({
      params: { driveAliasAndItem: 'personal/alan/folder/renamed.md' },
      query: currentRoute.query
    })
    expect(topBarResource().name).toBe('renamed.md')
  })

  it('keeps unsaved changes and saves them once the route followed', async () => {
    const s = await openFileInFolder()
    await s.edit('edited a')
    await renameInStore('/folder/renamed.md')
    s.currentFileContext.value = fileContext('/folder/renamed.md')
    await flushPromises()

    expect(s.getFileInfo).toHaveBeenCalledTimes(1)
    expect(s.getFileContents).toHaveBeenCalledTimes(1)
    expect(s.currentContent()).toBe('edited a')

    await s.pressCtrlS()

    expect(s.putFileContents).toHaveBeenCalledWith(
      expect.objectContaining({ value: expect.objectContaining({ item: '/folder/renamed.md' }) }),
      expect.objectContaining({ content: 'edited a', previousEntityTag: 'etag' })
    )
  })

  it('does not follow a move to another folder', async () => {
    const s = await openFileInFolder()
    await renameInStore('/other/a.md')

    expect(s.routerReplace).not.toHaveBeenCalled()
  })

  it('does not follow a rename to another extension', async () => {
    const s = await openFileInFolder()
    await renameInStore('/folder/a.txt')

    expect(s.routerReplace).not.toHaveBeenCalled()
    expect(topBarResource()).toMatchObject({ name: 'a.md', path: '/folder/a.md', extension: 'md' })
  })

  it('reloads the file when navigating back to it while another file is loading', async () => {
    const s = await openFileInFolder()
    s.currentFileContext.value = fileContext('/folder/b.md')
    await nextTick()
    s.currentFileContext.value = fileContext('/folder/a.md')
    await nextTick()

    expect(s.getFileInfo).toHaveBeenCalledTimes(3)
    expect(unref(s.getFileInfo.mock.calls.at(-1)[0]).item).toBe('/folder/a.md')
  })

  it('reloads the file when navigating back to it after another file failed to load', async () => {
    const s = await openFileInFolder()
    s.currentFileContext.value = fileContext('/folder/b.md')
    await nextTick()
    await s.rejectResource(new HttpError('Resource not found', undefined, 404))
    s.currentFileContext.value = fileContext('/folder/a.md')
    await nextTick()
    await s.resolveResource(fileA)
    await s.resolveContent('content of a')

    expect(s.getFileInfo).toHaveBeenCalledTimes(3)
    expect(s.wrapper.find('#app-wrapper-not-found-message').exists()).toBe(false)
  })

  it('does not follow a rename while another file is loading', async () => {
    const s = await openFileInFolder()
    s.currentFileContext.value = fileContext('/folder/b.md')
    await nextTick()
    await renameInStore('/folder/renamed.md')

    expect(s.routerReplace).not.toHaveBeenCalled()
  })

  it('does not follow a rename after another file failed to load', async () => {
    const s = await openFileInFolder()
    s.currentFileContext.value = fileContext('/folder/b.md')
    await nextTick()
    await s.rejectResource(new HttpError('Resource not found', undefined, 404))
    await renameInStore('/folder/renamed.md')

    expect(s.routerReplace).not.toHaveBeenCalled()
    expect(s.wrapper.find('#app-wrapper-not-found-message').exists()).toBe(true)
  })

  it('follows a rename that only changes the case of the extension', async () => {
    const s = await openFileInFolder()
    await renameInStore('/folder/a.MD')

    expect(s.routerReplace).toHaveBeenCalledTimes(1)
  })
})

describe('AppWrapper — files that are not valid UTF-8', () => {
  async function openLatin1File({
    resource = FILE_A,
    ...options
  }: Parameters<typeof setup>[0] & { resource?: Resource } = {}) {
    const s = setup(options)
    await nextTick()
    await s.resolveResource(resource)
    await s.resolveContent(LATIN1_BYTES)
    return s
  }

  it('opens the file read-only with a warning', async () => {
    const s = await openLatin1File()

    expect(s.isReadOnly()).toBe(true)
    expect(s.currentContent()).toBe('Grüße')
    const { showMessage } = useMessages()
    expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ status: 'warning' }))
  })

  it('does not save over the original bytes', async () => {
    const s = await openLatin1File()

    await s.edit('Grüße!')
    await s.pressCtrlS()

    expect(s.putFileContents).not.toHaveBeenCalled()
  })

  it('shows no warning when the file is read-only anyway', async () => {
    const s = await openLatin1File({ resource: { ...FILE_A, permissions: 'R' } as Resource })

    expect(s.isReadOnly()).toBe(true)
    expect(useMessages().showMessage).not.toHaveBeenCalled()
  })

  it('shows no warning in apps that do not edit', async () => {
    const s = await openLatin1File({ yjsEnabled: false })

    expect(s.isReadOnly()).toBe(true)
    expect(useMessages().showMessage).not.toHaveBeenCalled()
  })

  it('keeps a valid UTF-8 file writable', async () => {
    const s = await openFile()

    expect(s.isReadOnly()).toBe(false)
    expect(useMessages().showMessage).not.toHaveBeenCalled()
  })

  it('keeps the file out of the shared Yjs room', async () => {
    const s = await openLatin1File()

    expect(toValue(s.session().forceLocal)).toBe(true)
  })

  it('opens a valid UTF-8 file in the shared Yjs room', async () => {
    const s = await openFile()

    expect(toValue(s.session().forceLocal)).toBe(false)
  })
})

describe('AppWrapper — folder loading of apps that load their files themselves', () => {
  it('shows the not found message when the folder of the file cannot be found', async () => {
    const s = setup({
      yjsEnabled: false,
      folderLoadingError: new HttpError('Resource not found', undefined, 404)
    })
    await nextTick()

    expect(s.wrapper.find('#app-wrapper-not-found-message').exists()).toBe(true)
  })
})

describe('AppWrapper — changes still pending in the session', () => {
  async function openFileWithPendingChange(content: string) {
    const s = setup()
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')
    // the session only reports the change once it is flushed
    s.hasPendingContent.value = true
    s.flushContent.mockImplementation(() => {
      s.hasPendingContent.value = false
      s.session().onContentChange(content)
    })
    return s
  }

  it('saves the last keystrokes on Ctrl+S', async () => {
    const s = await openFileWithPendingChange('typed just now')

    await s.pressCtrlS()

    expect(s.flushContent).toHaveBeenCalled()
    expect(s.putFileContents).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ content: 'typed just now' })
    )
  })

  it('asks before the route leaves', async () => {
    const s = await openFileWithPendingChange('typed just now')
    const { dispatchModal } = useModals()

    void leaveRoute()
    await flushPromises()

    expect(s.flushContent).toHaveBeenCalled()
    expect(dispatchModal).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Unsaved changes' })
    )
  })

  // the modal's own cancel action and confirm button form Cancel and Save, the
  // custom component only adds "Don't Save" in between
  it('asks with the modal cancel action and confirm button', async () => {
    await openFileWithPendingChange('typed just now')
    const { dispatchModal } = useModals()

    void leaveRoute()
    await flushPromises()

    const modal = vi.mocked(dispatchModal).mock.calls.at(-1)[0]
    expect(modal).toMatchObject({ showCancelAction: true, confirmText: 'Save' })
    expect(modal.hideConfirmButton).toBeFalsy()
  })

  it('does not guard the tab against unload for a read-only user receiving remote edits', async () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    const s = setup()
    await nextTick()
    await s.resolveResource(
      mock<Resource>({ id: 'storage$space!ro', name: 'ro.md', etag: 'e', permissions: 'R' })
    )
    await s.resolveContent('content of a')

    s.hasPendingContent.value = true
    await nextTick()

    expect(addEventListenerSpy).not.toHaveBeenCalledWith('beforeunload', expect.anything())
    addEventListenerSpy.mockRestore()
  })

  it('lets the route leave when nothing is pending', async () => {
    const s = setup()
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')
    expect(await leaveRoute()).toBe(true)
    expect(s.unregisterAppBarExtension).toHaveBeenCalled()
  })
})

describe('AppWrapper — deleting the open file', () => {
  it('saves the unsaved changes before moving the file to the trash', async () => {
    const put = deferred<Resource>()
    const s = await openFile({ putFileContents: vi.fn().mockReturnValue(put.promise) })
    await s.edit('edited content')

    const deleting = s.clickTopBarAction('delete')
    await flushPromises()

    expect(s.putFileContents).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ content: 'edited content' })
    )
    expect(s.deleteFile).not.toHaveBeenCalled()

    put.resolve(mock<Resource>({ etag: 'etag-saved' }))
    await deleting

    expect(s.deleteFile).toHaveBeenCalledWith(
      expect.objectContaining({ resources: [expect.objectContaining({ id: FILE_A.id })] })
    )
    expect(useMessages().showErrorMessage).not.toHaveBeenCalled()
  })

  it('saves the keystrokes still pending in the session before moving the file to the trash', async () => {
    const s = await openFile()
    s.hasPendingContent.value = true
    s.flushContent.mockImplementation(() => {
      s.hasPendingContent.value = false
      s.session().onContentChange('typed just now')
    })

    await s.clickTopBarAction('delete')

    expect(s.putFileContents).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ content: 'typed just now' })
    )
    expect(s.deleteFile).toHaveBeenCalled()
  })

  it('closes the app without asking to save once the file is in the trash', async () => {
    const s = await openFile()
    await s.edit('edited content')
    const { dispatchModal } = useModals()
    // Like the router: it runs the leave guard asynchronously, and only then changes the route
    // and with it the file context, which resets the deletion.
    async function navigate() {
      await Promise.resolve()
      const allowed = await leaveRoute()
      if (allowed) {
        s.currentFileContext.value = mock<FileContext>({ space: mock<any>(), path: '/' })
      }
      return allowed
    }
    let leaving: Promise<boolean>
    s.closeApp.mockImplementation(() => {
      leaving = navigate()
    })

    await s.clickTopBarAction('delete')
    // typed while the file is moved to the trash, it can't be saved anymore
    await s.edit('typed after deleting')
    s.resourcesDeleted([FILE_A])
    await flushPromises()

    expect(dispatchModal).not.toHaveBeenCalled()
    expect(await leaving).toBe(true)
    expect(s.putFileContents).toHaveBeenCalledTimes(1)
  })

  it('moves a file without unsaved changes to the trash right away', async () => {
    const s = await openFile()

    await s.clickTopBarAction('delete')

    expect(s.putFileContents).not.toHaveBeenCalled()
    expect(s.deleteFile).toHaveBeenCalled()
  })

  it('keeps the file when the changes cannot be saved', async () => {
    const s = await openFile({
      putFileContents: vi.fn().mockRejectedValue({ statusCode: 500, response: {} })
    })
    await s.edit('edited content')
    const { dispatchModal } = useModals()

    await s.clickTopBarAction('delete')

    expect(s.deleteFile).not.toHaveBeenCalled()
    expect(useMessages().showErrorMessage).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Failed to delete "a.md"' })
    )
    // the changes are still there, and still unsaved
    void leaveRoute()
    await flushPromises()
    expect(dispatchModal).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Unsaved changes' })
    )
  })

  it('keeps the file when it was updated outside this window', async () => {
    const s = await openFile()
    await s.edit('edited content')
    s.isConflicted.value = true

    await s.clickTopBarAction('delete')

    expect(s.putFileContents).not.toHaveBeenCalled()
    expect(s.deleteFile).not.toHaveBeenCalled()
    expect(useMessages().showErrorMessage).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Failed to delete "a.md"' })
    )
  })

  it('saves before a delete the wrapped app asks for', async () => {
    const s = await openFile()
    await s.edit('edited content')

    await s.deleteFromApp()

    expect(s.putFileContents).toHaveBeenCalled()
    expect(s.deleteFile).toHaveBeenCalled()
  })

  it('does not save the file anymore once it is in the trash', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const s = await openFile()
    const { showMessage } = useMessages()

    await s.clickTopBarAction('delete')
    s.resourcesDeleted([FILE_A])
    await s.edit('typed after deleting')
    await s.pressCtrlS()
    await vi.advanceTimersByTimeAsync(130_000)

    expect(s.putFileContents).not.toHaveBeenCalled()
    expect(showMessage).not.toHaveBeenCalledWith({ title: 'File autosaved' })
  })

  it('still asks to save when another file was deleted', async () => {
    const s = await openFile()
    await s.edit('edited content')
    const { dispatchModal } = useModals()

    s.resourcesDeleted([FILE_B])
    void leaveRoute()
    await flushPromises()

    expect(dispatchModal).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Unsaved changes' })
    )
  })

  // Apps like the preview stay open and move on to the next file.
  describe('in an app that stays open', () => {
    async function deleteAndMoveOn() {
      const s = await openFile()
      const onDeleted = vi.fn()
      s.registerDeleteCallback(onDeleted)
      await s.clickTopBarAction('delete')
      s.resourcesDeleted([FILE_A])
      expect(onDeleted).toHaveBeenCalled()
      expect(s.closeApp).not.toHaveBeenCalled()
      await switchFile(s, FILE_B, 'content of b')
      return s
    }

    it('saves and guards the next file as usual', async () => {
      const s = await deleteAndMoveOn()
      const { dispatchModal } = useModals()
      await s.edit('edited b')

      void leaveRoute()
      await flushPromises()
      expect(dispatchModal).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Unsaved changes' })
      )

      await s.clickTopBarAction('delete')
      expect(s.putFileContents).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ content: 'edited b' })
      )
      expect(s.deleteFile).toHaveBeenLastCalledWith(
        expect.objectContaining({ resources: [expect.objectContaining({ id: FILE_B.id })] })
      )
    })

    // an undo restores the file with the same id
    it('saves and guards the deleted file again once it is back', async () => {
      const s = await deleteAndMoveOn()
      const { dispatchModal } = useModals()
      await switchFile(s, FILE_A, 'content of a')
      await s.edit('edited a again')

      void leaveRoute()
      await flushPromises()
      expect(dispatchModal).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Unsaved changes' })
      )

      await s.pressCtrlS()
      expect(s.putFileContents).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ content: 'edited a again' })
      )
    })
  })
})

describe('AppWrapper — saving before deleting or downloading the open file', () => {
  it.each([
    { action: 'delete', handler: 'deleteFile' },
    { action: 'download-file', handler: 'downloadFile' }
  ] as const)(
    '$action waits for a running save, then saves what was typed meanwhile',
    async ({ action, handler }) => {
      const firstPut = deferred<Resource>()
      const s = await openFile({
        putFileContents: vi
          .fn()
          .mockReturnValueOnce(firstPut.promise)
          .mockResolvedValue(mock<Resource>({ etag: 'etag-saved-again' }))
      })
      await s.edit('saved by Ctrl+S')
      void s.pressCtrlS()
      await vi.waitFor(() => expect(s.putFileContents).toHaveBeenCalledTimes(1))
      await s.edit('typed while saving')

      const running = s.clickTopBarAction(action)
      await flushPromises()
      expect(s[handler]).not.toHaveBeenCalled()

      firstPut.resolve(mock<Resource>({ etag: 'etag-saved' }))
      await running

      expect(s.putFileContents).toHaveBeenCalledTimes(2)
      expect(s.putFileContents).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({ content: 'typed while saving' })
      )
      expect(s[handler]).toHaveBeenCalled()
    }
  )

  it('does not report a failed save before a download as autosaved', async () => {
    const s = await openFile({
      putFileContents: vi.fn().mockRejectedValue({ statusCode: 500, response: {} })
    })
    await s.edit('edited content')

    await s.clickTopBarAction('download-file')

    expect(useMessages().showErrorMessage).toHaveBeenCalled()
    expect(useMessages().showMessage).not.toHaveBeenCalledWith({ title: 'File autosaved' })
    expect(s.downloadFile).toHaveBeenCalled()
  })
})

describe('AppWrapper — saving while a save is running', () => {
  async function openFileWithRunningSave() {
    const firstPut = deferred<Resource>()
    const s = await openFile({
      putFileContents: vi
        .fn()
        .mockReturnValueOnce(firstPut.promise)
        .mockResolvedValue(mock<Resource>({ etag: 'etag-saved-again' }))
    })
    await s.edit('saved by Ctrl+S')
    void s.pressCtrlS()
    await vi.waitFor(() => expect(s.putFileContents).toHaveBeenCalledTimes(1))
    return { s, firstPut }
  }

  it('leaves the editor without asking once the running save finished', async () => {
    const { s, firstPut } = await openFileWithRunningSave()
    const { dispatchModal } = useModals()

    const leaving = leaveRoute()
    await flushPromises()
    expect(dispatchModal).not.toHaveBeenCalled()

    firstPut.resolve(mock<Resource>({ etag: 'etag-saved' }))

    expect(await leaving).toBe(true)
    expect(dispatchModal).not.toHaveBeenCalled()
    expect(s.putFileContents).toHaveBeenCalledTimes(1)
    expect(s.unregisterAppBarExtension).toHaveBeenCalled()
  })

  it('asks once the running save finished when changes were typed meanwhile', async () => {
    const { s, firstPut } = await openFileWithRunningSave()
    const { dispatchModal } = useModals()
    await s.edit('typed while saving')

    void leaveRoute()
    firstPut.resolve(mock<Resource>({ etag: 'etag-saved' }))
    await flushPromises()

    expect(dispatchModal).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Unsaved changes' })
    )
    expect(s.putFileContents).toHaveBeenCalledTimes(1)
  })

  it('asks without saving again once the running save failed', async () => {
    const { s, firstPut } = await openFileWithRunningSave()
    const { dispatchModal } = useModals()

    void leaveRoute()
    firstPut.reject({ statusCode: 423, response: {} })
    await flushPromises()

    expect(dispatchModal).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Unsaved changes' })
    )
    expect(s.putFileContents).toHaveBeenCalledTimes(1)
    expect(useMessages().showErrorMessage).toHaveBeenCalledTimes(1)
  })

  it('asks only once when leaving again while waiting for the running save', async () => {
    const { firstPut } = await openFileWithRunningSave()
    const { dispatchModal } = useModals()

    const firstLeave = leaveRoute()
    void leaveRoute()
    firstPut.reject({ statusCode: 423, response: {} })
    await flushPromises()

    expect(await firstLeave).toBe(true)
    expect(dispatchModal).toHaveBeenCalledTimes(1)
  })

  it('gives up waiting when a same-route navigation replaces the leave', async () => {
    const { s, firstPut } = await openFileWithRunningSave()
    const { dispatchModal } = useModals()

    const leaving = leaveRoute()
    updateRoute()
    firstPut.resolve(mock<Resource>({ etag: 'etag-saved' }))

    expect(await leaving).toBe(true)
    expect(dispatchModal).not.toHaveBeenCalled()
    expect(s.unregisterAppBarExtension).not.toHaveBeenCalled()
  })

  it('leaves without saving again when Save is confirmed while a save started after asking', async () => {
    const firstPut = deferred<Resource>()
    const s = await openFile({ putFileContents: vi.fn().mockReturnValueOnce(firstPut.promise) })
    const { dispatchModal } = useModals()
    await s.edit('edited content')

    const leaving = leaveRoute()
    await flushPromises()
    void s.pressCtrlS()
    await vi.waitFor(() => expect(s.putFileContents).toHaveBeenCalledTimes(1))
    const confirming = vi.mocked(dispatchModal).mock.calls.at(-1)[0].onConfirm('')
    firstPut.resolve(mock<Resource>({ etag: 'etag-saved' }))
    await confirming

    expect(await leaving).toBe(true)
    expect(s.putFileContents).toHaveBeenCalledTimes(1)
  })

  it('saves what was typed meanwhile on a second Ctrl+S', async () => {
    const { s, firstPut } = await openFileWithRunningSave()
    await s.edit('typed while saving')

    const saving = s.pressCtrlS()
    firstPut.resolve(mock<Resource>({ etag: 'etag-saved' }))
    await saving
    await flushPromises()

    expect(s.putFileContents).toHaveBeenCalledTimes(2)
    expect(s.putFileContents).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ content: 'typed while saving' })
    )
  })

  it('skips the autosave while a save is running', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { s, firstPut } = await openFileWithRunningSave()

    await vi.advanceTimersByTimeAsync(130_000)
    firstPut.resolve(mock<Resource>({ etag: 'etag-saved' }))
    await flushPromises()

    expect(s.putFileContents).toHaveBeenCalledTimes(1)
    expect(useMessages().showMessage).not.toHaveBeenCalledWith({ title: 'File autosaved' })
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
    await vi.waitFor(() => expect(s.putFileContents).toHaveBeenCalled())
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

describe('AppWrapper — flush content callback', () => {
  // The app only emits its edits from the callback, like PDF Studio does.
  async function openFileWithUnflushedEdit(content: string) {
    const s = await openFile({ yjsEnabled: false, component: editorComponent })
    const flushContent = vi.fn(() => s.edit(content))
    s.registerFlushContentCallback(flushContent)
    return { s, flushContent }
  }

  function expectSaved(s: ReturnType<typeof setup>, content: string) {
    expect(s.putFileContents).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ content })
    )
  }

  it('saves the content the app emits in the callback', async () => {
    const { s } = await openFileWithUnflushedEdit('flushed content')

    await s.clickTopBarAction('save-file')

    expectSaved(s, 'flushed content')
  })

  it('saves on Ctrl+S what the app emits in the callback, flushing once', async () => {
    const { s, flushContent } = await openFileWithUnflushedEdit('flushed content')

    await s.pressCtrlS()

    expectSaved(s, 'flushed content')
    expect(flushContent).toHaveBeenCalledOnce()
  })

  it('does not save on Ctrl+S when the app emits nothing new', async () => {
    const s = await openFile({ yjsEnabled: false, component: editorComponent })
    const flushContent = vi.fn()
    s.registerFlushContentCallback(flushContent)

    await s.pressCtrlS()

    expect(flushContent).toHaveBeenCalledOnce()
    expect(s.putFileContents).not.toHaveBeenCalled()
  })

  it('autosaves what the app emits in the callback', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { s, flushContent } = await openFileWithUnflushedEdit('flushed content')

    await vi.advanceTimersByTimeAsync(130_000)

    expectSaved(s, 'flushed content')
    expect(flushContent).toHaveBeenCalledOnce()
  })

  it('saves what the app emits in the callback before a download', async () => {
    const { s } = await openFileWithUnflushedEdit('flushed content')

    await s.clickTopBarAction('download-file')

    expectSaved(s, 'flushed content')
    expect(s.downloadFile).toHaveBeenCalled()
  })

  it('asks before the route leaves when the app emits changes in the callback', async () => {
    const { s, flushContent } = await openFileWithUnflushedEdit('flushed content')
    const { dispatchModal } = useModals()

    void leaveRoute()
    await flushPromises()

    expect(flushContent).toHaveBeenCalledOnce()
    expect(dispatchModal).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Unsaved changes' })
    )
    expect(s.unregisterAppBarExtension).not.toHaveBeenCalled()
  })

  it('lets the route leave when the app emits nothing new', async () => {
    const s = await openFile({ yjsEnabled: false, component: editorComponent })
    s.registerFlushContentCallback(vi.fn())

    expect(await leaveRoute()).toBe(true)
    expect(useModals().dispatchModal).not.toHaveBeenCalled()
  })

  it('opens "Save as" once the app emitted its content in the callback', async () => {
    const { s } = await openFileWithUnflushedEdit('flushed content')
    const { dispatchModal } = useModals()
    let contentOnOpen: string
    vi.mocked(dispatchModal).mockImplementation(() => {
      contentOnOpen = s.currentContent()
      return undefined
    })

    await s.clickTopBarAction('save-as')

    expect(dispatchModal).toHaveBeenCalledWith(expect.objectContaining({ title: 'Save as' }))
    expect(contentOnOpen).toBe('flushed content')
  })

  it('waits for a save started while the app flushes, then saves what it emitted', async () => {
    const firstPut = deferred<Resource>()
    const s = await openFile({
      yjsEnabled: false,
      component: editorComponent,
      putFileContents: vi
        .fn()
        .mockReturnValueOnce(firstPut.promise)
        .mockResolvedValue(mock<Resource>({ etag: 'etag-saved-again' }))
    })
    await s.edit('edited content')
    const flush = deferred<void>()
    const flushContent = vi
      .fn()
      .mockImplementationOnce(() => flush.promise.then(() => s.edit('flushed later')))
      .mockResolvedValue(undefined)
    s.registerFlushContentCallback(flushContent)

    const pressing = s.pressCtrlS()
    // a second save starts while the first flush is still running
    void s.clickTopBarAction('save-file')
    await vi.waitFor(() => expect(s.putFileContents).toHaveBeenCalledTimes(1))
    flush.resolve()
    await pressing
    firstPut.resolve(mock<Resource>({ etag: 'etag-saved' }))
    await flushPromises()

    expect(s.putFileContents).toHaveBeenCalledTimes(2)
    expect(s.putFileContents).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({ content: 'edited content' })
    )
    expectSaved(s, 'flushed later')
  })

  it('lets the route leave without waiting for the app once the file is in the trash', async () => {
    const s = await openFile({ yjsEnabled: false, component: editorComponent })
    s.registerDeleteCallback(vi.fn())
    const flushContent = vi.fn(() => new Promise<void>(() => undefined))
    s.registerFlushContentCallback(flushContent)
    s.resourcesDeleted([FILE_A])

    expect(await leaveRoute()).toBe(true)
    expect(flushContent).not.toHaveBeenCalled()
  })

  describe('when the callback fails', () => {
    async function openFileWithFailingFlush() {
      const s = await openFile({ yjsEnabled: false, component: editorComponent })
      await s.edit('edited content')
      s.registerFlushContentCallback(vi.fn().mockRejectedValue(new Error('nope')))
      return s
    }

    it.each([
      {
        name: 'the save action',
        save: (s: ReturnType<typeof setup>) => s.clickTopBarAction('save-file')
      },
      { name: 'Ctrl+S', save: (s: ReturnType<typeof setup>) => s.pressCtrlS() }
    ])('does not save stale content on $name', async ({ save }) => {
      const s = await openFileWithFailingFlush()

      await save(s)

      expect(s.putFileContents).not.toHaveBeenCalled()
      expect(useMessages().showErrorMessage).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Failed to save "a.md"' })
      )
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('does not autosave stale content', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const s = await openFileWithFailingFlush()

      await vi.advanceTimersByTimeAsync(130_000)

      expect(s.putFileContents).not.toHaveBeenCalled()
    })

    it('does not open "Save as" with stale content', async () => {
      const s = await openFileWithFailingFlush()

      await s.clickTopBarAction('save-as')

      expect(useModals().dispatchModal).not.toHaveBeenCalled()
    })

    it('still asks before the route leaves with unsaved changes', async () => {
      await openFileWithFailingFlush()
      const { dispatchModal } = useModals()

      void leaveRoute()
      await flushPromises()

      expect(dispatchModal).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Unsaved changes' })
      )
    })

    it('asks before the route leaves, even without changes it knows of', async () => {
      const s = await openFile({ yjsEnabled: false, component: editorComponent })
      s.registerFlushContentCallback(vi.fn().mockRejectedValue(new Error('nope')))
      const { dispatchModal } = useModals()

      void leaveRoute()
      await flushPromises()

      expect(dispatchModal).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Unsaved changes' })
      )
      expect(s.unregisterAppBarExtension).not.toHaveBeenCalled()
    })

    it('keeps the file on delete, even without changes it knows of', async () => {
      const s = await openFile({ yjsEnabled: false, component: editorComponent })
      s.registerFlushContentCallback(vi.fn().mockRejectedValue(new Error('nope')))

      await s.clickTopBarAction('delete')

      expect(s.putFileContents).not.toHaveBeenCalled()
      expect(s.deleteFile).not.toHaveBeenCalled()
      expect(useMessages().showErrorMessage).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Failed to delete "a.md"' })
      )
    })

    it('still downloads the file, without saving stale content', async () => {
      const s = await openFileWithFailingFlush()

      await s.clickTopBarAction('download-file')

      expect(s.putFileContents).not.toHaveBeenCalled()
      expect(s.downloadFile).toHaveBeenCalled()
    })
  })

  describe('without a callback', () => {
    it('starts the save on Ctrl+S right away', async () => {
      const s = await openFile({ yjsEnabled: false, component: editorComponent })
      await s.edit('edited content')

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }))

      expect(s.putFileContents).toHaveBeenCalled()
    })

    it('lets the route leave', async () => {
      const s = await openFile({ yjsEnabled: false, component: editorComponent })

      expect(await leaveRoute()).toBe(true)
      expect(s.unregisterAppBarExtension).toHaveBeenCalled()
    })
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

  it('only moves the etag of the stored resource when the conflict had the same content', async () => {
    const putFileContents = vi.fn().mockRejectedValue(conflict())
    const s = setup({ status: 'connected', putFileContents })
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')
    await s.edit('edited content')

    const pressed = s.pressCtrlS()
    await flushPromises()
    s.resolveContentWith('edited content', 'etag-fresh')
    await pressed
    await flushPromises()

    const resourcesStore = useResourcesStore()
    expect(resourcesStore.upsertResource).not.toHaveBeenCalled()
    expect(resourcesStore.updateResourceField).toHaveBeenCalledWith({
      id: FILE_A.id,
      field: 'etag',
      value: 'etag-fresh'
    })
  })

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
    await flushPromises()

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
