import { ref } from 'vue'
import AppTemplate from '../../../src/components/AppTemplate.vue'
import {
  defaultComponentMocks,
  defaultPlugins,
  RouteLocation,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import { SideBar, useIsTopBarSticky, useSideBar } from '@opencloud-eu/web-pkg'
import { mock } from 'vitest-mock-extended'
import { OcBreadcrumb } from '@opencloud-eu/design-system/components'

const stubSelectors = {
  ocBreadcrumb: 'oc-breadcrumb-stub',
  appLoadingSpinner: 'app-loading-spinner-stub',
  sideBar: 'side-bar-stub'
}

const elSelectors = {
  adminSettingsWrapper: '#admin-settings-view-wrapper'
}

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useIsTopBarSticky: vi.fn(),
  useAppDefaults: vi.fn(() => ({}))
}))

describe('AppTemplate', () => {
  describe('loading is true', () => {
    it('should show app loading spinner component', () => {
      const { wrapper } = getWrapper({ props: { loading: true } })
      expect(wrapper.find(stubSelectors.appLoadingSpinner).exists()).toBeTruthy()
    })
    it('should not show side bar component', () => {
      const { wrapper } = getWrapper({ props: { loading: true } })
      expect(wrapper.find(stubSelectors.sideBar).exists()).toBeFalsy()
    })
    it('should not show admin settings wrapper', () => {
      const { wrapper } = getWrapper({ props: { loading: true } })
      expect(wrapper.find(elSelectors.adminSettingsWrapper).exists()).toBeFalsy()
    })
  })
  describe('loading is false', () => {
    it('should not show app loading spinner component', () => {
      const { wrapper } = getWrapper({ props: { loading: false } })
      expect(wrapper.find(stubSelectors.appLoadingSpinner).exists()).toBeFalsy()
    })
    it('should show side bar component', () => {
      const { wrapper } = getWrapper({ props: { loading: false } })
      expect(wrapper.find(stubSelectors.sideBar).exists()).toBeTruthy()
    })
    it('should show admin settings wrapper', () => {
      const { wrapper } = getWrapper({ props: { loading: false } })
      expect(wrapper.find(elSelectors.adminSettingsWrapper).exists()).toBeTruthy()
    })
  })
  describe('sideBar', () => {
    it('should show when opened', () => {
      const { wrapper } = getWrapper({ isSideBarOpen: true })
      expect(wrapper.find(stubSelectors.sideBar).exists()).toBeTruthy()
    })
    it('should not show when closed', () => {
      const { wrapper } = getWrapper({ isSideBarOpen: false })
      expect(wrapper.find(stubSelectors.sideBar).exists()).toBeFalsy()
    })
  })
  describe('property propagation', () => {
    describe('oc breadcrumb component', () => {
      it('receives correct props', () => {
        const { wrapper } = getWrapper({
          props: { breadcrumbs: [{ text: 'Administration Settings' }, { text: 'Users' }] }
        })
        expect(
          wrapper.findComponent<typeof OcBreadcrumb>(stubSelectors.ocBreadcrumb).props().items
        ).toEqual([{ text: 'Administration Settings' }, { text: 'Users' }])
      })
      it('does not show in mobile view', () => {
        const { wrapper } = getWrapper({ isMobileWidth: true })
        expect(wrapper.find(stubSelectors.ocBreadcrumb).exists()).toBeFalsy()
      })
    })
    describe('side bar component', () => {
      it('receives correct props', () => {
        const { wrapper } = getWrapper({
          props: {
            sideBarActivePanel: 'DetailsPanel',
            sideBarAvailablePanels: [{ app: 'DetailsPanel' }]
          }
        })
        expect(
          wrapper.findComponent<typeof SideBar>(stubSelectors.sideBar).props().availablePanels
        ).toEqual([{ app: 'DetailsPanel' }])
      })
    })
  })
})

function getWrapper({ props = {}, isMobileWidth = false, isSideBarOpen = true } = {}) {
  vi.mocked(useIsTopBarSticky).mockReturnValue({ isSticky: ref(true) })

  const plugins = [...defaultPlugins()]
  const sideBarStore = useSideBar()
  sideBarStore.isSideBarOpen = isSideBarOpen

  return {
    wrapper: shallowMount(AppTemplate, {
      props: {
        loading: false,
        breadcrumbs: [],
        sideBarAvailablePanels: [],
        ...props
      },
      global: {
        plugins,
        provide: { isMobileWidth: ref(isMobileWidth) },
        stubs: {
          OcButton: false
        },
        mocks: {
          ...defaultComponentMocks({
            currentRoute: mock<RouteLocation>({ query: { app: 'admin-settings' } })
          })
        }
      }
    })
  }
}
