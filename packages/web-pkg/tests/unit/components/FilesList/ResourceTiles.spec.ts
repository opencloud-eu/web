import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import ResourceTiles from '../../../../src/components/FilesList/ResourceTiles.vue'
import { filesSortFields } from '../../../../src/helpers/ui/sortFields'
import { Resource, SpaceResource, extractDomSelector } from '@opencloud-eu/web-client'
import { computed, nextTick } from 'vue'
import { createGettext } from 'vue3-gettext'
import {
  useCanBeOpenedWithSecureView,
  ResourceIndicator
} from '../../../../src/composables/resources'
import { OcFilterChip } from '@opencloud-eu/design-system/components'
import { resourceDragDataType, useResourcesStore } from '../../../../src'
import { flushPromises } from '@vue/test-utils'

vi.mock('../../../../src/helpers/contextMenuDropdown')
vi.mock('../../../../src/composables/viewMode', async (importOriginal) => {
  const original = await importOriginal<any>()
  return {
    ...original,
    useTileSize: vi.fn().mockImplementation(() => ({
      ...original.useTileSize(),
      calculateTileSizePixels: vi.fn().mockImplementation((viewSize: number) => 100 * viewSize)
    }))
  }
})

const mockUseEmbedMode = vi.fn().mockReturnValue({ isEnabled: computed(() => false) })
vi.mock('../../../../src/composables/embedMode', () => ({
  useEmbedMode: vi.fn().mockImplementation(() => mockUseEmbedMode())
}))

vi.mock('../../../../src/composables/resources', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useCanBeOpenedWithSecureView: vi.fn()
}))

vi.mock('../../../../src/composables/actions/files', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useFileActions: vi.fn().mockReturnValue({
    getDefaultAction: vi.fn().mockReturnValue({ route: () => ({}), handler: vi.fn() })
  })
}))

const spacesResources = [
  {
    id: '1',
    storageId: '1',
    name: 'Space 1',
    path: '',
    type: 'space',
    isFolder: true,
    indicators: [],
    getDomSelector: vi.fn(),
    getDriveAliasAndItem: () => '1'
  },
  {
    id: '2',
    storageId: '2',
    name: 'Space 2',
    path: '',
    type: 'space',
    isFolder: true,
    indicators: [],
    getDomSelector: vi.fn(),
    getDriveAliasAndItem: () => '2'
  }
] as unknown as SpaceResource[]

const resources: Resource[] = [
  {
    id: 'forest',
    resourceId: 'forest',
    driveId: 'forest',
    storageId: '1',
    name: 'forest.jpg',
    path: 'images/nature/forest.jpg',
    extension: 'jpg',
    thumbnail: 'https://cdn.pixabay.com/photo/2015/09/09/16/05/forest-931706_960_720.jpg',
    isFolder: false,
    indicators: [] as ResourceIndicator[],
    type: 'file',
    tags: ['space', 'tag', 'moon'],
    size: '111000234',
    hidden: false,
    syncEnabled: true,
    outgoing: false,
    canRename: vi.fn(),
    getDomSelector: () => extractDomSelector('forest'),
    canDownload: () => true
  } as Resource
]

describe('ResourceTiles component', () => {
  const originalGetElementById = document.getElementById
  beforeEach(() => {
    const mockElement = document.createElement('div')
    Object.defineProperty(mockElement, 'clientWidth', { value: 800, configurable: true })
    document.getElementById = vi.fn((id) => {
      if (id === 'tiles-view') {
        return mockElement
      }
      return originalGetElementById.call(document, id)
    })
  })
  it('renders an array of spaces correctly', async () => {
    const { wrapper } = getWrapper({ props: { resources: spacesResources } })
    await wrapper.vm.$nextTick()
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('loads the preview again but keeps the tile when its resource changed', async () => {
    const resource = { ...spacesResources[0], etag: 'old' }
    const { wrapper } = getWrapper({ props: { resources: [resource] } })
    const tile = wrapper.find('.oc-tiles-item').element
    expect(wrapper.emitted('itemVisible')).toHaveLength(1)

    await wrapper.setProps({ resources: [{ ...resource, etag: 'new' }] })

    expect(wrapper.emitted('itemVisible')).toHaveLength(2)
    expect(wrapper.find('.oc-tiles-item').element).toBe(tile)
  })

  it('renders a footer slot', () => {
    const { wrapper } = getWrapper({ slots: { footer: 'Hello, ResourceTiles footer!' } })
    expect(wrapper.html()).toMatchSnapshot()
  })

  describe('file click', () => {
    it('emits fileClick event upon click on tile', async () => {
      const { wrapper } = getWrapper({ props: { resources } })
      const resourceTile = wrapper.findComponent({ name: 'ResourceTile' })

      const mockMouseEvent = {
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
        stopPropagation: vi.fn(),
        preventDefault: vi.fn()
      } as unknown as MouseEvent

      const resourcesStore = useResourcesStore()
      resourcesStore.selectedIds = [resources[0].id]
      await resourceTile.vm.$emit('fileNameClicked', mockMouseEvent)
      expect(wrapper.emitted('fileClick')).toBeTruthy()
    })

    it('does not emit fileClick event if file can not be opened via secure view', async () => {
      const { wrapper } = getWrapper({
        canBeOpenedWithSecureView: false,
        props: {
          resources: [{ ...resources[0], isFolder: false, canDownload: () => false }]
        }
      })
      await wrapper.find('.oc-tiles-item .oc-resource-name').trigger('click')
      expect(wrapper.emitted().fileClick).toBeUndefined()
    })

    it.each([
      { defaultPrevented: false, selects: true },
      { defaultPrevented: true, selects: false }
    ])(
      'selects the tile on click only if no link handled it (defaultPrevented: $defaultPrevented)',
      async ({ defaultPrevented, selects }) => {
        const { wrapper } = getWrapper({ props: { resources } })
        const tileName = wrapper.find('.oc-tiles-item .resource-name-wrapper')
        if (defaultPrevented) {
          tileName.element.addEventListener('click', (event) => event.preventDefault())
        }
        await tileName.trigger('click')
        expect(!!wrapper.emitted('update:selectedIds')).toBe(selects)
      }
    )
  })

  it('reflects the store selection on the resource tile', async () => {
    const { wrapper } = getWrapper({ props: { resources: spacesResources } })
    const resourcesStore = useResourcesStore()
    resourcesStore.selectedIds = [spacesResources[0].id]
    await nextTick()
    expect(wrapper.find('.oc-tile-card-selected').exists()).toBeTruthy()
  })

  it('emits update:selectedIds event on resource selection', async () => {
    const { wrapper } = getWrapper({
      props: {
        resources: spacesResources,
        selectedIds: [spacesResources[0].id]
      }
    })
    await wrapper.find('#tiles-view-select-all').trigger('click')
    expect(wrapper.emitted('update:selectedIds')).toBeTruthy()
  })

  describe('sorting', () => {
    it('renders the label of the first sort field as default', () => {
      const { wrapper } = getWrapper({ props: { sortFields: filesSortFields.tiles } })
      expect(wrapper.find('.oc-tiles-sort .oc-filter-chip-label').text()).toEqual(
        filesSortFields.tiles[0].label
      )
    })
    it('renders the label of the current sort field as default', () => {
      const sortField = filesSortFields.tiles[2]
      const { wrapper } = getWrapper({
        props: {
          sortFields: filesSortFields.tiles,
          sortBy: sortField.name,
          sortDir: sortField.sortDir
        }
      })
      expect(wrapper.find('.oc-tiles-sort .oc-filter-chip-label').text()).toEqual(sortField.label)
    })
    it('translates the labels of the sort options', () => {
      const { wrapper } = getWrapper({
        props: { sortFields: filesSortFields.tiles },
        stubs: { OcDrop: true },
        translations: { de: { 'A-Z': 'A bis Z', 'Z-A': 'Z bis A' } }
      })
      expect(wrapper.find('.oc-tiles-sort .oc-filter-chip-label').text()).toEqual('A bis Z')
      const options = wrapper.findAll('.oc-tiles-sort-filter-chip-item')
      expect(options[0].text()).toEqual('A bis Z')
      expect(options[1].text()).toEqual('Z bis A')
    })
    it('emits the "sort"-event', async () => {
      const { wrapper } = getWrapper({
        props: { sortFields: filesSortFields.tiles },
        stubs: { OcDrop: true }
      })
      const filterChip = wrapper.findComponent<typeof OcFilterChip>({ name: 'oc-filter-chip' })
      await filterChip.trigger('click')
      const sortItem = filterChip.findAll('.oc-tiles-sort-filter-chip-item')
      await sortItem[1].trigger('click')
      expect(wrapper.emitted('sort')).toBeTruthy()
    })
  })
  describe('drag and drop', () => {
    function getDragStartEvent({
      setData = vi.fn(),
      target = document.createElement('div'),
      currentTarget = target
    }: { setData?: () => void; target?: HTMLElement; currentTarget?: HTMLElement } = {}) {
      return {
        dataTransfer: { setDragImage: vi.fn(), setData },
        target,
        currentTarget,
        preventDefault: vi.fn()
      }
    }

    it('cancels drags and starts no resource drag when dragging is disabled', () => {
      const { wrapper } = getWrapper({
        props: { resources: spacesResources },
        stubs: { ResourceTile: true }
      })
      const event = getDragStartEvent()
      wrapper.findComponent<any>('resource-tile-stub').vm.$emit('dragstart', event)

      const resourcesStore = useResourcesStore()
      expect(event.preventDefault).toHaveBeenCalled()
      expect(event.dataTransfer.setData).not.toHaveBeenCalled()
      expect(resourcesStore.setDraggedResources).not.toHaveBeenCalled()
      expect(resourcesStore.setSelection).not.toHaveBeenCalled()
    })
    it('cancels native drags of child elements, like images or links', () => {
      const { wrapper } = getWrapper({
        props: { resources: spacesResources, isDraggable: true },
        stubs: { ResourceTile: true }
      })
      const tile = document.createElement('div')
      const image = document.createElement('img')
      tile.appendChild(image)
      const event = getDragStartEvent({ target: image, currentTarget: tile })
      wrapper.findComponent<any>('resource-tile-stub').vm.$emit('dragstart', event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(useResourcesStore().setDraggedResources).not.toHaveBeenCalled()
    })
    it('emits the "update:selectedIds"-event on drag start', async () => {
      const { wrapper } = getWrapper({
        props: { resources: spacesResources, isDraggable: true },
        stubs: { ResourceTile: true }
      })

      const resourceTile = wrapper.findComponent<any>('resource-tile-stub')
      resourceTile.vm.$emit('dragstart', getDragStartEvent())
      await flushPromises()

      expect(wrapper.emitted('update:selectedIds')).toBeDefined()
    })
    it('replaces the selection with the dragged resource if it is not selected', async () => {
      const { wrapper } = getWrapper({
        props: { resources: spacesResources, isDraggable: true },
        stubs: { ResourceTile: true },
        selectedIds: ['2']
      })

      const resourceTile = wrapper.findComponent<any>('resource-tile-stub')
      resourceTile.vm.$emit('dragstart', getDragStartEvent())
      await flushPromises()

      const resourcesStore = useResourcesStore()
      expect(resourcesStore.setSelection).toHaveBeenCalledWith(['1'])
      expect(wrapper.emitted('update:selectedIds')).toEqual([[['1']]])
    })
    it('keeps the selection if the dragged resource is already selected', async () => {
      const { wrapper } = getWrapper({
        props: { resources: spacesResources, isDraggable: true },
        stubs: { ResourceTile: true },
        selectedIds: ['1', '2']
      })

      const resourceTile = wrapper.findComponent<any>('resource-tile-stub')
      resourceTile.vm.$emit('dragstart', getDragStartEvent())
      await flushPromises()

      const resourcesStore = useResourcesStore()
      expect(resourcesStore.setSelection).not.toHaveBeenCalled()
      expect(resourcesStore.toggleSelection).not.toHaveBeenCalled()
      expect(wrapper.emitted('update:selectedIds')).toBeUndefined()
    })
    it.each([
      { name: 'the dragged resource', selectedIds: ['2'], expectedIds: ['1'] },
      {
        name: 'the selection of the dragged resource, also across spaces',
        selectedIds: ['1', '2'],
        expectedIds: ['1', '2']
      }
    ])(
      'marks the drag and shares $name until the drag ends',
      async ({ selectedIds, expectedIds }) => {
        // a view without one space, like favorites or search results with resources of several spaces
        const { wrapper } = getWrapper({
          props: { resources: spacesResources, isDraggable: true },
          stubs: { ResourceTile: true },
          selectedIds
        })
        const setData = vi.fn()
        const target = document.createElement('div')

        wrapper
          .findComponent<any>('resource-tile-stub')
          .vm.$emit('dragstart', getDragStartEvent({ setData, target }))
        await flushPromises()

        const resourcesStore = useResourcesStore()
        expect(setData).toHaveBeenCalledWith(resourceDragDataType, expectedIds.join())
        expect(resourcesStore.setDraggedResources).toHaveBeenCalledWith(
          spacesResources.filter(({ id }) => expectedIds.includes(id))
        )

        target.dispatchEvent(new Event('dragend'))
        expect(resourcesStore.setDraggedResources).toHaveBeenLastCalledWith([])
      }
    )
    it('uses the ghost as drag image', async () => {
      const { wrapper } = getWrapper({
        props: { resources: spacesResources, isDraggable: true },
        stubs: { ResourceTile: true }
      })
      const event = getDragStartEvent()
      wrapper.findComponent<any>('resource-tile-stub').vm.$emit('dragstart', event)
      await flushPromises()

      expect(event.dataTransfer.setDragImage).toHaveBeenCalledTimes(1)
      expect(event.dataTransfer.setDragImage).toHaveBeenCalledWith(
        document.querySelector('#ghost-element'),
        0,
        0
      )
      wrapper.unmount()
    })
    it('does not touch the ghost when the drag ends before it got rendered', async () => {
      const { wrapper } = getWrapper({
        props: { resources: spacesResources, isDraggable: true },
        stubs: { ResourceTile: true }
      })
      const event = getDragStartEvent()
      wrapper.findComponent<any>('resource-tile-stub').vm.$emit('dragstart', event)
      event.target.dispatchEvent(new Event('dragend'))
      await flushPromises()

      expect(event.dataTransfer.setDragImage).not.toHaveBeenCalled()
    })
    it('emits the "fileDropped"-event on resource drop', () => {
      const { wrapper } = getWrapper({
        props: { resources: spacesResources, dragDrop: true },
        stubs: { ResourceTile: true }
      })

      const resourceTile = wrapper.findComponent<any>('resource-tile-stub')
      expect(resourceTile.attributes('draggable')).toBe('true')
      resourceTile.vm.$emit('drop', {
        dataTransfer: {}
      } as DragEvent)

      expect(wrapper.emitted('fileDropped')).toBeDefined()
    })
    it('makes the tiles draggable but no drop targets with "isDraggable"', async () => {
      const { wrapper } = getWrapper({
        props: { resources: spacesResources, isDraggable: true },
        stubs: { ResourceTile: true }
      })

      const resourceTile = wrapper.findComponent<any>('resource-tile-stub')
      expect(resourceTile.attributes('draggable')).toBe('true')
      resourceTile.vm.$emit('dragstart', getDragStartEvent())
      await flushPromises()
      resourceTile.vm.$emit('drop', {
        dataTransfer: {}
      } as DragEvent)

      expect(wrapper.emitted('update:selectedIds')).toBeDefined()
      expect(wrapper.emitted('fileDropped')).toBeUndefined()
    })
  })
  describe('context menu', () => {
    it('does not show for disabled resources', () => {
      const { wrapper } = getWrapper({
        props: { resources: [{ ...resources[0], processing: true }] }
      })
      expect(wrapper.find('.resource-tiles-btn-action-dropdown').exists()).toBeFalsy()
    })
  })
  describe('checkboxes', () => {
    it('update the selected ids on click', async () => {
      const { wrapper } = getWrapper({ props: { resources } })
      const checkbox = wrapper.find('input[type="checkbox"]')
      await checkbox.trigger('click')
      expect(wrapper.emitted('update:selectedIds')).toBeTruthy()
    })
    it('are disabled for disabled resources', () => {
      const { wrapper } = getWrapper({
        props: { resources: [{ ...resources[0], processing: true }] }
      })
      const checkbox = wrapper.find('input[type="checkbox"]')
      expect(Object.keys(checkbox.attributes())).toContain('disabled')
    })
  })
  describe('tile size', () => {
    afterEach(() => {
      document.documentElement.style.removeProperty('--oc-size-tiles-actual')
      document.documentElement.style.removeProperty('font-size')
    })

    it('fits one tile into a view narrower than half a tile', async () => {
      document.documentElement.style.setProperty('font-size', '16px')
      const narrowView = document.createElement('div')
      Object.defineProperty(narrowView, 'clientWidth', { value: 40, configurable: true })
      vi.mocked(document.getElementById).mockReturnValue(narrowView)

      getWrapper({ props: { resources } })
      await nextTick()

      expect(document.documentElement.style.getPropertyValue('--oc-size-tiles-actual')).toBe('24px')
    })
  })
  describe('delete queue', () => {
    it('sets resources that are in the delete queue in a loading state', () => {
      const { wrapper } = getWrapper({ props: { resources }, deleteQueue: [resources[0].id] })
      expect(wrapper.find('.oc-tile-card-loading-spinner').exists()).toBeTruthy()
    })
  })

  it.each([
    { viewSize: 1, expected: 'size-12' },
    { viewSize: 2, expected: 'size-12' },
    { viewSize: 3, expected: 'size-22' },
    { viewSize: 4, expected: 'size-22' },
    { viewSize: 5, expected: 'size-42' },
    { viewSize: 6, expected: 'size-42' }
  ])('passes the "viewSize" to the OcTile component', async (data) => {
    const { wrapper } = getWrapper({
      props: { resources: spacesResources, viewSize: data.viewSize }
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent({ name: 'resource-tile' }).props('resourceIconSize')).toEqual(
      data.expected
    )
  })

  function getWrapper({
    props = {},
    slots = {},
    stubs = {},
    canBeOpenedWithSecureView = true,
    deleteQueue = [],
    selectedIds = [],
    translations
  }: {
    props?: Record<string, unknown>
    slots?: Record<string, string>
    stubs?: Record<string, boolean>
    canBeOpenedWithSecureView?: boolean
    deleteQueue?: string[]
    selectedIds?: string[]
    translations?: Record<string, Record<string, string>>
  } = {}) {
    const mocks = defaultComponentMocks()

    vi.mocked(useCanBeOpenedWithSecureView).mockReturnValue({
      canBeOpenedWithSecureView: () => canBeOpenedWithSecureView
    })

    return {
      wrapper: mount(ResourceTiles, {
        props: {
          lazy: false,
          viewSize: 1,
          ...props
        },
        slots: {
          ...slots
        },
        global: {
          plugins: [
            ...defaultPlugins({
              gettext: !translations,
              piniaOptions: {
                resourcesStore: { deleteQueue, selectedIds },
                spacesState: { spaces: spacesResources }
              }
            }),
            ...(translations
              ? [createGettext({ translations, defaultLanguage: 'de', silent: true })]
              : [])
          ],
          mocks: mocks,
          provide: mocks,
          stubs,
          renderStubDefaultSlot: true
        }
      })
    }
  }
})
