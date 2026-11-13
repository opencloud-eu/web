import DatePickerModal from '../../../../src/components/Modals/DatePickerModal.vue'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { DateTime } from 'luxon'
import { Modal } from '../../../../src/composables/piniaStores'

describe('DatePickerModal', () => {
  it('gives the native date input the id the modal focuses initially', () => {
    const { wrapper } = getWrapper()

    const input = wrapper.find('input#date-picker-modal-input')
    expect(input.exists()).toBeTruthy()
    expect(input.attributes('type')).toBe('date')
  })

  it('disables confirming initially', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.emitted('update:confirmDisabled')).toEqual([[true]])
  })

  it('confirms the picked date on form submit', async () => {
    const { wrapper } = getWrapper()
    const date = DateTime.now().plus({ days: 2 })

    wrapper.findComponent({ name: 'OcDatepicker' }).vm.$emit('dateChanged', { date, error: false })
    await wrapper.vm.$nextTick()
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('update:confirmDisabled').at(-1)).toEqual([false])
    expect(wrapper.emitted('confirm')).toEqual([[date]])
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
