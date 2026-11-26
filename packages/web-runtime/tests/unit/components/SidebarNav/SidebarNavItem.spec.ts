import SidebarNavItem from '../../../../src/components/SidebarNav/SidebarNavItem.vue'
import sidebarNavItemFixtures from '../../../__fixtures__/sidebarNavItems'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { flushPromises } from '@vue/test-utils'

const exampleNavItem = sidebarNavItemFixtures[0]

const propsData = {
  name: exampleNavItem.name,
  active: false,
  target: exampleNavItem.route.path,
  icon: exampleNavItem.icon,
  index: '5',
  id: '123'
}

describe('OcSidebarNav', () => {
  it('renders navItem without toolTip if expanded', () => {
    const { wrapper } = getWrapper(false)
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('renders navItem with toolTip if collapsed', () => {
    const { wrapper } = getWrapper(true)
    expect(wrapper.html()).toMatchSnapshot()
  })

  describe('icon', () => {
    it('renders a named icon in the given fill type regardless of its own fill type', () => {
      const { wrapper } = getWrapper(false, {
        icon: { name: 'folder', fillType: 'fill', color: 'red' },
        fillType: 'line'
      })
      expect(wrapper.findComponent({ name: 'OcIcon' }).props('icon')).toEqual({
        name: 'folder',
        fillType: 'line',
        color: 'red'
      })
    })
    it('renders an icon name in the given fill type', () => {
      const { wrapper } = getWrapper(false, { icon: 'folder', fillType: 'line' })
      expect(wrapper.findComponent({ name: 'OcIcon' }).props('icon')).toEqual({
        name: 'folder',
        fillType: 'line'
      })
    })
    it('renders an image icon as declared', () => {
      const { wrapper } = getWrapper(false, { icon: { src: 'logo.png' }, fillType: 'line' })
      expect(wrapper.findComponent({ name: 'OcIcon' }).props('icon')).toEqual({ src: 'logo.png' })
    })
  })

  describe('drop', () => {
    const highlightClass = '!bg-role-secondary-container'

    function getDropWrapper(isAllowed: boolean, notAllowedMessage = '') {
      const drop = {
        isAllowed: vi.fn(() => isAllowed),
        handler: vi.fn(),
        notAllowedMessage: vi.fn(() => notAllowedMessage)
      }
      const { wrapper } = getWrapper(false, { drop })
      return { wrapper, drop }
    }

    function createDragEvent(type: string) {
      return new Event(type, { bubbles: true, cancelable: true }) as DragEvent
    }

    it('accepts and highlights allowed drags', async () => {
      const { wrapper } = getDropWrapper(true)
      const event = createDragEvent('dragover')
      wrapper.find('li').element.dispatchEvent(event)
      await wrapper.vm.$nextTick()

      expect(event.defaultPrevented).toBe(true)
      expect(wrapper.find('.oc-sidebar-nav-item-link').classes()).toContain(highlightClass)
    })
    it('neither accepts nor highlights drags that are not allowed', async () => {
      const { wrapper } = getDropWrapper(false)
      const event = createDragEvent('dragover')
      wrapper.find('li').element.dispatchEvent(event)
      await wrapper.vm.$nextTick()

      expect(event.defaultPrevented).toBe(false)
      expect(wrapper.find('.oc-sidebar-nav-item-link').classes()).not.toContain(highlightClass)
    })
    it('calls the drop handler and removes the highlight on an allowed drop', async () => {
      const { wrapper, drop } = getDropWrapper(true)
      const li = wrapper.find('li').element
      li.dispatchEvent(createDragEvent('dragover'))
      const event = createDragEvent('drop')
      li.dispatchEvent(event)
      await wrapper.vm.$nextTick()

      expect(drop.handler).toHaveBeenCalledWith(event)
      expect(wrapper.find('.oc-sidebar-nav-item-link').classes()).not.toContain(highlightClass)
    })
    it('removes the highlight when the drag ends without leaving, e.g. via Escape', async () => {
      const { wrapper } = getDropWrapper(true)
      wrapper.find('li').element.dispatchEvent(createDragEvent('dragover'))
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.oc-sidebar-nav-item-link').classes()).toContain(highlightClass)

      document.dispatchEvent(createDragEvent('dragend'))
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.oc-sidebar-nav-item-link').classes()).not.toContain(highlightClass)
    })
    it('calls the methods of a drop hook object on the hook itself', async () => {
      class DropHook {
        allowed = true
        dropped = false
        isAllowed() {
          return this.allowed
        }
        handler() {
          this.dropped = true
        }
      }
      const drop = new DropHook()
      const { wrapper } = getWrapper(false, { drop })
      const li = wrapper.find('li').element
      li.dispatchEvent(createDragEvent('dragover'))
      li.dispatchEvent(createDragEvent('drop'))
      await wrapper.vm.$nextTick()

      expect(drop.dropped).toBe(true)
    })
    it('does not call the drop handler on a drop that is not allowed', () => {
      const { wrapper, drop } = getDropWrapper(false)
      wrapper.find('li').element.dispatchEvent(createDragEvent('drop'))
      expect(drop.handler).not.toHaveBeenCalled()
    })
    describe('hint for drags that are not allowed', () => {
      const message = "One or more files can't be deleted"

      function getTooltip() {
        return document.querySelector('[role="tooltip"]')
      }

      async function dragOver(wrapper: ReturnType<typeof getDropWrapper>['wrapper']) {
        wrapper.find('li').element.dispatchEvent(createDragEvent('dragover'))
        await flushPromises()
      }

      afterEach(() => {
        vi.useRealTimers()
        document.querySelectorAll('[role="tooltip"]').forEach((el) => el.remove())
      })

      it('shows the hint as tooltip and announces it', async () => {
        vi.useFakeTimers()
        const { wrapper } = getDropWrapper(false, message)
        await dragOver(wrapper)
        vi.runAllTimers()
        await wrapper.vm.$nextTick()

        expect(getTooltip().textContent).toBe(message)
        expect(wrapper.find('.oc-hidden-announcer').text()).toBe(message)
        wrapper.unmount()
      })
      it('switches from highlight to hint when the hook refuses a drag it allowed before', async () => {
        const { wrapper, drop } = getDropWrapper(false, message)
        drop.isAllowed.mockReturnValueOnce(true)
        await dragOver(wrapper)
        expect(wrapper.find('.oc-sidebar-nav-item-link').classes()).toContain(highlightClass)
        expect(getTooltip()).toBeNull()

        await dragOver(wrapper)
        expect(wrapper.find('.oc-sidebar-nav-item-link').classes()).not.toContain(highlightClass)
        expect(getTooltip().textContent).toBe(message)
        wrapper.unmount()
      })
      it('switches from hint to highlight when the hook allows a drag it refused before', async () => {
        const { wrapper, drop } = getDropWrapper(true, message)
        drop.isAllowed.mockReturnValueOnce(false)
        await dragOver(wrapper)
        expect(getTooltip().textContent).toBe(message)

        await dragOver(wrapper)
        expect(getTooltip()).toBeNull()
        expect(wrapper.find('.oc-sidebar-nav-item-link').classes()).toContain(highlightClass)
        wrapper.unmount()
      })
      it('shows no hint for allowed drags', async () => {
        const { wrapper } = getDropWrapper(true, message)
        await dragOver(wrapper)
        expect(getTooltip()).toBeNull()
        wrapper.unmount()
      })
      it('shows no hint without a message, e.g. for external drags', async () => {
        const { wrapper } = getDropWrapper(false)
        await dragOver(wrapper)
        expect(getTooltip()).toBeNull()
        wrapper.unmount()
      })
      it.each([
        {
          name: 'dragleave',
          dispatch: (li: HTMLElement) => li.dispatchEvent(createDragEvent('dragleave'))
        },
        { name: 'drop', dispatch: (li: HTMLElement) => li.dispatchEvent(createDragEvent('drop')) },
        { name: 'dragend', dispatch: () => document.dispatchEvent(createDragEvent('dragend')) },
        {
          name: 'a new dragstart',
          dispatch: () => document.dispatchEvent(createDragEvent('dragstart'))
        }
      ])('hides the hint on $name', async ({ dispatch }) => {
        const { wrapper } = getDropWrapper(false, message)
        await dragOver(wrapper)
        expect(getTooltip()).not.toBeNull()

        dispatch(wrapper.find('li').element)
        await flushPromises()
        expect(getTooltip()).toBeNull()
        wrapper.unmount()
      })
    })
    it('is no drop target without a drop hook', () => {
      const { wrapper } = getWrapper(false)
      const event = createDragEvent('dragover')
      wrapper.find('li').element.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(false)
    })
  })
})

function getWrapper(collapsed: boolean, props: Record<string, unknown> = {}) {
  return {
    wrapper: mount(SidebarNavItem, {
      props: {
        ...propsData,
        collapsed,
        ...props
      },
      global: {
        plugins: [...defaultPlugins()],
        stubs: { 'router-link': true },
        renderStubDefaultSlot: 'icon' in props
      }
    })
  }
}
