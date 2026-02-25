import { defaultPlugins, mount, PartialComponentProps } from '@opencloud-eu/web-test-helpers'
import OcBottomDrawer from './OcBottomDrawer.vue'
import { nextTick } from 'vue'

describe('OcBottomDrawer', () => {
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

const getWrapper = (props: PartialComponentProps<typeof OcBottomDrawer> = {}) => {
  return {
    wrapper: mount(OcBottomDrawer, {
      props: {
        id: 'some-id',
        isFocusTrapActive: false,
        ...props
      },
      global: { renderStubDefaultSlot: true, plugins: [...defaultPlugins()] }
    })
  }
}
