import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import BottomDrawer from './OcMobileDrop.vue'
import { defineComponent, nextTick } from 'vue'
import OcButton from '../OcButton/OcButton.vue'
import { useBottomDrawer } from '../../composables'

const selectors = {
  toggle: '#button-drawer-toggle',
  drawer: '.oc-mobile-drop > div',
  closeButton: '.oc-bottom-drawer-close-button',
  background: 'dialog',
  actionButton: '#action-button'
}

describe('OcMobileDrop', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders when toggle is clicked', async () => {
    const { wrapper } = getWrapper()
    await wrapper.find(selectors.toggle).trigger('click')
    const drawer = wrapper.find(selectors.drawer)
    expect(drawer.exists()).toBe(true)
    expect(drawer.classes()).toContain('active')
    const backdrop = wrapper.find(selectors.background)
    expect(backdrop.exists()).toBe(true)
    expect(backdrop.classes()).toEqual(expect.arrayContaining(['fixed', 'inset-0']))
    expect(backdrop.attributes('class')).toMatch(/z-\[/)
    wrapper.unmount()
  })

  it('does not render when toggle is not clicked', async () => {
    const { wrapper } = getWrapper()
    await nextTick()
    expect(wrapper.find(selectors.drawer).exists()).toBe(false)
  })

  it('closes when close button is clicked', async () => {
    const { wrapper } = getWrapper()
    await wrapper.find(selectors.toggle).trigger('click')
    expect(wrapper.find(selectors.drawer).exists()).toBe(true)

    wrapper.find(selectors.closeButton).trigger('click')
    const bottomDrawerStore = useBottomDrawer()
    expect(bottomDrawerStore.closeAllDrawers).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('closes when background is clicked', async () => {
    const { wrapper } = getWrapper()

    await wrapper.find(selectors.toggle).trigger('click')
    expect(wrapper.find(selectors.drawer).exists()).toBe(true)

    await wrapper.find(selectors.background).trigger('click')
    const bottomDrawerStore = useBottomDrawer()
    expect(bottomDrawerStore.closeAllDrawers).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('closes when esc key is pressed', async () => {
    const { wrapper } = getWrapper()

    await wrapper.find(selectors.toggle).trigger('click')
    await nextTick()
    expect(wrapper.find(selectors.drawer).exists()).toBe(true)

    const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    document.dispatchEvent(esc)
    const bottomDrawerStore = useBottomDrawer()
    expect(bottomDrawerStore.closeAllDrawers).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('closes when inner button is clicked and "closeOnClick" is true', async () => {
    const { wrapper } = getWrapper({ closeOnClick: true })

    wrapper.find(selectors.toggle).trigger('click')
    await nextTick()
    expect(wrapper.find(selectors.drawer).exists()).toBe(true)

    wrapper.find(selectors.actionButton).trigger('click')
    const bottomDrawerStore = useBottomDrawer()
    expect(bottomDrawerStore.closeDrawer).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('does not close when inner button is clicked and "closeOnClick" is false', async () => {
    const { wrapper } = getWrapper({ closeOnClick: false })

    wrapper.find(selectors.toggle).trigger('click')
    await nextTick()
    expect(wrapper.find(selectors.drawer).exists()).toBe(true)

    wrapper.find(selectors.actionButton).trigger('click')
    const bottomDrawerStore = useBottomDrawer()
    expect(bottomDrawerStore.closeDrawer).not.toHaveBeenCalled()
    expect(bottomDrawerStore.closeAllDrawers).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})

const getWrapper = (props = { closeOnClick: false }) => {
  const plugins = [...defaultPlugins()]

  const drawer = { id: '1' }
  const bottomDrawerStore = useBottomDrawer()
  vi.mocked(bottomDrawerStore.showDrawer).mockReturnValue(drawer)
  bottomDrawerStore.drawers = [drawer]

  const RootComponent = defineComponent({
    components: { BottomDrawer, OcButton },
    props: ['props'],
    template: `
      <div>
        <button id="button-drawer-toggle">Toggle Drawer</button>
        <BottomDrawer
          drawerId="button-drawer"
          toggle="#button-drawer-toggle"
          title="Bottom Drawer"
          :close-on-click="${props.closeOnClick}"
          v-bind="props"
        >
          <oc-button
            appearance="raw"
            class="raw-hover-surface"
            id="action-button"
          >
            action button
          </oc-button>
        </BottomDrawer>
      </div>
    `
  })

  return {
    wrapper: mount(RootComponent, {
      props: {
        drawerId: 'button-drawer',
        toggle: '#button-drawer-toggle',
        title: 'Bottom Drawer',
        ...props
      },
      attachTo: document.body,
      global: { renderStubDefaultSlot: true, plugins }
    })
  }
}
