import { defaultPlugins, mount, PartialComponentProps } from '@opencloud-eu/web-test-helpers'
import OcBottomDrawer from './OcBottomDrawer.vue'
import { nextTick } from 'vue'
import { FocusTrap } from 'focus-trap-vue'

describe('OcBottomDrawer', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('active state', () => {
    it('adds the active class when the drawer is active', async () => {
      const addClassMock = vi.fn()
      const htmlElMock = { classList: { add: addClassMock } } as unknown as HTMLElement
      vi.spyOn(document, 'getElementById').mockReturnValue(htmlElMock)

      const { wrapper } = getWrapper()
      await nextTick()

      expect(addClassMock).toHaveBeenCalled()
      expect(wrapper.find('dialog').attributes('open')).toBeDefined()
    })
    it('does not add the active class when the drawer is not active', async () => {
      const addClassMock = vi.fn()
      const htmlElMock = { classList: { add: addClassMock } } as unknown as HTMLElement
      vi.spyOn(document, 'getElementById').mockReturnValue(htmlElMock)

      const { wrapper } = getWrapper({ isDrawerActive: false })
      await nextTick()

      expect(addClassMock).not.toHaveBeenCalled()
      expect(wrapper.find('dialog').attributes('open')).toBeUndefined()
    })
  })
  describe('accessibility', () => {
    it('has a default accessible name', () => {
      const { wrapper } = getWrapper()
      expect(wrapper.find('dialog').attributes('aria-label')).toBe('Bottom drawer')
    })
    it('uses the given accessible name', () => {
      const { wrapper } = getWrapper({ ariaLabel: 'File actions' })
      expect(wrapper.find('dialog').attributes('aria-label')).toBe('File actions')
    })
    it('is marked as modal', () => {
      const { wrapper } = getWrapper()
      expect(wrapper.find('dialog').attributes('aria-modal')).toBe('true')
    })
    it('moves the focus into the drawer when the focus trap activates', () => {
      const { wrapper } = getWrapper({
        isFocusTrapActive: true,
        attachTo: document.body,
        stubs: { FocusTrap: true }
      })
      const getInitialFocus = wrapper
        .findComponent(FocusTrap)
        .props('initialFocus') as () => Element
      const drawerEl = wrapper.find('#some-id').element

      expect(getInitialFocus()).toBe(drawerEl)
      wrapper.unmount()
    })
    it('keeps the focus if it is already inside the drawer', () => {
      const { wrapper } = getWrapper({
        isFocusTrapActive: true,
        attachTo: document.body,
        stubs: { FocusTrap: true }
      })
      const getInitialFocus = wrapper
        .findComponent(FocusTrap)
        .props('initialFocus') as () => Element
      const button = wrapper.find('button').element as HTMLButtonElement
      button.focus()

      expect(getInitialFocus()).toBe(button)
      wrapper.unmount()
    })
  })
  describe('full height', () => {
    it('adds the h-full class when hasFullHeight is true', () => {
      const { wrapper } = getWrapper({ hasFullHeight: true })
      expect(wrapper.find('dialog > div').classes()).toContain('h-full')
    })
    it('adds the maxHeight class when hasFullHeight is false', () => {
      const { wrapper } = getWrapper({ hasFullHeight: false, maxHeight: 'max-h-[80vh]' })
      expect(wrapper.find('dialog > div').classes()).toContain('max-h-[80vh]')
    })
  })
  describe('max height', () => {
    it('applies the correct maxHeight class', () => {
      const { wrapper } = getWrapper({ maxHeight: 'max-h-[75vh]' })
      expect(wrapper.find('dialog > div').classes()).toContain('max-h-[75vh]')
    })
  })
})

const getWrapper = ({
  attachTo,
  stubs,
  ...props
}: PartialComponentProps<typeof OcBottomDrawer> & {
  attachTo?: HTMLElement
  stubs?: Record<string, boolean>
} = {}) => {
  return {
    wrapper: mount(OcBottomDrawer, {
      attachTo,
      slots: { default: '<button>Action</button>' },
      props: {
        id: 'some-id',
        isFocusTrapActive: false,
        ...props
      },
      global: { renderStubDefaultSlot: true, stubs, plugins: [...defaultPlugins()] }
    })
  }
}
