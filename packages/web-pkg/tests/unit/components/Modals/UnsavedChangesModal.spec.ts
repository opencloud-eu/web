import UnsavedChangesModal from '../../../../src/components/Modals/UnsavedChangesModal.vue'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { Modal, useModals } from '../../../../src/composables/piniaStores'

describe('UnsavedChangesModal', () => {
  // Cancel and Save are the modal's own cancel action and confirm button
  it('only renders the "Don\'t Save" button', () => {
    const { wrapper } = getWrapper()

    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBe(1)
    expect(buttons[0].text()).toBe("Don't Save")
  })

  it('closes without saving on "Don\'t Save"', async () => {
    const { wrapper, modal, closeCallback } = getWrapper()

    await wrapper.find('.oc-modal-body-actions-secondary').trigger('click')

    const { removeModal } = useModals()
    expect(removeModal).toHaveBeenCalledWith(modal.id)
    expect(closeCallback).toHaveBeenCalled()
  })

  it('disables "Don\'t Save" while the modal is loading', () => {
    const { wrapper } = getWrapper({ isLoading: true })

    expect(wrapper.find('.oc-modal-body-actions-secondary').attributes('disabled')).toBeDefined()
  })

  // ModalWrapper binds confirm and cancel on every custom component, and this one
  // renders a fragment, so undeclared emits end up as extraneous listeners
  it('declares the confirm and cancel events bound by the modal wrapper', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    getWrapper({}, { onConfirm: vi.fn(), onCancel: vi.fn() })

    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})

function getWrapper(modalProps: Partial<Modal> = {}, attrs: Record<string, unknown> = {}) {
  const modal = mock<Modal>({ id: 'modal-id', isLoading: false, ...modalProps })
  const closeCallback = vi.fn()

  return {
    modal,
    closeCallback,
    wrapper: mount(UnsavedChangesModal, {
      props: { modal, closeCallback },
      attrs,
      global: {
        plugins: [...defaultPlugins()],
        stubs: { teleport: true }
      }
    })
  }
}
