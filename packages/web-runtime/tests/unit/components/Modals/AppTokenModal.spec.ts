import AppTokenModal from '../../../../src/components/Modals/AppTokenModal.vue'
import {
  defaultComponentMocks,
  defaultPlugins,
  mockAxiosResolve,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import { mockDeep } from 'vitest-mock-extended'
import { ClientService } from '@opencloud-eu/web-pkg'
import { OcButton, OcDatepicker, OcTextInput } from '@opencloud-eu/design-system/components'
import { DateTime } from 'luxon'
import { VueWrapper } from '@vue/test-utils'

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
    it('should be disabled when only a note has been entered', async () => {
      const { wrapper } = getWrapper()
      emitNoteInput(wrapper, 'someNote')
      const btn = wrapper.findComponent<typeof OcButton>('.oc-modal-body-actions-confirm')
      expect(btn.props('disabled')).toBeTruthy()
    })
    it('should be disabled when only a date has been entered', async () => {
      const { wrapper } = getWrapper()
      emitDateInput(wrapper, DateTime.now())
      const btn = wrapper.findComponent<typeof OcButton>('.oc-modal-body-actions-confirm')
      expect(btn.props('disabled')).toBeTruthy()
    })
    it('should not be disabled when a note and date has been entered', async () => {
      const { wrapper } = getWrapper()
      emitNoteInput(wrapper, 'someNote')
      emitDateInput(wrapper, DateTime.now())
      const btn = wrapper.findComponent<typeof OcButton>('.oc-modal-body-actions-confirm')
      await wrapper.vm.$nextTick()
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

const getWrapper = () => {
  const clientService = mockDeep<ClientService>()
  clientService.httpAuthenticated.post.mockResolvedValue(mockAxiosResolve({ token: 'token' }))
  const mocks = { ...defaultComponentMocks(), $clientService: clientService }

  return {
    mocks,
    wrapper: shallowMount(AppTokenModal, {
      global: {
        mocks,
        provide: mocks,
        plugins: [...defaultPlugins()]
      }
    })
  }
}
