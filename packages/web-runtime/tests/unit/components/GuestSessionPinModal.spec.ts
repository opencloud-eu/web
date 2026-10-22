import { AxiosError, AxiosResponse } from 'axios'
import { mock } from 'vitest-mock-extended'
import { enableAutoUnmount } from '@vue/test-utils'
import { Modal } from '@opencloud-eu/web-pkg'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import GuestSessionPinModal from '../../../src/components/GuestSessionPinModal.vue'
import { authService } from '../../../src/services/auth'

vi.mock('../../../src/services/auth')

const selectors = {
  pinInput: 'input[data-testid="guest-session-pin-input"]'
}

enableAutoUnmount(afterEach)

describe('GuestSessionPinModal', () => {
  it('disables the confirm button until a PIN is entered', async () => {
    const { wrapper } = getWrapper()
    expect(wrapper.emitted('update:confirmDisabled').at(-1)).toEqual([true])

    await wrapper.find(selectors.pinInput).setValue(' ')
    expect(wrapper.emitted('update:confirmDisabled').at(-1)).toEqual([true])

    await wrapper.find(selectors.pinInput).setValue('123456')
    expect(wrapper.emitted('update:confirmDisabled').at(-1)).toEqual([false])
  })

  it('confirms on enter', async () => {
    const { wrapper } = getWrapper()
    await wrapper.find(selectors.pinInput).trigger('keydown.enter')

    expect(wrapper.emitted('confirm')).toBeTruthy()
  })

  it('refreshes the session with the PIN without whitespace', async () => {
    vi.mocked(authService.refreshGuestSession).mockResolvedValue()
    const { wrapper } = getWrapper()
    await wrapper.find(selectors.pinInput).setValue(' 123 456 ')

    await (wrapper.vm as any).onConfirm()

    expect(authService.refreshGuestSession).toHaveBeenCalledWith('permission-id', '123456')
  })

  it('shows the error and stays open when the PIN is rejected', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const pinError = new AxiosError('401', '401', undefined, undefined, {
      status: 401,
      data: { errorType: 'pinInvalid', message: 'pinInvalid', permissionId: 'permission-id' }
    } as AxiosResponse)
    vi.mocked(authService.refreshGuestSession).mockRejectedValue(pinError)
    const { wrapper } = getWrapper()
    await wrapper.find(selectors.pinInput).setValue('000000')

    await expect((wrapper.vm as any).onConfirm()).rejects.toBe(pinError)

    expect(wrapper.findComponent({ name: 'OcTextInput' }).props('errorMessage')).toEqual(
      'The PIN is incorrect.'
    )
  })
})

function getWrapper() {
  const mocks = defaultComponentMocks()
  return {
    wrapper: mount(GuestSessionPinModal, {
      props: { modal: mock<Modal>(), permissionId: 'permission-id' },
      global: { plugins: [...defaultPlugins()], mocks, provide: mocks }
    })
  }
}
