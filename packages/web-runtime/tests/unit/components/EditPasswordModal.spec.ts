import { Modal } from '@opencloud-eu/web-pkg'
import EditPasswordModal from '../../../src/components/EditPasswordModal.vue'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'

describe('EditPasswordModal', () => {
  describe('computed method "confirmButtonDisabled"', () => {
    it('should be true if any data set is invalid', () => {
      const { wrapper } = getWrapper()
      ;(wrapper.vm as any).currentPassword = ''
      expect((wrapper.vm as any).confirmButtonDisabled).toBeTruthy()
    })
    it('should be false if no data set is invalid', () => {
      const { wrapper } = getWrapper()
      ;(wrapper.vm as any).currentPassword = 'password'
      ;(wrapper.vm as any).newPassword = 'newpassword'
      ;(wrapper.vm as any).newPasswordConfirm = 'newpassword'
      expect((wrapper.vm as any).confirmButtonDisabled).toBeFalsy()
    })
  })

  describe('method "validatePasswordConfirm"', () => {
    it('should be true if passwords are identical', () => {
      const { wrapper } = getWrapper()
      ;(wrapper.vm as any).newPassword = 'newpassword'
      ;(wrapper.vm as any).newPasswordConfirm = 'newpassword'
      expect((wrapper.vm as any).validatePasswordConfirm()).toBeTruthy()
    })
    it('should be false if passwords are not identical', () => {
      const { wrapper } = getWrapper()
      ;(wrapper.vm as any).newPassword = 'newpassword'
      ;(wrapper.vm as any).newPasswordConfirm = 'anothernewpassword'
      expect((wrapper.vm as any).validatePasswordConfirm()).toBeFalsy()
    })
  })
})

function getWrapper() {
  return {
    wrapper: shallowMount(EditPasswordModal, {
      props: {
        modal: mock<Modal>()
      },
      global: {
        plugins: [...defaultPlugins()]
      }
    })
  }
}
