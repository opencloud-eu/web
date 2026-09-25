import { ref, unref } from 'vue'
import {
  defaultPlugins,
  defaultComponentMocks,
  mount,
  RouteLocation,
  PartialComponentProps
} from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import ViewOptions from '../../../src/components/ViewOptions.vue'
import {
  FolderViewModeConstants,
  useResourcesStore,
  useRouteQuery,
  useRouteQueryPersisted
} from '../../../src/composables'
import { FolderView } from '../../../src'
import { OcPageSize, OcSwitch } from '@opencloud-eu/design-system/components'

vi.mock('../../../src/composables/router', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useRouteQueryPersisted: vi.fn(),
  useRouteQuery: vi.fn()
}))

const selectors = {
  pageSizeSelect: '.oc-page-size',
  hiddenFilesSwitch: '[data-testid="files-switch-hidden-files"]',
  fileExtensionsSwitch: '[data-testid="files-switch-files-extensions-files"]',
  viewModeSwitchBtns: '#viewmode-switch-toggle',
  tileSizeSlider: '[data-testid="files-tiles-size-slider"]'
}

describe('ViewOptions component', () => {
  describe('pagination', () => {
    it('does not show when disabled', () => {
      const { wrapper } = getWrapper({ props: { hasPagination: false } })
      expect(wrapper.find(selectors.pageSizeSelect).exists()).toBeFalsy()
    })
    it('sets the correct initial files page limit', () => {
      const perPage = '100'
      const { wrapper } = getWrapper({ perPage })
      expect(
        wrapper.findComponent<typeof OcPageSize>(selectors.pageSizeSelect).props().selected
      ).toBe(perPage)
    })
    it('sets the correct files page limit', () => {
      const perPage = '100'
      const newItemsPerPage = '500'
      const { wrapper, mocks } = getWrapper({ perPage })
      ;(wrapper.vm as any).setItemsPerPage(newItemsPerPage)
      expect(mocks.$router.replace).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({ 'items-per-page': newItemsPerPage })
        })
      )
    })
    it('resets the page to 1 if current page is > 1', () => {
      const perPage = '100'
      const newItemsPerPage = '500'
      const { wrapper, mocks } = getWrapper({ perPage, currentPage: '2' })
      ;(wrapper.vm as any).setItemsPerPage(newItemsPerPage)
      expect(mocks.$router.replace).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({ 'items-per-page': newItemsPerPage, page: '1' })
        })
      )
    })
  })
  describe('hidden files toggle', () => {
    it('does not show when disabled', () => {
      const { wrapper } = getWrapper({ props: { hasHiddenFiles: false } })
      expect(wrapper.find(selectors.hiddenFilesSwitch).exists()).toBeFalsy()
    })
    it('toggles the setting to show/hide hidden files', () => {
      const { wrapper } = getWrapper()
      wrapper
        .findComponent<typeof OcSwitch>(selectors.hiddenFilesSwitch)
        .vm.$emit('update:checked', false)

      const { setAreHiddenFilesShown } = useResourcesStore()
      expect(setAreHiddenFilesShown).toHaveBeenCalled()
    })
  })
  describe('file extension toggle', () => {
    it('does not show when disabled', () => {
      const { wrapper } = getWrapper({ props: { hasFileExtensions: false } })
      expect(wrapper.find(selectors.fileExtensionsSwitch).exists()).toBeFalsy()
    })
    it('toggles the setting to show/hide file extensions', () => {
      const { wrapper } = getWrapper()
      wrapper
        .findComponent<typeof OcSwitch>(selectors.fileExtensionsSwitch)
        .vm.$emit('update:checked', false)

      const { setAreFileExtensionsShown } = useResourcesStore()
      expect(setAreFileExtensionsShown).toHaveBeenCalled()
    })
  })
  describe('view mode switcher', () => {
    it('does not show initially', () => {
      const { wrapper } = getWrapper()
      expect(wrapper.find(selectors.viewModeSwitchBtns).exists()).toBeFalsy()
    })
    it('shows if more than one viewModes are passed', () => {
      const { wrapper } = getWrapper({
        props: {
          viewModes: getTileViewModes()
        }
      })
      expect(wrapper.find(selectors.viewModeSwitchBtns).exists()).toBeTruthy()
    })
  })
  describe('view mode and tile size queries', () => {
    it('are not registered if no viewModes are passed', () => {
      vi.mocked(useRouteQueryPersisted).mockClear()
      getWrapper()
      const names = vi.mocked(useRouteQueryPersisted).mock.calls.map(([{ name }]) => name)
      expect(names).not.toContain(FolderViewModeConstants.queryName)
      expect(names).not.toContain(FolderViewModeConstants.tilesSizeQueryName)
    })
    it('are registered if viewModes are passed', () => {
      vi.mocked(useRouteQueryPersisted).mockClear()
      getWrapper({ props: { viewModes: getTileViewModes() } })
      const names = vi.mocked(useRouteQueryPersisted).mock.calls.map(([{ name }]) => name)
      expect(names).toContain(FolderViewModeConstants.queryName)
      expect(names).toContain(FolderViewModeConstants.tilesSizeQueryName)
    })
  })
  describe('tile size slider', () => {
    it('does not show initially', () => {
      const { wrapper } = getWrapper()
      expect(wrapper.find(selectors.tileSizeSlider).exists()).toBeFalsy()
    })
    it('shows if the viewModes include "resource-tiles"', () => {
      const { wrapper } = getWrapper({
        props: {
          viewModes: getTileViewModes()
        },
        viewMode: FolderViewModeConstants.name.tiles
      })
      expect(wrapper.find(selectors.tileSizeSlider).exists()).toBeTruthy()
    })
    it.each([1, 2, 3, 4, 5, 6])('applies the correct size step', (tileSize) => {
      const { mocks } = getWrapper({
        tileSize: tileSize.toString(),
        props: {
          viewModes: getTileViewModes()
        }
      })
      expect(unref(mocks.tileSizeQueryMock)).toBe(tileSize.toString())
    })
    it('updates the tile size query when the slider changes', async () => {
      const { wrapper, mocks } = getWrapper({
        props: {
          viewModes: getTileViewModes()
        },
        viewMode: FolderViewModeConstants.name.tiles
      })

      await wrapper.find<HTMLInputElement>(selectors.tileSizeSlider).setValue('4')

      expect(unref(mocks.tileSizeQueryMock)).toBe('4')
    })
  })
})

function getTileViewModes(): FolderView[] {
  return [
    mock<FolderView>({
      name: FolderViewModeConstants.name.tiles,
      label: 'Tiles view',
      icon: { name: 'app-1', fillType: 'none' }
    }),
    mock<FolderView>({
      name: FolderViewModeConstants.name.table,
      label: 'Table view',
      icon: { name: 'app-2', fillType: 'none' }
    })
  ]
}

function getWrapper({
  perPage = '100',
  viewMode = FolderViewModeConstants.name.table,
  tileSize = '1',
  props = {},
  currentPage = '1'
}: {
  perPage?: string
  viewMode?: string
  tileSize?: string
  props?: PartialComponentProps<typeof ViewOptions>
  currentPage?: string
} = {}) {
  vi.mocked(useRouteQueryPersisted).mockImplementationOnce(() => ref(perPage))
  const tileSizeQueryMock = ref(tileSize)
  if (props.viewModes?.length) {
    vi.mocked(useRouteQueryPersisted).mockImplementationOnce(() => ref(viewMode))
    vi.mocked(useRouteQueryPersisted).mockImplementationOnce(() => tileSizeQueryMock)
  }
  vi.mocked(useRouteQuery).mockImplementationOnce(() => ref(currentPage))

  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files', path: '/files' })
    }),
    tileSizeQueryMock
  }
  return {
    mocks,
    wrapper: mount(ViewOptions, {
      props: {
        perPageStoragePrefix: '',
        ...props
      },
      global: {
        mocks,
        provide: mocks,
        stubs: { OcButton: true, OcPageSize: false, OcSelect: true, OcDrop: true },
        plugins: [...defaultPlugins()],
        renderStubDefaultSlot: true
      }
    })
  }
}
