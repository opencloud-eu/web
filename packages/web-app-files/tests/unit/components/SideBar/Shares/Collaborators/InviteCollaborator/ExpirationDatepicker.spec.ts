import ExpirationDatepicker from '../../../../../../../src/components/SideBar/Shares/Collaborators/InviteCollaborator/ExpirationDatepicker.vue'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { useModals } from '@opencloud-eu/web-pkg'

describe('InviteCollaborator ExpirationDatepicker', () => {
  it('renders a button to open the datepicker and set an expiration date', () => {
    const { wrapper } = createWrapper()
    expect(wrapper.find('[data-testid="recipient-datepicker-btn"]').exists()).toBe(true)
  })
  it('focuses the date input of the modal initially', async () => {
    const { wrapper } = createWrapper()
    await wrapper.find('[data-testid="recipient-datepicker-btn"]').trigger('click')
    const { dispatchModal } = useModals()
    expect(dispatchModal).toHaveBeenCalledWith(
      expect.objectContaining({ focusTrapInitial: '#date-picker-modal-input' })
    )
  })
})

const createWrapper = () => {
  return {
    wrapper: mount(ExpirationDatepicker, {
      global: {
        plugins: [...defaultPlugins()]
      }
    })
  }
}
