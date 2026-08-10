import { Modal, useModals } from '@opencloud-eu/web-pkg'
import { mock } from 'vitest-mock-extended'
import { PropType, defineComponent } from 'vue'
import ModalWrapper from '../../../src/components/ModalWrapper.vue'
import {
  defaultPlugins,
  shallowMount,
  defaultComponentMocks,
  writable
} from '@opencloud-eu/web-test-helpers'

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
  it('renders OcModal when a modal is active', async () => {
    const modal = mock<Modal>()
    const { wrapper } = getShallowWrapper({ modals: [modal] })
    const modalStore = useModals()
    writable(modalStore).activeModal = modal
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.oc-modal').exists()).toBeTruthy()
  })
  it('renders a custom component if given', async () => {
    const modal = {
      id: 'some-id',
      title: 'some-title',
      customComponent: CustomModalComponent
    } as Modal
    const { wrapper } = getShallowWrapper({ modals: [modal] })
    const modalStore = useModals()
    writable(modalStore).activeModal = modal
    await wrapper.vm.$nextTick()

    expect(wrapper.find('custom-modal-component-stub').exists()).toBeTruthy()
  })
  describe('method "onModalConfirm"', () => {
    it('calls the modal "onConfirm" if given, disables the confirm button and removes the modal', async () => {
      const modal = mock<Modal>({ onConfirm: vi.fn().mockResolvedValue(undefined) })
      const { wrapper } = getShallowWrapper({ modals: [modal] })
      const modalStore = useModals()
      writable(modalStore).activeModal = modal

      const value = 'value'
      await (wrapper.vm as any).onModalConfirm(value)

      expect(modal.onConfirm).toHaveBeenCalledWith(value)
      expect(modalStore.updateModal).toHaveBeenCalled()
      expect(modalStore.removeModal).toHaveBeenCalled()
    })
    it('does not remove the modal if the promise has not been resolved', async () => {
      const modal = mock<Modal>({ onConfirm: vi.fn().mockRejectedValue(new Error('')) })
      const { wrapper } = getShallowWrapper({ modals: [modal] })
      const modalStore = useModals()
      writable(modalStore).activeModal = modal

      await (wrapper.vm as any).onModalConfirm()

      expect(modalStore.removeModal).not.toHaveBeenCalled()
    })
    it('calls the custom component "onConfirm" if given', async () => {
      const modal = mock<Modal>({ onConfirm: null })
      const { wrapper } = getShallowWrapper({ modals: [modal] })
      const modalStore = useModals()
      writable(modalStore).activeModal = modal
      await wrapper.vm.$nextTick()
      ;(wrapper.vm as any).customComponentRef = { onConfirm: vi.fn() }

      await (wrapper.vm as any).onModalConfirm()

      expect((wrapper.vm as any).customComponentRef.onConfirm).toHaveBeenCalled()
    })
  })
  describe('method "onModalCancel"', () => {
    it('calls the modal "onCancel" if given and removes the modal', () => {
      const modal = mock<Modal>({ onCancel: vi.fn() })
      const { wrapper } = getShallowWrapper({ modals: [modal] })
      const modalStore = useModals()
      writable(modalStore).activeModal = modal
      ;(wrapper.vm as any).onModalCancel()

      expect(modal.onCancel).toHaveBeenCalled()
      expect(modalStore.removeModal).toHaveBeenCalled()
    })
    it('calls the custom component "onCancel" if given', async () => {
      const modal = mock<Modal>({ onCancel: null })
      const { wrapper } = getShallowWrapper({ modals: [modal] })
      const modalStore = useModals()
      writable(modalStore).activeModal = modal
      await wrapper.vm.$nextTick()
      ;(wrapper.vm as any).customComponentRef = { onCancel: vi.fn() }
      ;(wrapper.vm as any).onModalCancel()

      expect((wrapper.vm as any).customComponentRef.onCancel).toHaveBeenCalled()
    })
  })
  describe('method "onModalInput"', () => {
    it('calls the modal "onInput" if given', () => {
      const modal = mock<Modal>({ onInput: vi.fn() })
      const { wrapper } = getShallowWrapper({ modals: [modal] })
      const modalStore = useModals()
      writable(modalStore).activeModal = modal

      const value = 'value'
      ;(wrapper.vm as any).onModalInput(value)

      expect(modal.onInput).toHaveBeenCalledWith(value, expect.anything())
    })
  })
  describe('method "onModalConfirmDisabled"', () => {
    it('updates the modal confirm button state', () => {
      const modal = mock<Modal>()
      const { wrapper } = getShallowWrapper({ modals: [modal] })
      const modalStore = useModals()
      writable(modalStore).activeModal = modal

      const value = true
      ;(wrapper.vm as any).onModalConfirmDisabled(value)

      expect(modalStore.updateModal).toHaveBeenCalled()
    })
  })
})

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
