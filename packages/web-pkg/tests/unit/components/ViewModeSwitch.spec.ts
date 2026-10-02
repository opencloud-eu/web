import { computed } from 'vue'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { useIsMobile } from '@opencloud-eu/design-system/composables'
import ViewModeSwitch from '../../../src/components/ViewModeSwitch.vue'
import { FolderViewModeConstants } from '../../../src/composables'
import { FolderView } from '../../../src'

vi.mock('@opencloud-eu/design-system/composables', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@opencloud-eu/design-system/composables')>()),
  useIsMobile: vi.fn()
}))

const selectors = {
  toggleGroup: '#viewmode-switch',
  dropToggle: '#viewmode-switch-toggle',
  tilesBtn: `.${FolderViewModeConstants.name.tiles}`,
  tableBtn: `.${FolderViewModeConstants.name.table}`
}

describe('ViewModeSwitch component', () => {
  describe('on desktop', () => {
    it('renders the view modes as toggle buttons', () => {
      const { wrapper } = getWrapper()
      expect(wrapper.find(selectors.toggleGroup).exists()).toBeTruthy()
      expect(wrapper.find(selectors.dropToggle).exists()).toBeFalsy()
    })
    it('marks the active view mode as pressed', () => {
      const { wrapper } = getWrapper()
      expect(wrapper.find(selectors.tilesBtn).attributes('aria-pressed')).toBe('true')
      expect(wrapper.find(selectors.tableBtn).attributes('aria-pressed')).toBe('false')
    })
    it('emits the selected view mode on click', async () => {
      const { wrapper } = getWrapper()
      await wrapper.find(selectors.tableBtn).trigger('click')
      expect(wrapper.emitted('select')[0][0]).toMatchObject({
        name: FolderViewModeConstants.name.table
      })
    })
  })
  describe('on mobile', () => {
    it('renders the view modes in a drop menu', () => {
      const { wrapper } = getWrapper({ isMobile: true })
      expect(wrapper.find(selectors.dropToggle).exists()).toBeTruthy()
      expect(wrapper.find(selectors.toggleGroup).exists()).toBeFalsy()
    })
  })
})

function getViewModes(): FolderView[] {
  return [
    mock<FolderView>({
      name: FolderViewModeConstants.name.tiles,
      label: 'Grid',
      icon: { name: 'app-1', fillType: 'none' }
    }),
    mock<FolderView>({
      name: FolderViewModeConstants.name.table,
      label: 'List',
      icon: { name: 'app-2', fillType: 'none' }
    })
  ]
}

function getWrapper({ isMobile = false }: { isMobile?: boolean } = {}) {
  vi.mocked(useIsMobile).mockReturnValue({
    isMobile: computed(() => isMobile),
    isTablet: computed(() => false)
  })

  return {
    wrapper: mount(ViewModeSwitch, {
      props: {
        viewModes: getViewModes(),
        currentViewMode: FolderViewModeConstants.name.tiles
      },
      global: {
        plugins: [...defaultPlugins()],
        stubs: { OcDrop: true },
        renderStubDefaultSlot: true
      }
    })
  }
}
