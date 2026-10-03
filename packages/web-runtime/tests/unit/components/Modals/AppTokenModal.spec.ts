import AppTokenModal from '../../../../src/components/Modals/AppTokenModal.vue'
import {
  defaultComponentMocks,
  defaultPlugins,
  mockAxiosResolve,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import { mock, mockDeep } from 'vitest-mock-extended'
import { ClientService, Modal } from '@opencloud-eu/web-pkg'
import { OcButton, OcDatepicker, OcTextInput } from '@opencloud-eu/design-system/components'
import { DateTime } from 'luxon'
import { VueWrapper, flushPromises } from '@vue/test-utils'

const copyMock = vi.fn()
vi.mock('@vueuse/core', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useClipboard: vi.fn(() => ({ copy: copyMock, copied: false }))
}))

describe('AppTokenModal component', () => {
  it('should display an input for the label', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find('oc-text-input-stub').exists()).toBeTruthy()
  })
  it('should display an input for the expiration date', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find('oc-datepicker-stub').exists()).toBeTruthy()
  })
  describe('confirm button', () => {
    it('should be disabled when no data has been entered', () => {
      const { wrapper } = getWrapper()
      const btn = wrapper.findComponent<typeof OcButton>('.oc-modal-body-actions-confirm')
      expect(btn.props('disabled')).toBeTruthy()
    })
    it('should be disabled when only a note has been entered', () => {
      const { wrapper } = getWrapper()
      emitNoteInput(wrapper, 'someNote')
      const btn = wrapper.findComponent<typeof OcButton>('.oc-modal-body-actions-confirm')
      expect(btn.props('disabled')).toBeTruthy()
    })
    it('should be disabled when only a date has been entered', () => {
      const { wrapper } = getWrapper()
      emitDateInput(wrapper, DateTime.now())
      const btn = wrapper.findComponent<typeof OcButton>('.oc-modal-body-actions-confirm')
      expect(btn.props('disabled')).toBeTruthy()
    })
    it('should not be disabled when a note and date has been entered', async () => {
      const { wrapper } = getWrapper()
      emitNoteInput(wrapper, 'someNote')
      emitDateInput(wrapper, DateTime.now())
      await wrapper.vm.$nextTick()
      const btn = wrapper.findComponent<typeof OcButton>('.oc-modal-body-actions-confirm')
      expect(btn.props('disabled')).toBeFalsy()
    })
    it('should create a token on submit', async () => {
      const { wrapper, mocks } = getWrapper()
      emitNoteInput(wrapper, 'someNote')
      emitDateInput(wrapper, DateTime.now())
      const btn = wrapper.findComponent<typeof OcButton>('.oc-modal-body-actions-confirm')
      await wrapper.vm.$nextTick()
      await btn.trigger('click')
      expect(mocks.$clientService.httpAuthenticated.post).toHaveBeenCalled()
    })
    it('should not create a second token when confirm is clicked twice in a row', async () => {
      const { wrapper, mocks } = getWrapper({ pendingPost: true })
      emitNoteInput(wrapper, 'someNote')
      emitDateInput(wrapper, DateTime.now())
      const btn = wrapper.findComponent<typeof OcButton>('.oc-modal-body-actions-confirm')
      await wrapper.vm.$nextTick()
      await btn.trigger('click')
      await btn.trigger('click')
      expect(mocks.$clientService.httpAuthenticated.post).toHaveBeenCalledTimes(1)
    })
    it('should disable the confirm button while the token is being created', async () => {
      const { wrapper } = getWrapper({ pendingPost: true })
      emitNoteInput(wrapper, 'someNote')
      emitDateInput(wrapper, DateTime.now())
      const btn = wrapper.findComponent<typeof OcButton>('.oc-modal-body-actions-confirm')
      await wrapper.vm.$nextTick()
      expect(btn.props('disabled')).toBeFalsy()
      await btn.trigger('click')
      expect(btn.props('disabled')).toBeTruthy()
      expect(btn.props('showSpinner')).toBeTruthy()
    })
    it('should re-enable the confirm button after creating the token failed', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { wrapper, mocks } = getWrapper({ postRejects: true })
      emitNoteInput(wrapper, 'someNote')
      emitDateInput(wrapper, DateTime.now())
      const btn = wrapper.findComponent<typeof OcButton>('.oc-modal-body-actions-confirm')
      await wrapper.vm.$nextTick()
      await btn.trigger('click')
      await flushPromises()
      expect(btn.props('disabled')).toBeFalsy()
      expect(btn.props('showSpinner')).toBeFalsy()
      expect(mocks.$clientService.httpAuthenticated.post).toHaveBeenCalledTimes(1)
    })
  })
  it('should display the created token', async () => {
    const { wrapper } = getWrapper()
    emitNoteInput(wrapper, 'someNote')
    emitDateInput(wrapper, DateTime.now())
    const btn = wrapper.findComponent<typeof OcButton>('.oc-modal-body-actions-confirm')
    await wrapper.vm.$nextTick()
    await btn.trigger('click')
    expect(wrapper.find('.created-token').exists()).toBeTruthy()
  })
  it('the created token can be copied', async () => {
    const { wrapper } = getWrapper()
    emitNoteInput(wrapper, 'someNote')
    emitDateInput(wrapper, DateTime.now())
    const btn = wrapper.findComponent<typeof OcButton>('.oc-modal-body-actions-confirm')
    await wrapper.vm.$nextTick()
    await btn.trigger('click')
    await wrapper.find('.copy-app-token-btn').trigger('click')
    expect(copyMock).toHaveBeenCalled()
  })
})

const emitNoteInput = (wrapper: VueWrapper<typeof AppTokenModal.vm>, note: string) => {
  wrapper
    .findComponent<typeof OcTextInput>('oc-text-input-stub')
    .vm.$emit('update:modelValue', note)
}
const emitDateInput = (wrapper: VueWrapper<typeof AppTokenModal.vm>, date: DateTime) => {
  wrapper
    .findComponent<typeof OcDatepicker>('oc-datepicker-stub')
    .vm.$emit('dateChanged', { date, error: null })
}

const getWrapper = ({
  pendingPost = false,
  postRejects = false
}: { pendingPost?: boolean; postRejects?: boolean } = {}) => {
  const clientService = mockDeep<ClientService>()
  if (pendingPost) {
    // a promise that never settles on its own, so the request stays in flight for the whole test
    clientService.httpAuthenticated.post.mockReturnValue(new Promise(() => undefined))
  } else if (postRejects) {
    clientService.httpAuthenticated.post.mockRejectedValue(new Error('failed to create token'))
  } else {
    clientService.httpAuthenticated.post.mockResolvedValue(mockAxiosResolve({ token: 'token' }))
  }
  const mocks = { ...defaultComponentMocks(), $clientService: clientService }

  return {
    mocks,
    wrapper: shallowMount(AppTokenModal, {
      props: { modal: mock<Modal>({ id: 'modal-id' }) },
      global: {
        mocks,
        provide: mocks,
        plugins: [...defaultPlugins()],
        // the actions row only exists inside OcModal, so render them in place
        stubs: { teleport: true }
      }
    })
  }
}
