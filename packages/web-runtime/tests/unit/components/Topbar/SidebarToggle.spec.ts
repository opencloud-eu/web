import { useSideBar } from '@opencloud-eu/web-pkg'
import SidebarToggle from '../../../../src/components/Topbar/SideBarToggle.vue'
import { defaultPlugins, mount, defaultComponentMocks } from '@opencloud-eu/web-test-helpers'

const selectors = {
  toggleSidebarBtn: '#files-toggle-sidebar'
}

describe('SidebarToggle component', () => {
  it.each([true, false])(
    'should show the "Toggle sidebar"-button with sidebar opened and closed',
    (isSideBarOpen) => {
      const { wrapper } = getWrapper({ isSideBarOpen })
      expect(wrapper.find(selectors.toggleSidebarBtn).exists()).toBeTruthy()
      expect(wrapper.html()).toMatchSnapshot()
    }
  )
  it('publishes the toggle-event to the sidebar on click', async () => {
    const { wrapper } = getWrapper()
    const { toggleSideBar } = useSideBar()
    await wrapper.find(selectors.toggleSidebarBtn).trigger('click')
    expect(toggleSideBar).toHaveBeenCalled()
  })
})

function getWrapper({ isSideBarOpen = false } = {}) {
  const mocks = defaultComponentMocks()

  const plugins = [...defaultPlugins()]
  const sideBarStore = useSideBar()
  sideBarStore.isSideBarOpen = isSideBarOpen

  return {
    mocks,
    wrapper: mount(SidebarToggle, {
      global: {
        mocks,
        plugins
      }
    })
  }
}
