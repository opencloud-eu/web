import { Modal, useModals } from '@opencloud-eu/web-pkg'
import { PropType, defineComponent } from 'vue'
import ModalWrapper from '../../../src/components/ModalWrapper.vue'
import { defaultPlugins, shallowMount, defaultComponentMocks } from '@opencloud-eu/web-test-helpers'

const CustomModalComponent = defineComponent({
  name: 'CustomModalComponent',
  props: {
    modal: { type: Object as PropType<Modal>, required: true }
  },
  setup() {
    return { onConfirm: vi.fn() }
  },
  template: '<div id="foo"></div>'
})

describe('ModalWrapper', () => {
  it('renders OcModal when a modal is active', () => {
    const { wrapper } = getShallowWrapper({ modals: [modal()] })

    expect(wrapper.find('.oc-modal').exists()).toBeTruthy()
  })
  it('renders a custom component if given', () => {
    const { wrapper } = getShallowWrapper({
      modals: [modal({ customComponent: CustomModalComponent })]
    })

    expect(wrapper.find('custom-modal-component-stub').exists()).toBeTruthy()
  })
  it('keeps every modal of the stack mounted and only marks the topmost one active', () => {
    const { wrapper } = getShallowWrapper({
      modals: [
        modal({ id: 'below', customComponent: CustomModalComponent }),
        modal({ id: 'top', customComponent: CustomModalComponent })
      ]
    })

    const openModals = wrapper.findAllComponents({ name: 'OcModal' })
    expect(openModals.length).toBe(2)
    expect(openModals[0].props('active')).toBe(false)
    expect(openModals[1].props('active')).toBe(true)
    expect(wrapper.findAll('custom-modal-component-stub').length).toBe(2)
  })
  describe('method "onModalConfirm"', () => {
    it('calls the modal "onConfirm" if given, disables the confirm button and removes the modal', async () => {
      const activeModal = modal({ onConfirm: vi.fn().mockResolvedValue(undefined) })
      const { wrapper } = getShallowWrapper({ modals: [activeModal] })
      const modalStore = useModals()

      const value = 'value'
      await (wrapper.vm as any).onModalConfirm(activeModal, value)

      expect(activeModal.onConfirm).toHaveBeenCalledWith(value)
      expect(modalStore.updateModal).toHaveBeenCalled()
      expect(modalStore.removeModal).toHaveBeenCalledWith(activeModal.id)
    })
    it('does not remove the modal if the promise has not been resolved', async () => {
      const activeModal = modal({ onConfirm: vi.fn().mockRejectedValue(new Error('')) })
      const { wrapper } = getShallowWrapper({ modals: [activeModal] })
      const modalStore = useModals()

      await (wrapper.vm as any).onModalConfirm(activeModal)

      expect(modalStore.removeModal).not.toHaveBeenCalled()
    })
    it('calls the custom component "onConfirm" of that very modal', async () => {
      const below = modal({ id: 'below', onConfirm: null })
      const top = modal({ id: 'top', onConfirm: null })
      const { wrapper } = getShallowWrapper({ modals: [below, top] })
      const onConfirm = vi.fn()
      ;(wrapper.vm as any).customComponentRefs.set(top.id, { onConfirm })
      ;(wrapper.vm as any).customComponentRefs.set(below.id, { onConfirm: vi.fn() })

      await (wrapper.vm as any).onModalConfirm(top)

      expect(onConfirm).toHaveBeenCalled()
      expect((wrapper.vm as any).customComponentRefs.get(below.id).onConfirm).not.toHaveBeenCalled()
    })
  })
  describe('method "onModalCancel"', () => {
    it('calls the modal "onCancel" if given and removes the modal', () => {
      const activeModal = modal({ onCancel: vi.fn() })
      const { wrapper } = getShallowWrapper({ modals: [activeModal] })
      const modalStore = useModals()
      ;(wrapper.vm as any).onModalCancel(activeModal)

      expect(activeModal.onCancel).toHaveBeenCalled()
      expect(modalStore.removeModal).toHaveBeenCalledWith(activeModal.id)
    })
    it('calls the custom component "onCancel" if given', () => {
      const activeModal = modal({ onCancel: null })
      const { wrapper } = getShallowWrapper({ modals: [activeModal] })
      const onCancel = vi.fn()
      ;(wrapper.vm as any).customComponentRefs.set(activeModal.id, { onCancel })
      ;(wrapper.vm as any).onModalCancel(activeModal)

      expect(onCancel).toHaveBeenCalled()
    })
  })
  describe('method "onModalInput"', () => {
    it('calls the modal "onInput" if given', () => {
      const activeModal = modal({ onInput: vi.fn() })
      const { wrapper } = getShallowWrapper({ modals: [activeModal] })

      const value = 'value'
      ;(wrapper.vm as any).onModalInput(activeModal, value)

      expect(activeModal.onInput).toHaveBeenCalledWith(value, expect.anything())
    })
  })
  describe('method "onModalConfirmDisabled"', () => {
    it('updates the modal confirm button state', () => {
      const activeModal = modal()
      const { wrapper } = getShallowWrapper({ modals: [activeModal] })
      const modalStore = useModals()
      ;(wrapper.vm as any).onModalConfirmDisabled(activeModal, true)

      expect(modalStore.updateModal).toHaveBeenCalledWith(activeModal.id, 'confirmDisabled', true)
    })
  })
})

function modal(props: Partial<Modal> = {}) {
  return { id: 'some-id', title: 'some-title', ...props } as Modal
}

function getShallowWrapper({ modals = [] }: { modals?: Modal[] } = {}) {
  const mocks = defaultComponentMocks()

  return {
    wrapper: shallowMount(ModalWrapper, {
      global: {
        plugins: [...defaultPlugins({ piniaOptions: { modalsState: { modals } } })],
        renderStubDefaultSlot: true,
        mocks,
        provide: mocks,
        stubs: { OcModal: false }
      }
    })
  }
}
