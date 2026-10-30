import DatePickerModal from '../../../../src/components/Modals/DatePickerModal.vue'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { Modal } from '../../../../src/composables/piniaStores'

describe('DatePickerModal', () => {
  it('gives the native date input the id the modal focuses initially', () => {
    const { wrapper } = getWrapper()

    const input = wrapper.find('input#date-picker-modal-input')
    expect(input.exists()).toBeTruthy()
    expect(input.attributes('type')).toBe('date')
  })
})

function getWrapper() {
  return {
    wrapper: mount(DatePickerModal, {
      props: { modal: mock<Modal>({ id: 'modal-id' }) },
      global: {
        plugins: [...defaultPlugins()],
        stubs: { teleport: true }
      }
    })
  }
}
