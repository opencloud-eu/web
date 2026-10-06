import { mockDeep } from 'vitest-mock-extended'
import {
  defaultComponentMocks,
  defaultPlugins,
  mockAxiosResolve,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import { ClientService } from '@opencloud-eu/web-pkg'
import { flushPromises } from '@vue/test-utils'
import { OcButton } from '@opencloud-eu/design-system/components'
import { defineComponent } from 'vue'
import OutgoingInvitations from '../../../src/views/OutgoingInvitations.vue'

const selectors = {
  modal: '.oc-modal-stub',
  form: 'form'
}

// Renders the modal content slot so the form and its submit handler are reachable,
// while the confirm event can still be emitted to cover the other entry point.
const OcModalStub = defineComponent({
  name: 'OcModal',
  emits: ['confirm', 'cancel'],
  template: '<div class="oc-modal-stub"><slot name="content" /></div>'
})

describe('OutgoingInvitations view', () => {
  describe('generating an invite token', () => {
    it('generates a token on confirm', async () => {
      const { wrapper, mocks } = getWrapper()
      await openModal(wrapper)
      await confirm(wrapper)
      expect(mocks.$clientService.httpAuthenticated.post).toHaveBeenCalledTimes(1)
    })
    it('does not generate a second token when confirm is triggered twice in a row', async () => {
      const { wrapper, mocks } = getWrapper({ pendingPost: true })
      await openModal(wrapper)
      await confirm(wrapper)
      await confirm(wrapper)
      expect(mocks.$clientService.httpAuthenticated.post).toHaveBeenCalledTimes(1)
    })
    it('does not generate a second token when a click and a submit overlap', async () => {
      const { wrapper, mocks } = getWrapper({ pendingPost: true })
      await openModal(wrapper)
      await confirm(wrapper)
      await wrapper.find(selectors.form).trigger('submit')
      expect(mocks.$clientService.httpAuthenticated.post).toHaveBeenCalledTimes(1)
    })
    it('disables the confirm button while a token is being generated', async () => {
      const { wrapper } = getWrapper({ pendingPost: true })
      await openModal(wrapper)
      await confirm(wrapper)
      expect(wrapper.find(selectors.modal).attributes('button-confirm-disabled')).toBe('true')
      expect(wrapper.find(selectors.modal).attributes('is-loading')).toBe('true')
    })
    it('closes the modal after the token has been generated', async () => {
      const { wrapper } = getWrapper()
      await openModal(wrapper)
      await confirm(wrapper)
      await flushPromises()
      expect(wrapper.find(selectors.modal).exists()).toBeFalsy()
    })
  })
})

const openModal = async (wrapper: ReturnType<typeof getWrapper>['wrapper']) => {
  await flushPromises()
  await wrapper.findComponent<typeof OcButton>({ name: 'OcButton' }).trigger('click')
}

const confirm = async (wrapper: ReturnType<typeof getWrapper>['wrapper']) => {
  await wrapper.findComponent(OcModalStub).vm.$emit('confirm')
}

const getWrapper = ({ pendingPost = false }: { pendingPost?: boolean } = {}) => {
  const clientService = mockDeep<ClientService>()
  clientService.httpAuthenticated.get.mockResolvedValue(mockAxiosResolve([]))
  if (pendingPost) {
    // a promise that never settles on its own, so the request stays in flight for the whole test
    clientService.httpAuthenticated.post.mockReturnValue(new Promise(() => undefined))
  } else {
    clientService.httpAuthenticated.post.mockResolvedValue(
      mockAxiosResolve({ token: 'someToken', invite_link: 'https://example.org/invite' })
    )
  }
  const mocks = { ...defaultComponentMocks(), $clientService: clientService }

  return {
    mocks,
    wrapper: shallowMount(OutgoingInvitations, {
      global: {
        mocks,
        provide: mocks,
        plugins: [
          ...defaultPlugins({ piniaOptions: { configState: { server: 'https://example.org' } } })
        ],
        stubs: { 'oc-modal': OcModalStub }
      }
    })
  }
}
