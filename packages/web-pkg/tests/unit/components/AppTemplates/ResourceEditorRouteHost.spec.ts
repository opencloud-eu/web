import { defineComponent, ref } from 'vue'
import { mock } from 'vitest-mock-extended'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import ResourceEditorRouteHost from '../../../../src/components/AppTemplates/ResourceEditorRouteHost.vue'
import { useResourceEditor, useRouteFileLoader } from '../../../../src/composables/resourceEditor'
import { useExtensionRegistry } from '../../../../src/composables/piniaStores'
import type { ResourceEditorExtension } from '../../../../src/composables/piniaStores'
import type { Resource, SpaceResource } from '@opencloud-eu/web-client'

vi.mock('../../../../src/composables/resourceEditor/useResourceEditor')
vi.mock('../../../../src/composables/resourceEditor/useRouteFileLoader')

type UseResourceEditorReturn = ReturnType<typeof useResourceEditor>
type UseRouteFileLoaderReturn = ReturnType<typeof useRouteFileLoader>

const buildEditorState = (
  overrides: Partial<UseResourceEditorReturn> = {}
): UseResourceEditorReturn =>
  ({
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
    currentFileContext: ref({ fileName: 'doc.pdf' }),
    save: vi.fn(),
    closeApp: vi.fn(),
    getUrlForResource: vi.fn(),
    revokeUrl: vi.fn(),
    setCurrentContent: vi.fn(),
    setResource: vi.fn(),
    registerOnDeleteResourceCallback: vi.fn(),
    deleteResourceCallback: ref(null),
    ...overrides
  }) as unknown as UseResourceEditorReturn

const buildLoaderState = (
  overrides: Partial<UseRouteFileLoaderReturn> = {}
): UseRouteFileLoaderReturn =>
  ({
    resource: ref(mock<Resource>({ id: 'r1', name: 'doc.pdf' })),
    space: ref(mock<SpaceResource>()),
    loading: ref(false),
    loadingError: ref(null),
    setResource: vi.fn(),
    closeApp: vi.fn(),
    activeFiles: ref([]),
    isFolderLoading: ref(false),
    loadFolderForFileContext: vi.fn(),
    ...overrides
  }) as unknown as UseRouteFileLoaderReturn

const buildExtension = (): ResourceEditorExtension => ({
  id: 'app.test',
  type: 'resourceEditor',
  appId: 'test-app',
  component: defineComponent({ template: '<section class="editor-stub" />' })
})

const mountHost = (
  options: {
    editor?: Partial<UseResourceEditorReturn>
    loader?: Partial<UseRouteFileLoaderReturn>
  } = {}
) => {
  vi.mocked(useResourceEditor).mockReturnValue(buildEditorState(options.editor))
  vi.mocked(useRouteFileLoader).mockReturnValue(buildLoaderState(options.loader))
  const mocks = defaultComponentMocks()
  return mount(ResourceEditorRouteHost, {
    props: { extension: buildExtension() },
    global: {
      plugins: [
        ...defaultPlugins({
          piniaOptions: {
            appsState: {
              apps: { 'test-app': { id: 'test-app', name: 'Test app' } }
            }
          }
        })
      ],
      mocks,
      provide: mocks,
      stubs: { OcSpinner: true, FileSideBar: true, AppTopBar: true }
    }
  })
}

describe('ResourceEditorRouteHost', () => {
  it('renders the loading partial while the route loader is still loading', () => {
    const wrapper = mountHost({ loader: { loading: ref(true) as any } })
    expect(wrapper.find('.editor-stub').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'LoadingScreen' }).exists()).toBe(true)
  })

  it('renders the loading partial while the file loader is still loading', () => {
    const wrapper = mountHost({ editor: { loading: ref(true) as any } })
    expect(wrapper.find('.editor-stub').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'LoadingScreen' }).exists()).toBe(true)
  })

  it('renders the error partial when the route loader reports an error', () => {
    const wrapper = mountHost({ loader: { loadingError: ref(new Error('nope')) as any } })
    expect(wrapper.find('.editor-stub').exists()).toBe(false)
    const err = wrapper.findComponent({ name: 'ErrorScreen' })
    expect(err.exists()).toBe(true)
    expect(err.props('message')).toBe('nope')
  })

  it('mounts the extension component and the file sidebar once ready', () => {
    const wrapper = mountHost()
    expect(wrapper.find('.editor-stub').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'FileSideBar' }).exists()).toBe(true)
  })

  it('uses extension.appId as the main element id', () => {
    const wrapper = mountHost()
    expect(wrapper.find('main').attributes('id')).toBe('test-app')
  })

  it('invokes the composable closeApp when ESC is pressed', async () => {
    const closeApp = vi.fn()
    const wrapper = mountHost({ editor: { closeApp } })
    await wrapper.find('main').trigger('keydown.esc')
    expect(closeApp).toHaveBeenCalled()
  })

  // Regression: an earlier version only unregistered the TopBar inside the
  // onBeforeRouteLeave callback, leaking it on unmounts that didn't go through
  // a route leave (HMR, KeepAlive flush, programmatic component swap).
  it('unregisters the AppTopBar extension on unmount', () => {
    const wrapper = mountHost()
    const { unregisterExtensions } = useExtensionRegistry()
    vi.mocked(unregisterExtensions).mockClear()
    wrapper.unmount()
    expect(unregisterExtensions).toHaveBeenCalledWith(['app.app-wrapper.app-top-bar'])
  })
})
