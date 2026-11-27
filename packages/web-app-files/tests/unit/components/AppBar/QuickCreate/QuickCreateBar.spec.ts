import { mock } from 'vitest-mock-extended'
import { nextTick, Ref, ref, unref } from 'vue'
import { useElementSize } from '@vueuse/core'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { FileAction, useFileActions, useResourcesStore } from '@opencloud-eu/web-pkg'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import QuickCreateBar from '../../../../../src/components/AppBar/QuickCreate/QuickCreateBar.vue'
import QuickCreateItem from '../../../../../src/components/AppBar/QuickCreate/QuickCreateItem.vue'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useFileActions: vi.fn()
}))

vi.mock('@vueuse/core', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useElementSize: vi.fn()
}))

const selectors = {
  bar: '.quick-create-bar',
  moreBtn: '#quick-create-more-btn',
  drop: 'oc-drop-stub'
}

function createAction(name: string, ext: string, opts: Partial<FileAction> = {}) {
  return mock<FileAction>({
    name,
    ext,
    isExternal: false,
    label: () => ext,
    isVisible: () => true,
    ...opts
  })
}

describe('QuickCreateBar', () => {
  it('renders nothing without visible actions', () => {
    const { wrapper } = getWrapper({
      actions: [createAction('create-new-file', 'ocnote', { isVisible: () => false })]
    })
    expect(wrapper.find(selectors.bar).exists()).toBe(false)
  })

  it('sorts app file types first, then custom actions, then external file types', () => {
    const { wrapper } = getWrapper({
      actions: [
        createAction('custom', ''),
        createAction('create-new-file', 'ocnote'),
        createAction('create-new-file', 'odt', { isExternal: true })
      ]
    })
    const names = getItems(wrapper).map((item) => item.props('action').name)
    const exts = getItems(wrapper).map((item) => item.props('action').ext)
    expect(names).toEqual(['create-new-file', 'custom', 'create-new-file'])
    expect(exts).toEqual(['ocnote', '', 'odt'])
  })

  it('shows all actions with labels if they fit', () => {
    const { wrapper } = getWrapper({
      width: 1000,
      actions: [createAction('create-new-file', 'ocnote'), createAction('create-new-file', 'odt')]
    })
    const items = getItems(wrapper)
    expect(items.length).toBe(2)
    expect(items.every((item) => !item.props('iconOnly'))).toBe(true)
    expect(wrapper.find(selectors.moreBtn).exists()).toBe(false)
  })

  it('moves exceeding actions into the more menu', () => {
    const actions = ['a', 'b', 'c', 'd', 'e'].map((ext) => createAction('create-new-file', ext))
    // 3 label items (3 * 224 + 2 * 8) + more button (8 + 36) fit into 750px
    const { wrapper } = getWrapper({ width: 750, actions })
    const visible = getItems(wrapper).filter((item) => item.props('appearance') !== 'raw')
    const overflow = wrapper.findComponent(selectors.drop).findAllComponents(QuickCreateItem)
    expect(visible.map((item) => item.props('action').ext)).toEqual(['a', 'b', 'c'])
    expect(overflow.map((item) => item.props('action').ext)).toEqual(['d', 'e'])
    expect(wrapper.find(selectors.moreBtn).exists()).toBe(true)
  })

  it('scales the item widths with the root font size', () => {
    document.documentElement.style.fontSize = '20px'
    try {
      const actions = ['a', 'b', 'c', 'd', 'e'].map((ext) => createAction('create-new-file', ext))
      // 2 label items (2 * 280 + 10) + more button (10 + 45) fit into 900px, 3 at 16px
      const { wrapper } = getWrapper({ width: 900, actions })
      const visible = getItems(wrapper).filter((item) => item.props('appearance') !== 'raw')
      expect(visible.map((item) => item.props('action').ext)).toEqual(['a', 'b'])
    } finally {
      document.documentElement.style.fontSize = ''
    }
  })

  it('keeps the previous actions while the next folder is loading', async () => {
    const actions = ref([createAction('create-new-file', 'ocnote')])
    const { wrapper } = getWrapper({ actions })
    const resourcesStore = useResourcesStore()

    resourcesStore.currentFolder = undefined
    actions.value = []
    await nextTick()
    expect(getItems(wrapper).length).toBe(1)

    resourcesStore.currentFolder = mock<Resource>()
    await nextTick()
    expect(wrapper.find(selectors.bar).exists()).toBe(false)
  })

  it('shows icons only on small screens', () => {
    const { wrapper } = getWrapper({
      width: 400,
      actions: [createAction('create-new-file', 'ocnote')]
    })
    expect(getItems(wrapper)[0].props('iconOnly')).toBe(true)
  })
})

function getItems(wrapper: ReturnType<typeof getWrapper>['wrapper']) {
  return wrapper.findAllComponents(QuickCreateItem)
}

function getWrapper({
  actions = [],
  width = 0
}: {
  actions?: FileAction[] | Ref<FileAction[]>
  width?: number
}) {
  vi.mocked(useFileActions).mockReturnValue(
    mock<ReturnType<typeof useFileActions>>({ getExtensionActions: () => unref(actions) })
  )
  vi.mocked(useElementSize).mockReturnValue({
    width: ref(width),
    height: ref(0),
    stop: vi.fn()
  })

  const mocks = defaultComponentMocks()

  return {
    wrapper: shallowMount(QuickCreateBar, {
      props: { space: mock<SpaceResource>() },
      global: {
        plugins: [
          ...defaultPlugins({
            piniaOptions: { resourcesStore: { currentFolder: mock<Resource>() } }
          })
        ],
        mocks,
        provide: mocks,
        renderStubDefaultSlot: true
      }
    })
  }
}
