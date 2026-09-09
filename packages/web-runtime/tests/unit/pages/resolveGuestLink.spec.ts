import { ref } from 'vue'
import { AxiosError, AxiosResponse } from 'axios'
import { mockDeep } from 'vitest-mock-extended'
import { flushPromises } from '@vue/test-utils'
import { useRouteParam } from '@opencloud-eu/web-pkg'
import { ShareSpaceResource } from '@opencloud-eu/web-client'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import ResolveGuestLink from '../../../src/pages/resolveGuestLink.vue'
import { authService } from '../../../src/services/auth'

vi.mock('../../../src/services/auth')

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useRouteParam: vi.fn()
}))

const selectors = {
  spinner: 'oc-spinner-stub',
  errorMessage: '[data-testid="error-message"]',
  retryButton: '[data-testid="retry-button"]'
}

describe('resolveGuestLink', () => {
  it('shows a spinner while resolving', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find(selectors.spinner).exists()).toBeTruthy()
    expect(wrapper.find(selectors.errorMessage).exists()).toBeFalsy()
  })

  it('redeems the token from the url path', async () => {
    getWrapper()
    await flushPromises()
    expect(authService.redeemGuestLink).toHaveBeenCalledWith('magic-token')
  })

  it('replaces the route with the guest link page carrying the permission id', async () => {
    const { mocks } = getWrapper()
    await flushPromises()

    expect(mocks.$router.replace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'files-guest-link',
        params: { shareName: 'Invited folder' },
        query: { permissionId: 'permission-id' }
      })
    )
    expect(mocks.$router.push).not.toHaveBeenCalled()
  })

  it.each([
    ['tokenExpired', 'This invitation link has expired.'],
    ['tokenAlreadyRedeemed', 'This invitation link has already been used.'],
    ['shareExpired', 'Your access to the shared item has expired.'],
    ['shareNotFound', 'The shared item is no longer available.'],
    ['tokenInvalid', 'This invitation link is invalid.'],
    ['tokenNotFound', 'This invitation link is invalid.']
  ])('shows a specific error for %s', async (errorType, message) => {
    const { wrapper, mocks } = getWrapper({ redeemError: guestLinkError(errorType) })
    await flushPromises()

    expect(wrapper.find(selectors.errorMessage).text()).toEqual(message)
    expect(wrapper.text()).toContain('Ask the person who invited you for a new invitation.')
    expect(wrapper.find(selectors.retryButton).exists()).toBeFalsy()
    expect(mocks.$router.replace).not.toHaveBeenCalled()
  })

  it.each([
    ['an internal server error', guestLinkError('internalError')],
    ['an unexpected error', new Error('network')]
  ])('asks to try again later on %s', async (_, redeemError) => {
    const { wrapper } = getWrapper({ redeemError })
    await flushPromises()

    expect(wrapper.find(selectors.errorMessage).text()).toEqual(
      'The invitation could not be opened. Please try again later.'
    )
    expect(wrapper.text()).not.toContain('Ask the person who invited you')
    expect(wrapper.find(selectors.retryButton).exists()).toBeTruthy()
  })

  it('redeems the token again on retry', async () => {
    const { wrapper, mocks } = getWrapper({ redeemError: guestLinkError('internalError') })
    await flushPromises()

    vi.mocked(authService.redeemGuestLink).mockResolvedValue({
      permissionId: 'permission-id',
      space: mockDeep<ShareSpaceResource>({ name: 'Invited folder' })
    })
    await wrapper.find(selectors.retryButton).trigger('click')
    await flushPromises()

    expect(authService.redeemGuestLink).toHaveBeenCalledTimes(2)
    expect(mocks.$router.replace).toHaveBeenCalled()
  })

  it('does not log the token of a failed redemption', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const redeemError = guestLinkError('internalError')
    redeemError.config = { data: JSON.stringify({ token: 'magic-token' }) } as any
    getWrapper({ redeemError })
    await flushPromises()

    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('magic-token')
    consoleError.mockRestore()
  })

  it('does not render the token after a failed redemption', async () => {
    const { wrapper } = getWrapper({ redeemError: new Error('401') })
    await flushPromises()

    expect(wrapper.html()).not.toContain('magic-token')
  })
})

function guestLinkError(errorType: string) {
  return new AxiosError(errorType, undefined, undefined, undefined, {
    data: { errorType, message: errorType, permissionId: 'permission-id' }
  } as AxiosResponse)
}

function getWrapper({ redeemError = null }: { redeemError?: Error } = {}) {
  const space = mockDeep<ShareSpaceResource>({
    id: 'share-id',
    driveType: 'share',
    name: 'Invited folder',
    driveAlias: 'share/Invited folder'
  })

  if (redeemError) {
    vi.mocked(authService.redeemGuestLink).mockRejectedValue(redeemError)
  } else {
    vi.mocked(authService.redeemGuestLink).mockResolvedValue({
      permissionId: 'permission-id',
      space
    })
  }

  vi.mocked(useRouteParam).mockReturnValue(ref('magic-token'))

  const mocks = defaultComponentMocks()

  return {
    mocks,
    wrapper: shallowMount(ResolveGuestLink, {
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        provide: mocks,
        stubs: { OcCard: false, PlainCard: false }
      }
    })
  }
}
