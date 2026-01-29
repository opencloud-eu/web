import SideBar from '../../../../src/components/SideBar/SideBar.vue'
import { mock } from 'vitest-mock-extended'
import {
  defaultComponentMocks,
  defaultPlugins,
  PartialComponentProps,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import { SideBarPanelContext } from '../../../../types'
import { useIsMobile } from '@opencloud-eu/design-system/composables'
import { computed } from 'vue'
import { OcBottomDrawer } from '@opencloud-eu/design-system/components'

vi.mock('@opencloud-eu/design-system/composables', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useIsMobile: vi.fn()
}))

describe('SideBar', () => {
  describe('on mobile', () => {
    it('should enable the teleport and render the bottom drawer', () => {
      const { wrapper } = createWrapper({ isMobile: true })
      expect(wrapper.find('teleport-stub').attributes('disabled')).toBe('false')
      expect(wrapper.find('oc-bottom-drawer-stub').exists()).toBeTruthy()
    })
    it('closes the sidebar on unmount', () => {
      const { wrapper } = createWrapper({ isMobile: true })
      expect(wrapper.emitted('close')).toBeUndefined()
      wrapper.unmount()
      expect(wrapper.emitted('close')).toBeDefined()
    })
    describe('bottom drawer clicked', () => {
      it('does not close when clicking a generic element inside', () => {
        const { wrapper } = createWrapper({ isMobile: true })
        const drawer = wrapper.findComponent<typeof OcBottomDrawer>('oc-bottom-drawer-stub')

        const clickedEl = document.createElement('button')
        drawer.vm.$emit('clicked', { target: clickedEl })
        expect(wrapper.emitted('close')).not.toBeDefined()
      })
      it('closes when clicking outside of the drawer', () => {
        const { wrapper } = createWrapper({ isMobile: true })
        const drawer = wrapper.findComponent<typeof OcBottomDrawer>('oc-bottom-drawer-stub')

        const clickedEl = document.createElement('div')
        drawer.vm.$emit('clicked', { target: clickedEl, currentTarget: clickedEl })
        expect(wrapper.emitted('close')).toBeDefined()
      })
      it('closes when clicking on a link inside the drawer', () => {
        const { wrapper } = createWrapper({ isMobile: true })
        const drawer = wrapper.findComponent<typeof OcBottomDrawer>('oc-bottom-drawer-stub')

        const clickedEl = document.createElement('a')
        drawer.vm.$emit('clicked', { target: clickedEl })
        expect(wrapper.emitted('close')).toBeDefined()
      })
      it('closes when clicking on an action from the actions panel', () => {
        const { wrapper } = createWrapper({ isMobile: true })
        const drawer = wrapper.findComponent<typeof OcBottomDrawer>('oc-bottom-drawer-stub')

        const clickedEl = document.createElement('button')
        const actionsList = document.createElement('ul')
        actionsList.classList.add('sidebar-actions-panel')
        actionsList.appendChild(clickedEl)
        drawer.vm.$emit('clicked', { target: clickedEl })
        expect(wrapper.emitted('close')).toBeDefined()
      })
    })
  })
  describe('on desktop', () => {
    it('should disable the teleport and render the right sidebar', () => {
      const { wrapper } = createWrapper({ isMobile: false })
      expect(wrapper.find('teleport-stub').attributes('disabled')).toBe('true')
      expect(wrapper.find('oc-bottom-drawer-stub').exists()).toBeFalsy()
    })
  })
})

function createWrapper({
  props,
  isMobile = false
}: { props?: PartialComponentProps<typeof SideBar>; isMobile?: boolean } = {}) {
  const plugins = defaultPlugins()
  const mocks = defaultComponentMocks()

  vi.mocked(useIsMobile).mockReturnValue({ isMobile: computed(() => isMobile) })

  return {
    mocks,
    wrapper: shallowMount(SideBar, {
      props: {
        isOpen: true,
        loading: false,
        availablePanels: [],
        panelContext: mock<SideBarPanelContext<any, any, any>>(),
        ...props
      },
      global: {
        plugins,
        mocks,
        provide: mocks,
        renderStubDefaultSlot: true
      }
    })
  }
}
