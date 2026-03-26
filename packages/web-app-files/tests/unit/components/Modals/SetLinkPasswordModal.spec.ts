import { mock } from 'vitest-mock-extended'
import SetLinkPasswordModal from '../../../../src/components/Modals/SetLinkPasswordModal.vue'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { Modal, useMessages, useSharesStore } from '@opencloud-eu/web-pkg'
import { Resource, LinkShare, SpaceResource } from '@opencloud-eu/web-client'

describe('SetLinkPasswordModal', () => {
  it('should render a text input field for the password', () => {
    const { wrapper } = getWrapper()

    expect(wrapper.find('oc-text-input-stub').exists()).toBeTruthy()
  })
  it('should disable the confirm button on mount', () => {
    const { wrapper } = getWrapper()

    expect(wrapper.emitted('update:confirmDisabled')).toBeTruthy()
    expect(wrapper.emitted('update:confirmDisabled')![0]).toEqual([true])
  })
  it('should disable the confirm button when the password is cleared', async () => {
    const { wrapper } = getWrapper()

    wrapper.vm.onInput('somepassword')
    wrapper.vm.onInput('')

    const emitted = wrapper.emitted('update:confirmDisabled')!
    expect(emitted[emitted.length - 1]).toEqual([true])
  })
  describe('method "onConfirm"', () => {
    it('updates the link', async () => {
      const { wrapper } = getWrapper()
      await wrapper.vm.onConfirm()

      const sharesStore = useSharesStore()
      expect(sharesStore.updateLink).toHaveBeenCalled()
      const { showMessage } = useMessages()
      expect(showMessage).toHaveBeenCalled()
    })
    it('shows an error message on error', async () => {
      const { wrapper } = getWrapper()
      const sharesStore = useSharesStore()
      vi.mocked(sharesStore.updateLink).mockRejectedValue(new Error(''))
      await wrapper.vm.onConfirm()

      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalled()
    })
  })
})

function getWrapper() {
  const mocks = { ...defaultComponentMocks() }

  return {
    mocks,
    wrapper: shallowMount(SetLinkPasswordModal, {
      props: {
        modal: mock<Modal>(),
        link: mock<LinkShare>(),
        space: mock<SpaceResource>(),
        resource: mock<Resource>()
      },
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        provide: mocks
      }
    })
  }
}
