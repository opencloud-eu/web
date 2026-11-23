import {
  defaultPlugins,
  defaultComponentMocks,
  mount,
  RouteLocation,
  PartialComponentProps
} from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import ViewOptions from '../../../src/components/ViewOptions.vue'
import ViewModeSwitch from '../../../src/components/ViewModeSwitch.vue'
import { FolderViewModeConstants, useResourcesStore } from '../../../src/composables'
import { FolderView } from '../../../src'
import { OcPageSize, OcSwitch } from '@opencloud-eu/design-system/components'

const storageKeys = {
  perPage: 'oc-options_items-per-page',
  viewMode: 'oc-options_view-mode',
  tileSize: 'oc-options_tiles-size'
}

const selectors = {
  pageSizeSelect: '.oc-page-size',
  hiddenFilesSwitch: '[data-testid="files-switch-hidden-files"]',
  fileExtensionsSwitch: '[data-testid="files-switch-files-extensions-files"]',
  foldersFirstSwitch: '[data-testid="files-switch-folders-first"]',
  viewModeSwitch: 'view-mode-switch-stub',
  tileSizeSlider: '[data-testid="files-tiles-size-slider"]'
}

describe('ViewOptions component', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

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
    it('falls back to the default files page limit', () => {
      const { wrapper } = getWrapper({ perPage: '', props: { perPageDefault: '50' } })
      expect(
        wrapper.findComponent<typeof OcPageSize>(selectors.pageSizeSelect).props().selected
      ).toBe('50')
    })
    it('stores the files page limit', async () => {
      const { wrapper } = getWrapper({ perPage: '100' })
      wrapper.findComponent<typeof OcPageSize>(selectors.pageSizeSelect).vm.$emit('change', 500)
      await wrapper.vm.$nextTick()

      expect(window.localStorage.getItem(storageKeys.perPage)).toBe('500')
      expect(
        wrapper.findComponent<typeof OcPageSize>(selectors.pageSizeSelect).props().selected
      ).toBe('500')
    })
    it('resets the page to 1 if current page is > 1', () => {
      const { wrapper, mocks } = getWrapper({ perPage: '100', query: { page: '2' } })
      wrapper.findComponent<typeof OcPageSize>(selectors.pageSizeSelect).vm.$emit('change', 500)

      expect(mocks.$router.replace).toHaveBeenCalledWith({ query: { page: '1' } })
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
  describe('folders first toggle', () => {
    it('does not show when disabled', () => {
      const { wrapper } = getWrapper({ props: { hasFoldersFirst: false } })
      expect(wrapper.find(selectors.foldersFirstSwitch).exists()).toBeFalsy()
    })
    it('toggles the setting to sort folders first', () => {
      const { wrapper } = getWrapper()
      wrapper
        .findComponent<typeof OcSwitch>(selectors.foldersFirstSwitch)
        .vm.$emit('update:checked', false)

      const { setAreFoldersSortedFirst } = useResourcesStore()
      expect(setAreFoldersSortedFirst).toHaveBeenCalled()
    })
  })
  describe('view mode switcher', () => {
    it('does not show initially', () => {
      const { wrapper } = getWrapper()
      expect(wrapper.find(selectors.viewModeSwitch).exists()).toBeFalsy()
    })
    it('shows if more than one viewModes are passed', () => {
      const { wrapper } = getWrapper({
        props: {
          viewModes: getTileViewModes()
        }
      })
      expect(wrapper.find(selectors.viewModeSwitch).exists()).toBeTruthy()
    })
    it('stores the view mode', async () => {
      const { wrapper } = getWrapper({
        props: { viewModes: getTileViewModes() },
        viewMode: FolderViewModeConstants.name.tiles
      })
      wrapper.findComponent(ViewModeSwitch).vm.$emit('select', getTileViewModes()[1])
      await wrapper.vm.$nextTick()

      expect(window.localStorage.getItem(storageKeys.viewMode)).toBe(
        FolderViewModeConstants.name.table
      )
      expect(wrapper.findComponent(ViewModeSwitch).props('currentViewMode')).toBe(
        FolderViewModeConstants.name.table
      )
    })
    it('does not touch the stored view mode and tile size without view modes', async () => {
      const { wrapper } = getWrapper({
        viewMode: FolderViewModeConstants.name.tiles,
        tileSize: '4'
      })
      await wrapper.vm.$nextTick()

      expect(wrapper.find(selectors.tileSizeSlider).exists()).toBeFalsy()
      expect(window.localStorage.getItem(storageKeys.viewMode)).toBe(
        FolderViewModeConstants.name.tiles
      )
      expect(window.localStorage.getItem(storageKeys.tileSize)).toBe('4')
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
    it('stores the tile size when the slider changes', async () => {
      const { wrapper } = getWrapper({
        props: {
          viewModes: getTileViewModes()
        },
        viewMode: FolderViewModeConstants.name.tiles
      })

      await wrapper.find<HTMLInputElement>(selectors.tileSizeSlider).setValue('4')
      await wrapper.vm.$nextTick()

      expect(window.localStorage.getItem(storageKeys.tileSize)).toBe('4')
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
  query = {}
}: {
  perPage?: string
  viewMode?: string
  tileSize?: string
  props?: PartialComponentProps<typeof ViewOptions>
  query?: Record<string, string>
} = {}) {
  if (perPage) {
    window.localStorage.setItem(storageKeys.perPage, perPage)
  }
  window.localStorage.setItem(storageKeys.viewMode, viewMode)
  window.localStorage.setItem(storageKeys.tileSize, tileSize)

  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ name: 'files', path: '/files', query })
  })
  return {
    mocks,
    wrapper: mount(ViewOptions, {
      props,
      global: {
        mocks,
        provide: mocks,
        stubs: {
          OcButton: true,
          OcPageSize: false,
          OcSelect: true,
          OcDrop: true,
          ViewModeSwitch: true
        },
        plugins: [...defaultPlugins()],
        renderStubDefaultSlot: true
      }
    })
  }
}
