import { defineComponent, nextTick, unref } from 'vue'
import { mock } from 'vitest-mock-extended'
import {
  defaultComponentMocks,
  getComposableWrapper,
  useAppDefaultsMock
} from '@opencloud-eu/web-test-helpers'
import { HttpError, Resource } from '@opencloud-eu/web-client'
import { useResourceEditor } from '../../../../src/composables/resourceEditor/useResourceEditor'
import { useAppDefaults } from '../../../../src/composables/appDefaults'
import { useMessages } from '../../../../src/composables/piniaStores'
import type {
  ResourceEditorComponent,
  ResourceEditorExtension
} from '../../../../src/composables/piniaStores'

vi.mock('../../../../src/composables/appDefaults', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useAppDefaults: vi.fn()
}))

type AppDefaultsResult = ReturnType<typeof useAppDefaults>

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
  // `onUpdate:*` bindings on ResourceEditorBindings — we only care about
  // the runtime props/emits introspection here, so cast away the structural
  // mismatch.
  defineComponent({
    emits,
    props,
    template: '<div/>'
  }) as unknown as ResourceEditorComponent

const selfLoadingExtension = (overrides: Partial<ResourceEditorExtension> = {}) =>
  buildExtension({ component: componentWith(['update:resource']), ...overrides })

const editorExtension = (overrides: Partial<ResourceEditorExtension> = {}) =>
  buildExtension({
    component: componentWith(['update:resource', 'update:currentContent']),
    ...overrides
  })

interface BuildOptions {
  extension?: ResourceEditorExtension
  appDefaults?: Partial<AppDefaultsResult>
  autosaveEnabled?: boolean
  autosaveInterval?: number
}

const buildWrapper = ({
  extension = buildExtension(),
  appDefaults = {},
  autosaveEnabled,
  autosaveInterval
}: BuildOptions = {}) => {
  vi.mocked(useAppDefaults).mockReturnValue(useAppDefaultsMock(appDefaults))
  const mocks = defaultComponentMocks()
  return getComposableWrapper(() => ({ ...useResourceEditor({ extension }) }), {
    mocks,
    // Provide `$router`/`$route` etc. as injects too — useRouter() / useRoute()
    // read them via vue's inject API, not as Options-style this.$router.
    provide: mocks,
    pluginOptions: {
      piniaOptions: {
        configState: {
          options: {
            editor: { autosaveEnabled, autosaveInterval }
          } as any
        }
      }
    }
  })
}

describe('useResourceEditor', () => {
  describe('editor vs viewer detection', () => {
    it('flags components without `update:currentContent` as viewers', () => {
      const wrapper = buildWrapper({ extension: selfLoadingExtension() })
      expect(wrapper.vm.isEditor).toBe(false)
    })

    it('flags components that emit `update:currentContent` as editors', () => {
      const wrapper = buildWrapper({ extension: editorExtension() })
      expect(wrapper.vm.isEditor).toBe(true)
    })
  })

  describe('content/resource setters', () => {
    it('setCurrentContent updates the currentContent ref', () => {
      const wrapper = buildWrapper({ extension: selfLoadingExtension() })
      wrapper.vm.setCurrentContent('hello')
      expect(wrapper.vm.currentContent).toBe('hello')
    })

    it('setResource updates the resource ref', () => {
      const wrapper = buildWrapper({ extension: selfLoadingExtension() })
      const next = mock<Resource>({ id: 'next', name: 'next.txt' })
      wrapper.vm.setResource(next)
      expect((wrapper.vm.resource as Resource | undefined)?.id).toBe('next')
    })

    it('isDirty toggles once setCurrentContent diverges from serverContent', async () => {
      const wrapper = buildWrapper({ extension: editorExtension() })
      expect(wrapper.vm.isDirty).toBe(false)
      wrapper.vm.setCurrentContent('changed')
      await nextTick()
      expect(wrapper.vm.isDirty).toBe(true)
    })
  })

  describe('delete-resource callback registration', () => {
    it('stores the registered callback on the returned ref', () => {
      const wrapper = buildWrapper({ extension: selfLoadingExtension() })
      const cb = vi.fn()
      wrapper.vm.registerOnDeleteResourceCallback(cb)
      expect(wrapper.vm.deleteResourceCallback).toBe(cb)
    })
  })

  describe('save', () => {
    it('writes currentContent via putFileContents and clears the dirty flag on success', async () => {
      const putFileContents = vi.fn().mockResolvedValue({ etag: 'new-etag' } as any)
      const wrapper = buildWrapper({
        extension: editorExtension(),
        appDefaults: { putFileContents }
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
        extension: editorExtension(),
        appDefaults: { putFileContents }
      })
      wrapper.vm.setCurrentContent('local edits')
      await nextTick()

      await wrapper.vm.save()

      expect(wrapper.vm.serverContent).toBeUndefined()
      expect(wrapper.vm.isDirty).toBe(true)
      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalled()
      const arg = vi.mocked(showErrorMessage).mock.calls[0][0]
      expect(arg.errors?.[0]).toBeInstanceOf(HttpError)
    })

    it('reports an auth error on 401 / 403', async () => {
      const putFileContents = vi.fn().mockRejectedValue(httpError(403))
      const wrapper = buildWrapper({
        extension: editorExtension(),
        appDefaults: { putFileContents }
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
        extension: editorExtension(),
        appDefaults: { putFileContents }
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
      buildWrapper({ extension: selfLoadingExtension(), autosaveEnabled: true })
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

  describe('beforeunload listener', () => {
    it('attaches a beforeunload listener once isDirty flips true, removes it once it flips back', async () => {
      const add = vi.spyOn(window, 'addEventListener')
      const remove = vi.spyOn(window, 'removeEventListener')

      const wrapper = buildWrapper({ extension: editorExtension() })
      wrapper.vm.setCurrentContent('typed')
      await nextTick()
      expect(add).toHaveBeenCalledWith('beforeunload', expect.any(Function))

      // Roll currentContent back to the (undefined) serverContent — dirty=false again.
      wrapper.vm.setCurrentContent(wrapper.vm.serverContent)
      await nextTick()
      expect(remove).toHaveBeenCalledWith('beforeunload', expect.any(Function))

      add.mockRestore()
      remove.mockRestore()
    })
  })
})
