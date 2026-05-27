import { defineComponent, ref } from 'vue'
import { mock } from 'vitest-mock-extended'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import ResourceEditorHost from '../../../../src/components/AppTemplates/ResourceEditorHost.vue'
import { useResourceEditor } from '../../../../src/composables/resourceEditor'
import {
  useExtensionRegistry,
  type ResourceEditorExtension
} from '../../../../src/composables/piniaStores'
import type { Resource, SpaceResource } from '@opencloud-eu/web-client'

vi.mock('../../../../src/composables/resourceEditor/useResourceEditor')

vi.mock(
  '../../../../src/composables/piniaStores/extensionRegistry/extensionRegistry',
  async (importOriginal) => ({
    ...(await importOriginal<any>()),
    useExtensionRegistry: vi.fn(() => ({
      requestExtensions: vi.fn(() => []),
      registerExtensions: vi.fn(),
      unregisterExtensions: vi.fn(),
      getExtensionById: vi.fn(),
      registerExtensionPoints: vi.fn(),
      unregisterExtensionPoints: vi.fn(),
      getExtensionPoints: vi.fn()
    }))
  })
)

type UseResourceEditorReturn = ReturnType<typeof useResourceEditor>

const buildEditorState = (
  overrides: Partial<UseResourceEditorReturn> = {}
): UseResourceEditorReturn =>
  ({
    resource: ref(mock<Resource>({ id: 'r1', name: 'doc.pdf' })),
    space: ref(undefined),
    url: ref(''),
    currentContent: ref(''),
    serverContent: ref(''),
    currentETag: ref(''),
    loading: ref(false),
    loadingError: ref(null),
    isReadOnly: ref(false),
    isDirty: ref(false),
    isEditor: ref(false),
    applicationConfig: ref({}),
    currentFileContext: ref({}),
    activeFiles: ref([]),
    isFolderLoading: ref(false),
    save: vi.fn(),
    closeApp: vi.fn(),
    loadFolderForFileContext: vi.fn(),
    getUrlForResource: vi.fn(),
    revokeUrl: vi.fn(),
    setCurrentContent: vi.fn(),
    setResource: vi.fn(),
    registerOnDeleteResourceCallback: vi.fn(),
    deleteResourceCallback: ref(null),
    ...overrides
  }) as unknown as UseResourceEditorReturn

const stubComponent = defineComponent({
  props: ['resource'],
  template: '<section class="editor-stub" :data-resource-id="resource?.id" />'
})

const buildExtension = (
  overrides: Partial<ResourceEditorExtension> = {}
): ResourceEditorExtension => ({
  id: 'app.test',
  type: 'resourceEditor',
  appId: 'test-app',
  component: stubComponent,
  ...overrides
})

// Plain object instead of mock<Resource>() because vitest-mock-extended's
// proxy turns unset string properties into `vi.fn()`, which then break the
// `resource.mimeType?.toLowerCase()` call in `resolveResourceEditor`.
const buildResource = (overrides: Partial<Resource> = {}): Resource =>
  ({ id: 'r1', name: 'doc.pdf', extension: 'pdf', ...overrides }) as Resource

const buildSpace = () => mock<SpaceResource>({ id: 's1', webDavPath: '/dav/spaces/s1' })

interface MountOptions {
  editorState?: Partial<UseResourceEditorReturn>
  resource?: Resource
  space?: SpaceResource
  extension?: ResourceEditorExtension
  extensionId?: string
  registryExtensions?: ResourceEditorExtension[]
  slots?: Record<string, string>
}

const mountHost = (options: MountOptions = {}) => {
  vi.mocked(useResourceEditor).mockReturnValue(buildEditorState(options.editorState))
  const wrapper = mount(ResourceEditorHost, {
    props: {
      resource: options.resource ?? buildResource(),
      space: options.space ?? buildSpace(),
      extension: options.extension,
      extensionId: options.extensionId
    },
    slots: options.slots,
    global: { plugins: [...defaultPlugins()], stubs: { OcSpinner: true } }
  })
  // Inject registry candidates so auto-resolution can find them.
  if (options.registryExtensions) {
    const registry = useExtensionRegistry()
    vi.mocked(registry.requestExtensions).mockReturnValue(options.registryExtensions as any)
    // Force a re-render of the resolved-extension computed by triggering a
    // small reactive nudge, we re-mount in tests rather than fighting Pinia
    // mock laziness here.
  }
  return wrapper
}

describe('ResourceEditorHost', () => {
  describe('with an explicit `extension` prop', () => {
    it('mounts the extension component once loading resolves', () => {
      const wrapper = mountHost({ extension: buildExtension() })
      const stub = wrapper.find('.editor-stub')
      expect(stub.exists()).toBe(true)
      expect(stub.attributes('data-resource-id')).toBe('r1')
    })

    it('renders the loading partial while the composable signals loading', () => {
      const wrapper = mountHost({
        extension: buildExtension(),
        editorState: { loading: ref(true) as any }
      })
      expect(wrapper.find('.editor-stub').exists()).toBe(false)
      expect(wrapper.findComponent({ name: 'LoadingScreen' }).exists()).toBe(true)
    })

    it('renders the error partial when loadingError is set', () => {
      const wrapper = mountHost({
        extension: buildExtension(),
        editorState: { loadingError: ref(new Error('boom')) as any }
      })
      expect(wrapper.find('.editor-stub').exists()).toBe(false)
      const error = wrapper.findComponent({ name: 'ErrorScreen' })
      expect(error.exists()).toBe(true)
      expect(error.props('message')).toBe('boom')
    })

    it('lets callers override the default slot', () => {
      const wrapper = mountHost({
        extension: buildExtension(),
        slots: { default: '<div class="custom-slot">hello</div>' }
      })
      expect(wrapper.find('.custom-slot').exists()).toBe(true)
      expect(wrapper.find('.editor-stub').exists()).toBe(false)
    })

    it('lets callers override the loading slot', () => {
      const wrapper = mountHost({
        extension: buildExtension(),
        editorState: { loading: ref(true) as any },
        slots: { loading: '<div class="custom-loading">wait</div>' }
      })
      expect(wrapper.find('.custom-loading').exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'LoadingScreen' }).exists()).toBe(false)
    })
  })

  describe('with auto-resolution from the registry', () => {
    // We mock `useExtensionRegistry` entirely (above), so seeding it is
    // synchronous: each test sets the candidates the host's resolved-
    // extension computed will see.
    const seedRegistry = (candidates: ResourceEditorExtension[]) => {
      vi.mocked(useExtensionRegistry).mockReturnValue({
        requestExtensions: vi.fn(() => candidates as any),
        registerExtensions: vi.fn(),
        unregisterExtensions: vi.fn(),
        getExtensionById: vi.fn(),
        registerExtensionPoints: vi.fn(),
        unregisterExtensionPoints: vi.fn(),
        getExtensionPoints: vi.fn()
      } as any)
    }

    it('renders the #no-editor slot when no candidate matches the resource', () => {
      seedRegistry([])
      const wrapper = mount(ResourceEditorHost, {
        props: { resource: buildResource(), space: buildSpace() },
        slots: { 'no-editor': '<div class="nope">no editor for me</div>' },
        global: { plugins: [...defaultPlugins()], stubs: { OcSpinner: true } }
      })
      expect(wrapper.find('.nope').exists()).toBe(true)
    })

    it('picks an extension by exact file extension match', () => {
      const pdfViewer = buildExtension({ id: 'app.pdf', appId: 'pdf-viewer', extensions: ['pdf'] })
      seedRegistry([pdfViewer])
      vi.mocked(useResourceEditor).mockReturnValue(buildEditorState())
      const wrapper = mount(ResourceEditorHost, {
        props: { resource: buildResource({ extension: 'pdf' }), space: buildSpace() },
        global: { plugins: [...defaultPlugins()], stubs: { OcSpinner: true } }
      })
      expect(wrapper.find('.editor-stub').exists()).toBe(true)
    })

    it('picks an extension by mimeType glob match', () => {
      const textEditor = buildExtension({
        id: 'app.text',
        appId: 'text-editor',
        mimeTypes: ['text/*']
      })
      seedRegistry([textEditor])
      vi.mocked(useResourceEditor).mockReturnValue(buildEditorState())
      const wrapper = mount(ResourceEditorHost, {
        props: {
          resource: buildResource({ extension: 'whatever', mimeType: 'text/markdown' }),
          space: buildSpace()
        },
        global: { plugins: [...defaultPlugins()], stubs: { OcSpinner: true } }
      })
      expect(wrapper.find('.editor-stub').exists()).toBe(true)
    })

    it('prefers an extension with hasPriority when multiple match', () => {
      const fallback = buildExtension({
        id: 'app.fallback',
        appId: 'fallback',
        extensions: ['md'],
        component: defineComponent({ template: '<div class="fallback-stub"/>' })
      })
      const priority = buildExtension({
        id: 'app.priority',
        appId: 'priority',
        extensions: ['md'],
        hasPriority: true,
        component: defineComponent({ template: '<div class="priority-stub"/>' })
      })
      seedRegistry([fallback, priority])
      vi.mocked(useResourceEditor).mockReturnValue(buildEditorState())
      const wrapper = mount(ResourceEditorHost, {
        props: { resource: buildResource({ extension: 'md' }), space: buildSpace() },
        global: { plugins: [...defaultPlugins()], stubs: { OcSpinner: true } }
      })
      expect(wrapper.find('.priority-stub').exists()).toBe(true)
      expect(wrapper.find('.fallback-stub').exists()).toBe(false)
    })

    it('honours the `extensionId` prop as an explicit override', () => {
      const editorA = buildExtension({
        id: 'app.a',
        appId: 'a',
        extensions: ['md'],
        component: defineComponent({ template: '<div class="a-stub"/>' })
      })
      const editorB = buildExtension({
        id: 'app.b',
        appId: 'b',
        extensions: ['md'],
        component: defineComponent({ template: '<div class="b-stub"/>' })
      })
      seedRegistry([editorA, editorB])
      vi.mocked(useResourceEditor).mockReturnValue(buildEditorState())
      const wrapper = mount(ResourceEditorHost, {
        props: {
          resource: buildResource({ extension: 'md' }),
          space: buildSpace(),
          extensionId: 'app.b'
        },
        global: { plugins: [...defaultPlugins()], stubs: { OcSpinner: true } }
      })
      expect(wrapper.find('.b-stub').exists()).toBe(true)
      expect(wrapper.find('.a-stub').exists()).toBe(false)
    })
  })
})
