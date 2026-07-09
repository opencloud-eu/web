import { shallowMount } from '@vue/test-utils'
import Application from '../../../src/layouts/Application.vue'

const mockState = vi.hoisted(() => ({
  embedModeEnabled: false
}))

vi.mock('@opencloud-eu/web-pkg', async () => {
  const { computed, defineComponent, ref } = await import('vue')

  return {
    AppLoadingSpinner: defineComponent({ template: '<div />' }),
    CustomComponentTarget: defineComponent({ template: '<div />' }),
    useActiveApp: () => ref('files'),
    useEmbedMode: () => ({ isEnabled: computed(() => mockState.embedModeEnabled) }),
    useExtensionRegistry: () => ({ requestExtensions: vi.fn(() => []) }),
    useRouteMeta: () => ref('user'),
    useSpacesLoading: () => ({ areSpacesLoading: ref(false) }),
    useNavItems: () => ({ navItems: ref([]) })
  }
})

vi.mock('@opencloud-eu/design-system/composables', async () => {
  const { ref } = await import('vue')

  return {
    useIsMobile: () => ({ isTablet: ref(false) })
  }
})

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

vi.mock('../../../src/components/Topbar/TopBar.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('../../../src/components/MessageBar.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('../../../src/components/SidebarNav/SidebarNav.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('../../../src/components/UploadInfo.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('../../../src/components/AppFloatingActionButton.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('../../../src/extensionPoints', () => ({
  progressBarExtensionPoint: { id: 'progress-bar', extensionType: 'customComponent' },
  snackbarExtensionPoint: { id: 'snackbar', extensionType: 'customComponent' }
}))

describe('Application layout', () => {
  afterEach(() => {
    mockState.embedModeEnabled = false
  })

  it('keeps snackbars near the viewport bottom outside embed mode', () => {
    const wrapper = shallowMount(Application)

    expect(wrapper.find('.snackbars').classes()).toContain('bottom-[20px]')
    expect(wrapper.find('.snackbars').classes()).not.toContain('bottom-[70px]')
  })

  it('moves snackbars above embed actions in embed mode', () => {
    mockState.embedModeEnabled = true

    const wrapper = shallowMount(Application)

    expect(wrapper.find('.snackbars').classes()).toContain('bottom-[70px]')
    expect(wrapper.find('.snackbars').classes()).not.toContain('bottom-[20px]')
  })
})
