import { defineComponent, nextTick, ref, type Ref } from 'vue'
import { mock } from 'vitest-mock-extended'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { HttpError, Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useResourceEditor } from '../../../../src/composables/resourceEditor/useResourceEditor'
import { useAppFileHandling } from '../../../../src/composables/appDefaults/useAppFileHandling'
import { useMessages } from '../../../../src/composables/piniaStores'
import type {
  ResourceEditorComponent,
  ResourceEditorExtension
} from '../../../../src/composables/piniaStores'

vi.mock('../../../../src/composables/appDefaults/useAppFileHandling', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useAppFileHandling: vi.fn()
}))

type AppFileHandlingResult = ReturnType<typeof useAppFileHandling>

const httpError = (statusCode: number) =>
  Object.assign(new Error(`HTTP ${statusCode}`), {
    statusCode,
    response: { status: statusCode } as any
  })

const buildExtension = (
  overrides: Partial<ResourceEditorExtension> = {}
): ResourceEditorExtension => {
  const viewerComponent = defineComponent({
    props: { url: { type: String, required: false } },
    template: '<div/>'
  })
  return {
    id: 'app.test',
    type: 'resourceEditor',
    appId: 'test-app',
    component: viewerComponent,
    ...overrides
  }
}

const componentWith = (
  emits: string[],
  props: Record<string, unknown> = { url: { type: String, required: false } }
) =>
  // defineComponent's typed emits don't line up with the method-shorthand
  // `onUpdate:*` bindings on ResourceEditorBindings, we only care about
  // the runtime props/emits introspection here, so cast away the structural
  // mismatch.
  defineComponent({
    emits,
    props,
    template: '<div/>'
  }) as unknown as ResourceEditorComponent

const viewerWithUrl = (overrides: Partial<ResourceEditorExtension> = {}) =>
  buildExtension({
    component: componentWith([], { url: { type: String, required: false } }),
    ...overrides
  })

const viewerWithContent = (overrides: Partial<ResourceEditorExtension> = {}) =>
  buildExtension({
    component: componentWith([], { currentContent: { type: String, required: false } }),
    ...overrides
  })

const editorExtension = (overrides: Partial<ResourceEditorExtension> = {}) =>
  buildExtension({
    component: componentWith(['update:currentContent'], {
      currentContent: { type: String, required: false }
    }),
    ...overrides
  })

// Editor without a `currentContent` prop, useful for tests that exercise
// save/dirty/autosave paths without the noise of `loadFileTask` racing the
// assertion. The composable's `isEditor` flag still flips true because of
// the emit, but no auto-content-load runs.
const pureEditor = (overrides: Partial<ResourceEditorExtension> = {}) =>
  buildExtension({
    component: componentWith(['update:currentContent'], {}),
    ...overrides
  })

const buildResource = (overrides: Partial<Resource> = {}): Resource =>
  ({
    id: 'r1',
    name: 'doc.txt',
    path: '/doc.txt',
    permissions: 'WCK',
    extension: 'txt',
    ...overrides
  }) as Resource

const buildSpace = (overrides: Partial<SpaceResource> = {}): SpaceResource =>
  ({ id: 's1', webDavPath: '/dav/spaces/s1', ...overrides }) as SpaceResource

const buildFileHandling = (overrides: Partial<AppFileHandlingResult> = {}): AppFileHandlingResult =>
  ({
    getFileInfo: vi.fn(),
    getFileContents: vi.fn().mockResolvedValue({ body: '', headers: { 'OC-ETag': 'etag-0' } }),
    putFileContents: vi.fn().mockResolvedValue({ etag: 'etag-new' }),
    getUrlForResource: vi.fn().mockResolvedValue(''),
    revokeUrl: vi.fn(),
    ...overrides
  }) as unknown as AppFileHandlingResult

interface BuildOptions {
  extension?: ResourceEditorExtension
  resource?: Ref<Resource | undefined>
  space?: Ref<SpaceResource | undefined>
  fileHandling?: Partial<AppFileHandlingResult>
  autosaveEnabled?: boolean
  autosaveInterval?: number
  onClose?: () => void
  onResourceUpdate?: (r: Resource) => void
}

const buildWrapper = ({
  extension = buildExtension(),
  resource = ref(buildResource()),
  space = ref(buildSpace()),
  fileHandling = {},
  autosaveEnabled,
  autosaveInterval,
  onClose,
  onResourceUpdate
}: BuildOptions = {}) => {
  vi.mocked(useAppFileHandling).mockReturnValue(buildFileHandling(fileHandling))
  const mocks = defaultComponentMocks()
  return getComposableWrapper(
    () => ({
      ...useResourceEditor({
        extension,
        resource: () => resource.value,
        space: () => space.value,
        onClose,
        onResourceUpdate
      })
    }),
    {
      mocks,
      provide: mocks,
      pluginOptions: {
        piniaOptions: {
          configState: {
            options: {
              editor: { autosaveEnabled, autosaveInterval }
            } as any
          },
          appsState: {
            apps: { 'test-app': { id: 'test-app', name: 'Test app' } }
          }
        }
      }
    }
  )
}

describe('useResourceEditor', () => {
  describe('editor vs viewer detection', () => {
    it('flags components without `update:currentContent` as viewers', () => {
      const wrapper = buildWrapper({ extension: viewerWithUrl() })
      expect(wrapper.vm.isEditor).toBe(false)
    })

    it('flags components that emit `update:currentContent` as editors', () => {
      const wrapper = buildWrapper({ extension: editorExtension() })
      expect(wrapper.vm.isEditor).toBe(true)
    })
  })

  describe('content/resource setters', () => {
    it('setCurrentContent updates the currentContent ref', () => {
      const wrapper = buildWrapper({ extension: editorExtension() })
      wrapper.vm.setCurrentContent('hello')
      expect(wrapper.vm.currentContent).toBe('hello')
    })

    it('setResource calls onResourceUpdate (caller owns the resource ref)', () => {
      const onResourceUpdate = vi.fn()
      const wrapper = buildWrapper({ extension: editorExtension(), onResourceUpdate })
      const next = buildResource({ id: 'next', name: 'next.txt' })
      wrapper.vm.setResource(next)
      expect(onResourceUpdate).toHaveBeenCalledWith(next)
    })

    it('isDirty toggles once setCurrentContent diverges from serverContent', async () => {
      const wrapper = buildWrapper({ extension: editorExtension() })
      await nextTick()
      const stable = wrapper.vm.serverContent
      wrapper.vm.setCurrentContent(stable === 'changed' ? 'changed!' : 'changed')
      await nextTick()
      expect(wrapper.vm.isDirty).toBe(true)
    })
  })

  describe('delete-resource callback registration', () => {
    it('stores the registered callback on the returned ref', () => {
      const wrapper = buildWrapper({ extension: editorExtension() })
      const cb = vi.fn()
      wrapper.vm.registerOnDeleteResourceCallback(cb)
      expect(wrapper.vm.deleteResourceCallback).toBe(cb)
    })
  })

  describe('capability-driven file loading', () => {
    it('resolves url via getUrlForResource when component declares the `url` prop', async () => {
      const getUrlForResource = vi.fn().mockResolvedValue('https://files/r1/blob')
      const wrapper = buildWrapper({
        extension: viewerWithUrl(),
        fileHandling: { getUrlForResource }
      })
      // The watch on resource is `immediate: true`, loadFileTask runs in a
      // microtask. Allow a few flushes for vue-concurrency's setTimeout(0).
      await new Promise((r) => setTimeout(r, 0))
      await nextTick()
      expect(getUrlForResource).toHaveBeenCalled()
      expect(wrapper.vm.url).toBe('https://files/r1/blob')
    })

    it('resolves currentContent via getFileContents when component declares the prop', async () => {
      const getFileContents = vi
        .fn()
        .mockResolvedValue({ body: 'file contents', headers: { 'OC-ETag': 'etag-x' } })
      const wrapper = buildWrapper({
        extension: viewerWithContent(),
        fileHandling: { getFileContents }
      })
      await new Promise((r) => setTimeout(r, 0))
      await nextTick()
      expect(getFileContents).toHaveBeenCalled()
      expect(wrapper.vm.currentContent).toBe('file contents')
      expect(wrapper.vm.serverContent).toBe('file contents')
    })

    it('re-runs loadFileTask when the resource changes', async () => {
      const getUrlForResource = vi
        .fn()
        .mockResolvedValueOnce('https://files/r1/blob')
        .mockResolvedValueOnce('https://files/r2/blob')
      const resource = ref<Resource | undefined>(buildResource({ id: 'r1' }))
      const wrapper = buildWrapper({
        extension: viewerWithUrl(),
        resource,
        fileHandling: { getUrlForResource }
      })
      await new Promise((r) => setTimeout(r, 0))
      await nextTick()
      expect(wrapper.vm.url).toBe('https://files/r1/blob')

      resource.value = buildResource({ id: 'r2' })
      await nextTick()
      await new Promise((r) => setTimeout(r, 0))
      await nextTick()
      expect(getUrlForResource).toHaveBeenCalledTimes(2)
      expect(wrapper.vm.url).toBe('https://files/r2/blob')
    })
  })

  describe('save', () => {
    it('writes currentContent via putFileContents and clears the dirty flag on success', async () => {
      const putFileContents = vi.fn().mockResolvedValue({ etag: 'new-etag' } as any)
      const wrapper = buildWrapper({
        extension: pureEditor(),
        fileHandling: { putFileContents }
      })
      wrapper.vm.setCurrentContent('payload')
      await nextTick()
      expect(wrapper.vm.isDirty).toBe(true)

      await wrapper.vm.save()

      expect(putFileContents).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ content: 'payload' })
      )
      expect(wrapper.vm.serverContent).toBe('payload')
      expect(wrapper.vm.isDirty).toBe(false)
    })

    it('reports a conflict error on 412 / 409 without touching serverContent', async () => {
      const putFileContents = vi.fn().mockRejectedValue(httpError(412))
      const wrapper = buildWrapper({
        extension: pureEditor(),
        fileHandling: { putFileContents }
      })
      const initialServerContent = wrapper.vm.serverContent
      wrapper.vm.setCurrentContent('local edits')
      await nextTick()

      await wrapper.vm.save()

      expect(wrapper.vm.serverContent).toBe(initialServerContent)
      expect(wrapper.vm.isDirty).toBe(true)
      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalled()
      const arg = vi.mocked(showErrorMessage).mock.calls[0][0]
      expect(arg.errors?.[0]).toBeInstanceOf(HttpError)
    })

    it('reports an auth error on 401 / 403', async () => {
      const putFileContents = vi.fn().mockRejectedValue(httpError(403))
      const wrapper = buildWrapper({
        extension: pureEditor(),
        fileHandling: { putFileContents }
      })
      wrapper.vm.setCurrentContent('payload')
      await nextTick()

      await wrapper.vm.save()

      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalled()
    })

    it('reports the no-quota error on 507', async () => {
      const putFileContents = vi.fn().mockRejectedValue(httpError(507))
      const wrapper = buildWrapper({
        extension: pureEditor(),
        fileHandling: { putFileContents }
      })
      wrapper.vm.setCurrentContent('payload')
      await nextTick()

      await wrapper.vm.save()

      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalled()
    })
  })

  describe('autosave wiring', () => {
    it('does not start an autosave interval for viewers (no update:currentContent emit)', () => {
      const spy = vi.spyOn(global, 'setInterval')
      buildWrapper({ extension: viewerWithUrl(), autosaveEnabled: true })
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })

    it('does not start an interval when extension.disableAutoSave is true', () => {
      const spy = vi.spyOn(global, 'setInterval')
      buildWrapper({
        extension: editorExtension({ disableAutoSave: true }),
        autosaveEnabled: true
      })
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })

    it('starts an interval for editors when configStore.options.editor.autosaveEnabled is true', () => {
      const spy = vi.spyOn(global, 'setInterval')
      buildWrapper({ extension: editorExtension(), autosaveEnabled: true })
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })

    it('does not start an interval when autosaveEnabled is false', () => {
      const spy = vi.spyOn(global, 'setInterval')
      buildWrapper({ extension: editorExtension(), autosaveEnabled: false })
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })
  })

  describe('onClose wiring', () => {
    it('invokes the onClose callback when closeApp is called', () => {
      const onClose = vi.fn()
      const wrapper = buildWrapper({ extension: viewerWithUrl(), onClose })
      wrapper.vm.closeApp()
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('beforeunload listener', () => {
    it('attaches a beforeunload listener once isDirty flips true, removes it once it flips back', async () => {
      const add = vi.spyOn(window, 'addEventListener')
      const remove = vi.spyOn(window, 'removeEventListener')

      const wrapper = buildWrapper({ extension: pureEditor() })
      wrapper.vm.setCurrentContent('typed')
      await nextTick()
      // happy-dom passes a 3rd `options` arg to addEventListener internally -
      // we only care that *some* call targets `beforeunload`, not the exact
      // signature.
      expect(add.mock.calls.some(([type]) => type === 'beforeunload')).toBe(true)

      // Roll currentContent back to the serverContent, dirty=false again.
      wrapper.vm.setCurrentContent(wrapper.vm.serverContent)
      await nextTick()
      expect(remove.mock.calls.some(([type]) => type === 'beforeunload')).toBe(true)

      add.mockRestore()
      remove.mockRestore()
    })
  })
})
