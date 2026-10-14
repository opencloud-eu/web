import { ref } from 'vue'
import { AxiosError, AxiosResponse } from 'axios'
import { mockDeep } from 'vitest-mock-extended'
import { flushPromises } from '@vue/test-utils'
import { useRouteParam } from '@opencloud-eu/web-pkg'
import { ShareSpaceResource } from '@opencloud-eu/web-client'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import RenewGuestLink from '../../../src/pages/renewGuestLink.vue'
import { authService } from '../../../src/services/auth'
import { GuestLinkTokenMissingError } from '../../../src/services/auth/guestSessionManager'

vi.mock('../../../src/services/auth')

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useRouteParam: vi.fn()
}))

const selectors = {
  spinner: '.oc-spinner',
  errorMessage: '[data-testid="error-message"]',
  retryButton: '[data-testid="retry-button"]',
  pinInput: 'input[data-testid="pin-input"]',
  pinSubmit: '[data-testid="pin-submit"]'
}

describe('renewGuestLink', () => {
  it('shows a spinner while renewing', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find(selectors.spinner).exists()).toBeTruthy()
  })

  it('renews the link of the permission id from the route', async () => {
    getWrapper()
    await flushPromises()

    expect(authService.renewGuestLink).toHaveBeenCalledWith('permission-id')
  })

  it('asks to check the inbox and shows the pin form after renewing', async () => {
    const { wrapper } = getWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('Check your inbox')
    expect(wrapper.find(selectors.pinInput).exists()).toBeTruthy()
  })

  it('shows the pin form without renewing again while a renewal is pending', async () => {
    const { wrapper } = getWrapper({ isRenewalPending: true })
    await flushPromises()

    expect(authService.isGuestLinkRenewalPending).toHaveBeenCalledWith('permission-id')
    expect(authService.renewGuestLink).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Check your inbox')
    expect(wrapper.find(selectors.pinInput).exists()).toBeTruthy()
  })

  it.each([
    ['shareExpired', 'Your access to the shared item has expired.'],
    ['shareNotFound', 'The shared item is no longer available.']
  ])('asks to contact the inviter for %s', async (errorType, message) => {
    const { wrapper } = getWrapper({ renewError: guestLinkError(errorType) })
    await flushPromises()

    expect(wrapper.find(selectors.errorMessage).text()).toEqual(message)
    expect(wrapper.text()).toContain('Ask the person who invited you for a new invitation.')
    expect(wrapper.find(selectors.retryButton).exists()).toBeFalsy()
    expect(wrapper.find(selectors.pinInput).exists()).toBeFalsy()
  })

  it.each([
    [
      'sessionInvalid',
      'A new invitation could not be requested. Open the invitation link from your most recent email instead.'
    ],
    [
      'tokenInvalid',
      'A new invitation could not be requested. Open the invitation link from your most recent email instead.'
    ]
  ])('points to the most recent email for %s', async (errorType, message) => {
    const { wrapper } = getWrapper({ renewError: guestLinkError(errorType) })
    await flushPromises()

    expect(wrapper.find(selectors.errorMessage).text()).toEqual(message)
    expect(wrapper.text()).not.toContain('Ask the person who invited you')
    expect(wrapper.find(selectors.retryButton).exists()).toBeFalsy()
    expect(wrapper.find(selectors.pinInput).exists()).toBeFalsy()
  })

  it('points to the most recent email without an error when there is no link token', async () => {
    const { wrapper } = getWrapper({ renewError: new GuestLinkTokenMissingError() })
    await flushPromises()

    expect(wrapper.text()).toContain('Your access has expired')
    expect(wrapper.text()).toContain(
      'Open the invitation link from your most recent email to continue.'
    )
    expect(wrapper.find(selectors.errorMessage).exists()).toBeFalsy()
    expect(wrapper.find(selectors.spinner).exists()).toBeFalsy()
    expect(wrapper.find(selectors.pinInput).exists()).toBeFalsy()
  })

  it('shows the pin form when another tab renewed the link meanwhile', async () => {
    const { wrapper } = getWrapper({ renewError: guestLinkError('tokenInvalid') })
    // the mount already checked for a pending renewal
    vi.mocked(authService.isGuestLinkRenewalPending).mockReturnValue(true)
    await flushPromises()

    expect(wrapper.find(selectors.errorMessage).exists()).toBeFalsy()
    expect(wrapper.find(selectors.pinInput).exists()).toBeTruthy()
  })

  it.each([
    ['an internal server error', guestLinkError('internalError')],
    ['an unavailable service', guestLinkError('serviceUnavailable')],
    ['an unexpected error', new Error('network')]
  ])('offers a retry on %s', async (_, renewError) => {
    const { wrapper } = getWrapper({ renewError })
    await flushPromises()

    expect(wrapper.find(selectors.errorMessage).text()).toEqual(
      'A new invitation could not be requested. Please try again later.'
    )

    vi.mocked(authService.renewGuestLink).mockResolvedValue(undefined)
    await wrapper.find(selectors.retryButton).trigger('click')
    await flushPromises()

    expect(authService.renewGuestLink).toHaveBeenCalledTimes(2)
    expect(wrapper.find(selectors.pinInput).exists()).toBeTruthy()
  })

  it('verifies the pin and redirects to the guest link page', async () => {
    const { wrapper, mocks } = getWrapper()
    await flushPromises()

    await wrapper.find(selectors.pinInput).setValue('123456')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(authService.verifyGuestLinkPin).toHaveBeenCalledWith('permission-id', '123456')
    expect(mocks.$router.replace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'files-guest-link',
        params: { shareName: 'Invited folder' },
        query: { permissionId: 'permission-id' }
      })
    )
  })

  it('strips whitespace from a pasted pin', async () => {
    const { wrapper } = getWrapper()
    await flushPromises()

    await wrapper.find(selectors.pinInput).setValue(' 123 456\n')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(authService.verifyGuestLinkPin).toHaveBeenCalledWith('permission-id', '123456')
  })

  it.each([
    ['pinInvalid', 'The PIN is incorrect.'],
    [
      'pinExpired',
      'The PIN has expired. Open the invitation link from your most recent email to get a new one.'
    ],
    ['shareExpired', 'Your access to the shared item has expired.'],
    ['internalError', 'The PIN could not be verified. Please try again later.']
  ])('shows an error for %s', async (errorType, message) => {
    const { wrapper, mocks } = getWrapper({ pinError: guestLinkError(errorType) })
    await flushPromises()

    await wrapper.find(selectors.pinInput).setValue('000000')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.findComponent({ name: 'OcTextInput' }).props('errorMessage')).toEqual(message)
    expect(mocks.$router.replace).not.toHaveBeenCalled()
  })
})

function guestLinkError(errorType: string) {
  return new AxiosError(errorType, undefined, undefined, undefined, {
    data: { errorType, message: errorType, permissionId: 'permission-id' }
  } as AxiosResponse)
}

function getWrapper({
  renewError = null,
  pinError = null,
  isRenewalPending = false
}: { renewError?: Error; pinError?: Error; isRenewalPending?: boolean } = {}) {
  vi.mocked(authService.isGuestLinkRenewalPending).mockReturnValue(isRenewalPending)

  if (renewError) {
    vi.mocked(authService.renewGuestLink).mockRejectedValue(renewError)
  } else {
    vi.mocked(authService.renewGuestLink).mockResolvedValue(undefined)
  }

  if (pinError) {
    vi.mocked(authService.verifyGuestLinkPin).mockRejectedValue(pinError)
  } else {
    vi.mocked(authService.verifyGuestLinkPin).mockResolvedValue({
      permissionId: 'permission-id',
      space: mockDeep<ShareSpaceResource>({ name: 'Invited folder' })
    })
  }

  vi.mocked(useRouteParam).mockReturnValue(ref('permission-id'))

  const mocks = defaultComponentMocks()

  return {
    mocks,
    wrapper: mount(RenewGuestLink, {
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        provide: mocks
      }
    })
  }
}
