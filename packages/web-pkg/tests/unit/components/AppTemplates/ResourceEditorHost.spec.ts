import { defineComponent, ref } from 'vue'
import { mock } from 'vitest-mock-extended'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import ResourceEditorHost from '../../../../src/components/AppTemplates/ResourceEditorHost.vue'
import { useResourceEditor } from '../../../../src/composables/resourceEditor'
import type { ResourceEditorExtension } from '../../../../src/composables/piniaStores'
import type { Resource } from '@opencloud-eu/web-client'

vi.mock('../../../../src/composables/resourceEditor/useResourceEditor')

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

const buildExtension = (
  component = defineComponent({
    props: ['resource'],
    template: '<section class="editor-stub" :data-resource-id="resource?.id" />'
  })
): ResourceEditorExtension => ({
  id: 'app.test',
  type: 'resourceEditor',
  appId: 'test-app',
  component
})

const mountHost = (
  overrides: Partial<UseResourceEditorReturn> = {},
  options: { slots?: Record<string, string>; extension?: ResourceEditorExtension } = {}
) => {
  vi.mocked(useResourceEditor).mockReturnValue(buildEditorState(overrides))
  return mount(ResourceEditorHost, {
    props: { extension: options.extension ?? buildExtension() },
    slots: options.slots,
    global: { plugins: [...defaultPlugins()], stubs: { OcSpinner: true } }
  })
}

describe('ResourceEditorHost', () => {
  it('renders the loading partial while the composable signals loading', () => {
    const wrapper = mountHost({ loading: ref(true) })
    expect(wrapper.find('.editor-stub').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'LoadingScreen' }).exists()).toBe(true)
  })

  it('renders the error partial when loadingError is set', () => {
    const wrapper = mountHost({ loadingError: ref(new Error('boom')) })
    expect(wrapper.find('.editor-stub').exists()).toBe(false)
    const error = wrapper.findComponent({ name: 'ErrorScreen' })
    expect(error.exists()).toBe(true)
    expect(error.props('message')).toBe('boom')
  })

  it('mounts the extension component once loading resolves and forwards the resource', () => {
    const wrapper = mountHost()
    const stub = wrapper.find('.editor-stub')
    expect(stub.exists()).toBe(true)
    expect(stub.attributes('data-resource-id')).toBe('r1')
  })

  it('lets callers override the default slot to customise rendering', () => {
    const wrapper = mountHost({}, { slots: { default: '<div class="custom-slot">hello</div>' } })
    expect(wrapper.find('.custom-slot').exists()).toBe(true)
    expect(wrapper.find('.editor-stub').exists()).toBe(false)
  })

  it('lets callers override the loading slot', () => {
    const wrapper = mountHost(
      { loading: ref(true) },
      { slots: { loading: '<div class="custom-loading">wait</div>' } }
    )
    expect(wrapper.find('.custom-loading').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'LoadingScreen' }).exists()).toBe(false)
  })
})
